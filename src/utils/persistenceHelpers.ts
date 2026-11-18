import {
  Customer,
  DeliveryReceiptRecord,
  JobOrderPopulated,
  TruckManifest,
} from '../types';

export const DEMO_SESSION_FLAG_KEY = 'al_najjar_dev_demo_active';
export const DEMO_DATA_STORAGE_KEY = 'al_najjar_dev_demo_workspace_v1';

export interface LocalWorkspaceSnapshot {
  orders: JobOrderPopulated[];
  customers: Customer[];
  truckManifests: TruckManifest[];
  deliveryReceipts: DeliveryReceiptRecord[];
  updatedAt: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Recursively strips `undefined` properties from objects and replaces `undefined` array entries
 * with `null`, ensuring Firestore SDK `setDoc` / `writeBatch` never throws on undefined fields.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : stripUndefinedDeep(item)
    ) as unknown as T;
  }
  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString() as unknown as T;
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        result[k] = stripUndefinedDeep(v);
      }
    }
    return result as T;
  }
  return value;
}

/**
 * Builds a complete, Firestore-safe payload when updating/upserting an order.
 * If the document doesn't exist yet in Firestore (or a full fallback order is supplied),
 * merging the patch into the full order ensures required fields (`id`, `order_number`, `status`,
 * `customer_id`, `customer`, `job_details`, `attachments`) are always persisted together.
 */
export function buildFullOrderPatchDocument(
  fallbackOrder: JobOrderPopulated | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const cleanPatch = stripUndefinedDeep(patch);
  if (!fallbackOrder) {
    return cleanPatch;
  }
  const cleanOrder = stripUndefinedDeep(fallbackOrder);
  return {
    ...cleanOrder,
    ...cleanPatch,
  };
}

function getSafeStorage(customStorage?: StorageLike | null): StorageLike | null {
  if (customStorage !== undefined) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Strips heavy inline base64 data-URLs only as a last resort if localStorage quota is exceeded.
 */
function compactOrdersForStorage(orders: JobOrderPopulated[]): JobOrderPopulated[] {
  return orders.map((ord) => ({
    ...ord,
    attachments: (ord.attachments || []).map((att) => {
      if (att.file_url && att.file_url.startsWith('data:') && att.file_url.length > 20000) {
        return { ...att, file_url: '' };
      }
      return att;
    }),
  }));
}

export function loadLocalWorkspaceState(
  defaults: {
    orders: JobOrderPopulated[];
    customers: Customer[];
    truckManifests: TruckManifest[];
    deliveryReceipts: DeliveryReceiptRecord[];
  },
  customStorage?: StorageLike | null
): LocalWorkspaceSnapshot {
  const storage = getSafeStorage(customStorage);
  if (!storage) {
    return {
      ...defaults,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = storage.getItem(DEMO_DATA_STORAGE_KEY);
    if (!raw) {
      return {
        ...defaults,
        updatedAt: new Date().toISOString(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<LocalWorkspaceSnapshot>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : defaults.orders,
      customers: Array.isArray(parsed.customers) ? parsed.customers : defaults.customers,
      truckManifests: Array.isArray(parsed.truckManifests)
        ? parsed.truckManifests
        : defaults.truckManifests,
      deliveryReceipts: Array.isArray(parsed.deliveryReceipts)
        ? parsed.deliveryReceipts
        : defaults.deliveryReceipts,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return {
      ...defaults,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function saveLocalWorkspaceState(
  snapshot: Omit<LocalWorkspaceSnapshot, 'updatedAt'>,
  customStorage?: StorageLike | null
): boolean {
  const storage = getSafeStorage(customStorage);
  if (!storage) return false;

  const payload: LocalWorkspaceSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };

  try {
    storage.setItem(DEMO_DATA_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    try {
      const compacted: LocalWorkspaceSnapshot = {
        ...payload,
        orders: compactOrdersForStorage(payload.orders),
      };
      storage.setItem(DEMO_DATA_STORAGE_KEY, JSON.stringify(compacted));
      return true;
    } catch {
      return false;
    }
  }
}

export function clearLocalWorkspaceState(customStorage?: StorageLike | null): void {
  const storage = getSafeStorage(customStorage);
  if (!storage) return;
  try {
    storage.removeItem(DEMO_DATA_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadPersistedDemoSessionFlag(customStorage?: StorageLike | null): boolean {
  const storage = getSafeStorage(customStorage);
  if (!storage) return false;
  try {
    return storage.getItem(DEMO_SESSION_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function savePersistedDemoSessionFlag(
  active: boolean,
  customStorage?: StorageLike | null
): void {
  const storage = getSafeStorage(customStorage);
  if (!storage) return;
  try {
    if (active) {
      storage.setItem(DEMO_SESSION_FLAG_KEY, 'true');
    } else {
      storage.removeItem(DEMO_SESSION_FLAG_KEY);
    }
  } catch {
    // ignore
  }
}
