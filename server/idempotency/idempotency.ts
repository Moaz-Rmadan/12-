import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { IdempotencyStore } from './memory-store';
import { ValidationError, ConflictError, UnprocessableEntityError } from '../errors/app-error';

export interface IdempotencyOptions {
  store: IdempotencyStore;
  headerName?: string;
  required?: boolean;
}

/**
 * Deterministic JSON stringifier to guarantee stable SHA-256 hashes
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k])).join(',') + '}';
}

/**
 * Calculate SHA-256 hash of normalized request components
 */
export function calculateRequestHash(method: string, path: string, body: any): string {
  const canonicalBody = canonicalJsonStringify(body);
  const raw = `${method.toUpperCase()}::${path}::${canonicalBody}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Validate format of the client idempotency key
 */
export function isValidIdempotencyKey(key: string): boolean {
  return /^[a-zA-Z0-9_\-]{8,128}$/.test(key.trim());
}

/**
 * Factory for Idempotency Middleware
 */
export function createIdempotencyMiddleware(options: IdempotencyOptions) {
  const store = options.store;
  const headerName = options.headerName || 'idempotency-key';
  const isRequired = options.required ?? false;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply idempotency to mutation methods
    const mutationMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    if (!mutationMethods.includes(req.method.toUpperCase())) {
      return next();
    }

    const rawKey = req.headers[headerName.toLowerCase()]?.toString();

    if (!rawKey) {
      if (isRequired) {
        return next(
          new ValidationError(`Missing required header: ${headerName}`)
        );
      }
      return next();
    }

    const key = rawKey.trim();
    if (!isValidIdempotencyKey(key)) {
      return next(
        new ValidationError(
          `Invalid ${headerName} format. Must be an alphanumeric/hyphen string between 8 and 128 characters.`
        )
      );
    }

    const userId = req.user?.uid || 'anonymous';
    const normalizedPath = req.baseUrl + (req.route?.path || req.path);
    const scope = `${userId}::${req.method.toUpperCase()}::${normalizedPath}`;
    const requestHash = calculateRequestHash(req.method, normalizedPath, req.body);

    let existingRecord;
    try {
      existingRecord = await store.get(key, scope);
    } catch (err) {
      console.error('[Idempotency] Failed to read store:', err);
      // Fail-safe: proceed if store read fails or handle gracefully
      return next();
    }

    // 1. Existing completed record -> Replay cached response
    if (existingRecord) {
      if (existingRecord.status === 'IN_PROGRESS') {
        return next(
          new ConflictError(
            'IDEMPOTENCY_IN_PROGRESS',
            'An operation with this idempotency key is currently in progress. Please wait for completion.'
          )
        );
      }

      if (existingRecord.status === 'COMPLETED') {
        // Payload mismatch check
        if (existingRecord.requestHash !== requestHash) {
          return next(
            new UnprocessableEntityError(
              'IDEMPOTENCY_PAYLOAD_MISMATCH',
              'Idempotency key was previously submitted with a different request payload.'
            )
          );
        }

        // Exact match replay
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(existingRecord.statusCode || 200).json(existingRecord.responseBody);
        return;
      }
    }

    // 2. New record -> Mark IN_PROGRESS atomically
    try {
      const lockResult = await store.createInProgress(key, scope, requestHash);
      if (!lockResult.success) {
        // Race condition: another request claimed this key simultaneously
        return next(
          new ConflictError(
            'IDEMPOTENCY_CONCURRENT_CONFLICT',
            'Concurrent request with the same idempotency key detected.'
          )
        );
      }
    } catch (lockErr) {
      console.error('[Idempotency] Failed to acquire lock:', lockErr);
      return next();
    }

    // 3. Intercept response to complete record upon finish
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Restore original and complete store
      const statusCode = res.statusCode;
      store.complete(key, scope, statusCode, body).catch((e) => {
        console.error('[Idempotency] Error completing record:', e);
      });
      return originalJson(body);
    };

    next();
  };
}
