export interface IdempotencyRecord {
  key: string;
  scope: string;
  requestHash: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  statusCode?: number;
  responseBody?: any;
  createdAt: string;
  completedAt?: string;
}

export interface IdempotencyStore {
  get(key: string, scope: string): Promise<IdempotencyRecord | null>;
  createInProgress(
    key: string,
    scope: string,
    requestHash: string
  ): Promise<{ success: boolean; existingRecord?: IdempotencyRecord }>;
  complete(key: string, scope: string, statusCode: number, responseBody: any): Promise<void>;
}

/**
 * In-memory thread-safe Idempotency Store for testing, development, and baseline abstraction
 * (Production persistence is decoupled pending formal retention approval)
 */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, IdempotencyRecord>();

  private buildCompoundKey(key: string, scope: string): string {
    return `${scope}::${key}`;
  }

  public async get(key: string, scope: string): Promise<IdempotencyRecord | null> {
    const record = this.store.get(this.buildCompoundKey(key, scope));
    return record ? { ...record } : null;
  }

  public async createInProgress(
    key: string,
    scope: string,
    requestHash: string
  ): Promise<{ success: boolean; existingRecord?: IdempotencyRecord }> {
    const compoundKey = this.buildCompoundKey(key, scope);
    const existing = this.store.get(compoundKey);

    if (existing) {
      return { success: false, existingRecord: { ...existing } };
    }

    const record: IdempotencyRecord = {
      key,
      scope,
      requestHash,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
    };

    this.store.set(compoundKey, record);
    return { success: true };
  }

  public async complete(
    key: string,
    scope: string,
    statusCode: number,
    responseBody: any
  ): Promise<void> {
    const compoundKey = this.buildCompoundKey(key, scope);
    const existing = this.store.get(compoundKey);

    if (existing) {
      existing.status = 'COMPLETED';
      existing.statusCode = statusCode;
      existing.responseBody = responseBody;
      existing.completedAt = new Date().toISOString();
      this.store.set(compoundKey, existing);
    }
  }

  public clear(): void {
    this.store.clear();
  }
}
