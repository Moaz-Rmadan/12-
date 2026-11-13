import { ConflictError } from '../errors/app-error';

export interface VersionedEntity {
  id: string;
  version: number;
  [key: string]: any;
}

/**
 * Validate optimistic concurrency version match
 * Throws HTTP 409 Conflict if expected version does not match authoritative stored version
 */
export function assertVersionMatch(
  currentVersion: number,
  expectedVersion: number,
  resourceName = 'Resource'
): void {
  if (expectedVersion !== currentVersion) {
    throw new ConflictError(
      'VERSION_CONFLICT',
      `${resourceName} has been modified concurrently. Current version is ${currentVersion}, but expected version was ${expectedVersion}.`
    );
  }
}

/**
 * Increment version for next atomic update
 */
export function computeNextVersion(currentVersion: number): number {
  return currentVersion + 1;
}

/**
 * Isolated Atomic In-Memory Entity Repository with Compare-and-Swap (CAS)
 * Demonstrates and tests optimistic locking primitives without live database network dependence
 */
export class OptimisticLockManager<T extends VersionedEntity> {
  private readonly items = new Map<string, T>();

  public set(item: T): void {
    this.items.set(item.id, { ...item });
  }

  public get(id: string): T | null {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  /**
   * Atomic Compare-and-Swap Update
   * Simulates Firestore transaction behavior: verifies expected version, applies mutation, increments version
   */
  public atomicUpdate(
    id: string,
    expectedVersion: number,
    updater: (current: T) => Partial<T>
  ): { success: boolean; entity?: T; error?: ConflictError } {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`Entity with ID ${id} not found`);
    }

    // Version Check Precondition
    if (current.version !== expectedVersion) {
      return {
        success: false,
        error: new ConflictError(
          'VERSION_CONFLICT',
          `Conflict: Entity ${id} is at version ${current.version}, expected version ${expectedVersion}.`
        ),
      };
    }

    const updates = updater({ ...current });
    const nextVersion = computeNextVersion(current.version);

    const updatedEntity: T = {
      ...current,
      ...updates,
      id: current.id,
      version: nextVersion,
    };

    this.items.set(id, updatedEntity);
    return { success: true, entity: { ...updatedEntity } };
  }
}
