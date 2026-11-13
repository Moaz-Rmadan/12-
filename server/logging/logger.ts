import crypto from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  errorCode?: string;
  userId?: string;
  message: string;
  data?: Record<string, any>;
}

const SENSITIVE_KEYS = [
  'authorization',
  'token',
  'password',
  'secret',
  'apikey',
  'refreshtoken',
  'accesstoken',
  'cookie',
  'session',
];

/**
 * Deep redaction of sensitive keys in logs
 */
export function sanitizeLogData(obj: any, depth = 0): any {
  if (depth > 4 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.startsWith('Bearer ')) {
      return 'Bearer [REDACTED]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeLogData(value, depth + 1);
    }
  }
  return sanitized;
}

/**
 * Safe server-side structured logger
 */
export class StructuredLogger {
  public log(level: LogLevel, message: string, meta: Partial<StructuredLog> = {}): void {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta.requestId ? { requestId: meta.requestId } : {}),
      ...(meta.method ? { method: meta.method } : {}),
      ...(meta.url ? { url: meta.url } : {}),
      ...(meta.status !== undefined ? { status: meta.status } : {}),
      ...(meta.durationMs !== undefined ? { durationMs: meta.durationMs } : {}),
      ...(meta.errorCode ? { errorCode: meta.errorCode } : {}),
      ...(meta.userId ? { userId: meta.userId } : {}),
      ...(meta.data ? { data: sanitizeLogData(meta.data) } : {}),
    };

    // Output formatted JSON for machine-readability and log ingestion
    const serialized = JSON.stringify(entry);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  public info(message: string, meta?: Partial<StructuredLog>): void {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: Partial<StructuredLog>): void {
    this.log('warn', message, meta);
  }

  public error(message: string, meta?: Partial<StructuredLog>): void {
    this.log('error', message, meta);
  }

  public debug(message: string, meta?: Partial<StructuredLog>): void {
    this.log('debug', message, meta);
  }
}

export const logger = new StructuredLogger();

/**
 * Validates client-supplied request ID or generates cryptographically safe UUIDv4
 */
export function resolveRequestId(headerValue?: string | string[]): string {
  if (headerValue && typeof headerValue === 'string') {
    // Only accept safe alphanumeric + hyphen request IDs between 8 and 64 characters
    const trimmed = headerValue.trim();
    if (/^[a-zA-Z0-9_\-]{8,64}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return crypto.randomUUID();
}
