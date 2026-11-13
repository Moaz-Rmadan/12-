import crypto from 'crypto';
import admin from 'firebase-admin';
import { getFirebaseFirestore } from '../lib/firebase-admin';
import { IdempotencyRecord, IdempotencyStore } from './memory-store';
import { sanitizeLogData } from '../logging/logger';
import { InternalServerError } from '../errors/app-error';

/**
 * =============================================================================
 * AL-NAJJAR DESIGN — FIRESTORE IDEMPOTENCY STORE (PHASE 3.1)
 * =============================================================================
 * Persistent, distributed Idempotency Store implementing the Phase 2 IdempotencyStore interface.
 *
 * Requirements & Boundaries:
 * 1. Collection: 'idempotency_keys'
 * 2. Scoped to Authenticated User: Key compound is `${scope}::${key}`
 * 3. Cryptographic Document ID: Stored as SHA-256 hash of the compound key so raw
 *    tokens or sensitive headers are never exposed in Firestore document paths.
 * 4. Atomic Concurrency: Uses Firestore runTransaction() for createInProgress()
 *    to guarantee race-condition safety between concurrent identical requests.
 * 5. Retention Policy (MGMT-DEC-12): EXPLICITLY UNRESOLVED.
 *    - No TTL duration is set or hardcoded.
 *    - No automated Firestore TTL rule is enabled.
 *    - No automated deletion is executed.
 *    - Expiration policy is deferred pending management review.
 * 6. Storage Minimization: Response bodies are deeply sanitized (stripping credentials).
 */

export const IDEMPOTENCY_COLLECTION = 'idempotency_keys';

export interface FirestoreIdempotencyDoc {
  docId: string;
  key: string;
  scope: string;
  requestHash: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  statusCode?: number;
  responseBody?: any;
  createdAt: admin.firestore.FieldValue | string;
  createdAtIso: string;
  completedAt?: admin.firestore.FieldValue | string;
  completedAtIso?: string;
}

export class FirestoreIdempotencyStore implements IdempotencyStore {
  private readonly db: admin.firestore.Firestore;

  constructor(customFirestore?: admin.firestore.Firestore) {
    this.db = customFirestore || getFirebaseFirestore();
  }

  /**
   * Compute a deterministic SHA-256 hash for document ID
   * Guarantees safe ASCII alphanumeric document names and hides raw tokens.
   */
  public buildDocumentId(key: string, scope: string): string {
    const raw = `${scope.trim()}::${key.trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Retrieve an existing idempotency record
   */
  public async get(key: string, scope: string): Promise<IdempotencyRecord | null> {
    const docId = this.buildDocumentId(key, scope);
    const docRef = this.db.collection(IDEMPOTENCY_COLLECTION).doc(docId);

    try {
      const snap = await docRef.get();
      if (!snap.exists) {
        return null;
      }

      const data = snap.data() as FirestoreIdempotencyDoc;
      if (!data) return null;

      return {
        key: data.key,
        scope: data.scope,
        requestHash: data.requestHash,
        status: data.status,
        statusCode: data.statusCode,
        responseBody: data.responseBody,
        createdAt: data.createdAtIso || new Date().toISOString(),
        completedAt: data.completedAtIso,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[FirestoreIdempotencyStore] get() failed:', message);
      throw new InternalServerError(
        'فشل استرجاع سجل تكرار العمليات من قاعدة البيانات (Failed to get idempotency record)',
        { error: message, docId },
        'IDEMPOTENCY_LOOKUP_FAILED'
      );
    }
  }

  /**
   * Atomically acquire an in-progress idempotency reservation
   */
  public async createInProgress(
    key: string,
    scope: string,
    requestHash: string
  ): Promise<{ success: boolean; existingRecord?: IdempotencyRecord }> {
    const docId = this.buildDocumentId(key, scope);
    const docRef = this.db.collection(IDEMPOTENCY_COLLECTION).doc(docId);
    const nowIso = new Date().toISOString();

    try {
      return await this.db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);

        if (snap.exists) {
          const existing = snap.data() as FirestoreIdempotencyDoc;
          return {
            success: false,
            existingRecord: {
              key: existing.key,
              scope: existing.scope,
              requestHash: existing.requestHash,
              status: existing.status,
              statusCode: existing.statusCode,
              responseBody: existing.responseBody,
              createdAt: existing.createdAtIso || nowIso,
              completedAt: existing.completedAtIso,
            },
          };
        }

        const newRecord: FirestoreIdempotencyDoc = {
          docId,
          key,
          scope,
          requestHash,
          status: 'IN_PROGRESS',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAtIso: nowIso,
        };

        transaction.set(docRef, newRecord);
        return { success: true };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[FirestoreIdempotencyStore] createInProgress() failed:', message);
      throw new InternalServerError(
        'فشل حجز عملية التكرار الذرية (Failed to acquire atomic idempotency lock)',
        { error: message, docId },
        'IDEMPOTENCY_LOCK_FAILED'
      );
    }
  }

  /**
   * Mark an idempotency reservation as completed with its response payload
   */
  public async complete(
    key: string,
    scope: string,
    statusCode: number,
    responseBody: any
  ): Promise<void> {
    const docId = this.buildDocumentId(key, scope);
    const docRef = this.db.collection(IDEMPOTENCY_COLLECTION).doc(docId);
    const nowIso = new Date().toISOString();

    try {
      const sanitizedBody = responseBody !== undefined ? sanitizeLogData(responseBody) : null;

      await docRef.update({
        status: 'COMPLETED',
        statusCode,
        responseBody: sanitizedBody,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAtIso: nowIso,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[FirestoreIdempotencyStore] complete() failed:', message);
      throw new InternalServerError(
        'فشل حفظ نتيجة استجابة العملية المكتملة في سجل التكرار (Failed to complete idempotency record)',
        { error: message, docId },
        'IDEMPOTENCY_COMPLETE_FAILED'
      );
    }
  }
}
