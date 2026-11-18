import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Customer,
  JobOrderPopulated,
  CreateJobOrderPayload,
  OrderStatus,
  TruckManifest,
  DeliveryReceiptRecord,
} from '../types';
import { PlannedOrderReceiptUpdate } from '../utils/deliveryReceiptLink';
import { initialTruckManifests } from '../data/truckManifestData';
import {
  buildRepairedBaselineOrderUpdate,
  buildRepairedBaselineCustomerUpdate,
} from '../utils/baselineSync';
import {
  buildFullOrderPatchDocument,
  stripUndefinedDeep,
} from '../utils/persistenceHelpers';
import { FactorySettings } from '../utils/settingsStore';

// Initialize Firebase App & Firestore Database with persistent offline IndexedDB cache
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('[Firebase Auth] Could not enforce browserLocalPersistence:', err);
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): Error {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  const serialized = JSON.stringify(errInfo);
  console.error('[Firestore Error]:', serialized);
  return new Error(serialized);
}

/**
 * Verifies live Firestore reachability after authentication.
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client appears offline or unreachable.');
    }
    return false;
  }
}

// -----------------------------------------------------------------------------
// FIRESTORE LIVE SYNC API SERVICES FOR EL-NAGGAR FURNITURE
// -----------------------------------------------------------------------------

export function subscribeToCustomers(
  callback: (customers: Customer[]) => void,
  onError?: (err: Error) => void
) {
  const customersRef = collection(db, 'customers');

  return onSnapshot(
    customersRef,
    (snapshot) => {
      const map = new Map<string, Customer>();
      snapshot.docs.forEach((docSnap) => {
        const raw = docSnap.data() as Partial<Customer>;
        const id = raw?.id || docSnap.id;
        if (raw && raw.name) {
          map.set(id, { ...raw, id } as Customer);
        }
      });
      callback(Array.from(map.values()));
    },
    (err) => {
      const wrapped = handleFirestoreError(err, OperationType.LIST, 'customers');
      if (onError) onError(wrapped);
    }
  );
}

export function subscribeToJobOrders(
  callback: (orders: JobOrderPopulated[]) => void,
  onError?: (err: Error) => void
) {
  const ordersRef = collection(db, 'job_orders');

  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const map = new Map<string, JobOrderPopulated>();
      snapshot.docs.forEach((docSnap) => {
        const raw = docSnap.data() as Partial<JobOrderPopulated>;
        const id = raw?.id || docSnap.id;
        if (raw && raw.order_number) {
          map.set(id, { ...raw, id } as JobOrderPopulated);
        }
      });
      callback(Array.from(map.values()));
    },
    (err) => {
      const wrapped = handleFirestoreError(err, OperationType.LIST, 'job_orders');
      if (onError) onError(wrapped);
    }
  );
}

// Save or Create Job Order in Firestore
export async function saveJobOrderToFirestore(payload: CreateJobOrderPayload): Promise<JobOrderPopulated> {
  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const normalizedPhone = (payload.customer.phone || '').trim();
  const nowIso = new Date().toISOString();

  let customerId = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let finalCustomer: Customer;

  try {
    let existingCustomerDoc: Customer | null = null;
    if (normalizedPhone) {
      const custQuery = query(collection(db, 'customers'), where('phone', '==', normalizedPhone), limit(1));
      const querySnap = await getDocs(custQuery);
      if (!querySnap.empty) {
        existingCustomerDoc = querySnap.docs[0].data() as Customer;
        customerId = querySnap.docs[0].id;
      }
    }

    if (existingCustomerDoc) {
      finalCustomer = {
        ...existingCustomerDoc,
        name: payload.customer.name || existingCustomerDoc.name,
        address: payload.customer.address || existingCustomerDoc.address,
      };
      await setDoc(
        doc(db, 'customers', customerId),
        stripUndefinedDeep({
          name: finalCustomer.name,
          address: finalCustomer.address,
          updated_at: nowIso,
        }),
        { merge: true }
      );
    } else {
      finalCustomer = {
        id: customerId,
        name: payload.customer.name,
        phone: normalizedPhone || '01000000000',
        address: payload.customer.address || 'العنوان غير مدخل',
        created_at: nowIso,
      };
      await setDoc(doc(db, 'customers', customerId), finalCustomer);
    }
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `customers/${customerId}`);
  }

  const newPopulatedOrder: JobOrderPopulated = {
    id: orderId,
    order_number: payload.job_order.order_number,
    customer_id: customerId,
    room_model_code: payload.job_order.room_model_code,
    contract_date: payload.job_order.contract_date,
    delivery_date: payload.job_order.delivery_date,
    general_specs: payload.job_order.general_specs,
    status: payload.job_order.status,
    current_stage: payload.job_order.current_stage || 'لم يبدأ',
    total_price: payload.job_order.total_price,
    deposit_paid: payload.job_order.deposit_paid,
    created_at: nowIso,
    updated_at: nowIso,
    customer: finalCustomer,
    job_details: {
      id: `det-${Date.now()}`,
      job_order_id: orderId,
      dimensions_cm: payload.job_details.dimensions_cm,
      wood_type: payload.job_details.wood_type,
      paint_details: payload.job_details.paint_details,
      fabric_source: payload.job_details.fabric_source,
      color_code: payload.job_details.color_code,
      batch_number: payload.job_details.batch_number,
      installation_notes: payload.job_details.installation_notes,
      created_at: nowIso,
    },
    attachments: payload.attachments.map((a, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      job_order_id: orderId,
      file_type: a.file_type,
      file_url: a.file_url,
      title: a.title,
      description: a.description || '',
      uploaded_at: nowIso,
    })),
  };

  const cleanNewOrder = stripUndefinedDeep(newPopulatedOrder);

  try {
    await setDoc(doc(db, 'job_orders', orderId), cleanNewOrder);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `job_orders/${orderId}`);
  }

  return cleanNewOrder;
}

async function upsertOrderPatchSafely(
  orderId: string,
  patch: Record<string, unknown>,
  fallbackOrder?: JobOrderPopulated
) {
  const orderDocRef = doc(db, 'job_orders', orderId);
  const existingSnap = await getDoc(orderDocRef);
  const cleanPatch = stripUndefinedDeep(patch);

  if (existingSnap.exists() && existingSnap.data()?.order_number) {
    await setDoc(orderDocRef, cleanPatch, { merge: true });
    return;
  }

  const fullDoc = buildFullOrderPatchDocument(fallbackOrder, {
    id: orderId,
    ...cleanPatch,
  });
  await setDoc(orderDocRef, fullDoc, { merge: true });
}

export async function updateOrderStatusInFirestore(
  orderId: string,
  newStatus: OrderStatus,
  options?: { deliveredAt?: string; fallbackOrder?: JobOrderPopulated }
) {
  try {
    const nowIso = new Date().toISOString();
    const payload: Record<string, any> = {
      status: newStatus,
      updated_at: nowIso,
    };

    if (newStatus === 'تسليم') {
      payload.delivered_at = options?.deliveredAt || nowIso.slice(0, 10);
      payload.current_stage = 'جاهز للتسليم';
      payload.stage_updated_at = nowIso;
    }

    await upsertOrderPatchSafely(orderId, payload, options?.fallbackOrder);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

export async function updateOrderStageInFirestore(
  orderId: string,
  newStage: string,
  fallbackOrder?: JobOrderPopulated
) {
  try {
    const nowIso = new Date().toISOString();
    await upsertOrderPatchSafely(
      orderId,
      {
        current_stage: newStage,
        stage_updated_at: nowIso,
        updated_at: nowIso,
      },
      fallbackOrder
    );
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

export async function updateOrderArchiveStatusInFirestore(
  orderId: string,
  isArchived: boolean,
  fallbackOrder?: JobOrderPopulated
) {
  try {
    await upsertOrderPatchSafely(
      orderId,
      {
        is_archived: isArchived,
        updated_at: new Date().toISOString(),
      },
      fallbackOrder
    );
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

export async function archiveOrdersBatchInFirestore(
  orderIds: string[],
  fallbackOrdersById?: Map<string, JobOrderPopulated>
) {
  if (!orderIds || orderIds.length === 0) return;
  try {
    const nowIso = new Date().toISOString();
    const CHUNK = 40;
    for (let i = 0; i < orderIds.length; i += CHUNK) {
      const chunkIds = orderIds.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const orderId of chunkIds) {
        const orderRef = doc(db, 'job_orders', orderId);
        const fallback = fallbackOrdersById?.get(orderId);
        const snap = await getDoc(orderRef);
        const patch = {
          is_archived: true,
          updated_at: nowIso,
        };
        if (snap.exists() && snap.data()?.order_number) {
          batch.set(orderRef, patch, { merge: true });
        } else {
          batch.set(orderRef, buildFullOrderPatchDocument(fallback, { id: orderId, ...patch }), {
            merge: true,
          });
        }
      }
      await batch.commit();
    }
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, 'job_orders/batch-archive');
  }
}

export async function updateJobOrderInFirestore(
  orderId: string,
  payload: CreateJobOrderPayload
): Promise<JobOrderPopulated> {
  const normalizedPhone = (payload.customer.phone || '').trim();
  const nowIso = new Date().toISOString();

  let customerId = `cust-${Date.now()}`;
  let finalCustomer: Customer;

  try {
    let existingCustomerDoc: Customer | null = null;
    if (normalizedPhone) {
      const custQuery = query(collection(db, 'customers'), where('phone', '==', normalizedPhone), limit(1));
      const querySnap = await getDocs(custQuery);
      if (!querySnap.empty) {
        existingCustomerDoc = querySnap.docs[0].data() as Customer;
        customerId = querySnap.docs[0].id;
      }
    }

    if (existingCustomerDoc) {
      finalCustomer = {
        ...existingCustomerDoc,
        name: payload.customer.name || existingCustomerDoc.name,
        address: payload.customer.address || existingCustomerDoc.address,
        updated_at: nowIso,
      };
      await setDoc(
        doc(db, 'customers', customerId),
        stripUndefinedDeep({
          name: finalCustomer.name,
          address: finalCustomer.address,
          updated_at: nowIso,
        }),
        { merge: true }
      );
    } else {
      finalCustomer = {
        id: customerId,
        name: payload.customer.name,
        phone: normalizedPhone || '01000000000',
        address: payload.customer.address || 'العنوان غير مدخل',
        created_at: nowIso,
        updated_at: nowIso,
      };
      await setDoc(doc(db, 'customers', customerId), stripUndefinedDeep(finalCustomer));
    }
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `customers/${customerId}`);
  }

  const updatedPopulatedOrder: JobOrderPopulated = {
    id: orderId,
    order_number: payload.job_order.order_number,
    customer_id: customerId,
    room_model_code: payload.job_order.room_model_code,
    contract_date: payload.job_order.contract_date,
    delivery_date: payload.job_order.delivery_date,
    general_specs: payload.job_order.general_specs,
    status: payload.job_order.status,
    current_stage: payload.job_order.current_stage || 'لم يبدأ',
    total_price: payload.job_order.total_price,
    deposit_paid: payload.job_order.deposit_paid,
    updated_at: nowIso,
    customer: finalCustomer,
    job_details: {
      id: `det-${Date.now()}`,
      job_order_id: orderId,
      dimensions_cm: payload.job_details.dimensions_cm,
      wood_type: payload.job_details.wood_type,
      paint_details: payload.job_details.paint_details,
      fabric_source: payload.job_details.fabric_source,
      color_code: payload.job_details.color_code,
      batch_number: payload.job_details.batch_number,
      installation_notes: payload.job_details.installation_notes || '',
    },
    attachments: payload.attachments.map((a, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      job_order_id: orderId,
      file_type: a.file_type,
      file_url: a.file_url,
      title: a.title,
      description: a.description || '',
      uploaded_at: nowIso,
    })),
  };

  const cleanUpdatedOrder = stripUndefinedDeep(updatedPopulatedOrder);

  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    await setDoc(orderDocRef, cleanUpdatedOrder, { merge: true });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }

  return cleanUpdatedOrder;
}

export async function deleteOrderFromFirestore(orderId: string) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    await deleteDoc(orderDocRef);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, `job_orders/${orderId}`);
  }
}

export async function deleteCustomerFromFirestore(customerId: string) {
  try {
    const custDocRef = doc(db, 'customers', customerId);
    await deleteDoc(custDocRef);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, `customers/${customerId}`);
  }
}

export async function saveCustomerToFirestore(cust: { name: string; phone: string; address?: string }): Promise<Customer> {
  const custId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const custData: Customer = {
    id: custId,
    name: cust.name.trim(),
    phone: cust.phone.trim() || '01000000000',
    address: (cust.address || 'العنوان غير مدخل').trim(),
    created_at: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'customers', custId), custData);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `customers/${custId}`);
  }
  return custData;
}

export async function saveBatchCustomersToFirestore(
  newCustomers: Array<{ name: string; phone: string; address?: string }>
): Promise<Customer[]> {
  const addedCustomers: Customer[] = [];
  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  const existingPhones = new Set<string>();
  try {
    const existingSnap = await getDocs(collection(db, 'customers'));
    existingSnap.forEach((d) => {
      const data = d.data() as Customer;
      if (data.phone) existingPhones.add(data.phone.trim());
    });
  } catch (e) {
    console.warn('[Firebase] Could not fetch existing customers for deduplication', e);
  }

  for (let i = 0; i < newCustomers.length; i++) {
    const c = newCustomers[i];
    const phone = (c.phone || '').trim();
    if (!c.name || !c.name.trim()) continue;

    if (phone && existingPhones.has(phone)) {
      continue;
    }
    if (phone) existingPhones.add(phone);

    const custId = `cust-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
    const custData: Customer = {
      id: custId,
      name: c.name.trim(),
      phone: phone || '01000000000',
      address: (c.address || 'العنوان غير مدخل').trim(),
      created_at: nowIso,
    };

    batch.set(doc(db, 'customers', custId), custData);
    addedCustomers.push(custData);
  }

  if (addedCustomers.length > 0) {
    try {
      await batch.commit();
    } catch (err) {
      throw handleFirestoreError(err, OperationType.WRITE, 'customers/batch');
    }
  }

  return addedCustomers;
}

export async function saveBatchJobOrdersToFirestore(
  ordersList: CreateJobOrderPayload[]
): Promise<JobOrderPopulated[]> {
  const populatedResults: JobOrderPopulated[] = [];
  for (const payload of ordersList) {
    const saved = await saveJobOrderToFirestore(payload);
    populatedResults.push(saved);
  }
  return populatedResults;
}

// Ensure baseline workshop job orders & customers are stored in Firestore
export async function seedWorkshopDataIfMissing(
  customers: Customer[],
  populatedOrders: JobOrderPopulated[]
): Promise<{ synced: boolean; error?: string }> {
  try {
    const ordersSnap = await getDocs(collection(db, 'job_orders'));
    const existingOrdersMap = new Map<string, Partial<JobOrderPopulated>>();
    ordersSnap.forEach((docSnap) => {
      existingOrdersMap.set(docSnap.id, docSnap.data() as Partial<JobOrderPopulated>);
    });

    const custSnap = await getDocs(collection(db, 'customers'));
    const existingCustMap = new Map<string, Partial<Customer>>();
    custSnap.forEach((docSnap) => {
      existingCustMap.set(docSnap.id, docSnap.data() as Partial<Customer>);
    });

    type BatchOp =
      | { type: 'set'; col: 'customers' | 'job_orders' | 'truck_manifests'; id: string; data: Record<string, unknown> }
      | { type: 'update'; col: 'customers' | 'job_orders'; id: string; data: Record<string, unknown> }
      | { type: 'delete'; col: 'job_orders'; id: string };

    const ops: BatchOp[] = [];
    const nowIso = new Date().toISOString();

    for (const cust of customers) {
      const existingCust = existingCustMap.get(cust.id);
      if (!existingCust || !existingCust.name) {
        ops.push({
          type: 'set',
          col: 'customers',
          id: cust.id,
          data: stripUndefinedDeep(cust) as unknown as Record<string, unknown>,
        });
      } else {
        const custRepair = buildRepairedBaselineCustomerUpdate(existingCust, cust, nowIso);
        if (custRepair) {
          ops.push({
            type: 'update',
            col: 'customers',
            id: cust.id,
            data: stripUndefinedDeep(custRepair) as unknown as Record<string, unknown>,
          });
        }
      }
    }

    for (const ord of populatedOrders) {
      const existingDoc = existingOrdersMap.get(ord.id);
      if (!existingDoc || !existingDoc.order_number) {
        const mergedData = existingDoc
          ? { ...stripUndefinedDeep(ord), ...stripUndefinedDeep(existingDoc), id: ord.id }
          : stripUndefinedDeep(ord);
        ops.push({
          type: 'set',
          col: 'job_orders',
          id: ord.id,
          data: mergedData as unknown as Record<string, unknown>,
        });
      } else {
        const repairUpdates = buildRepairedBaselineOrderUpdate(existingDoc, ord, nowIso);
        if (repairUpdates) {
          ops.push({
            type: 'update',
            col: 'job_orders',
            id: ord.id,
            data: stripUndefinedDeep(repairUpdates) as unknown as Record<string, unknown>,
          });
        }
      }
    }

    const manifestsSnap = await getDocs(collection(db, 'truck_manifests'));
    if (manifestsSnap.empty) {
      for (const manifest of initialTruckManifests) {
        ops.push({
          type: 'set',
          col: 'truck_manifests',
          id: manifest.id,
          data: stripUndefinedDeep(manifest) as unknown as Record<string, unknown>,
        });
      }
    }

    const legacyIds = ['ord-1', 'ord-2', 'ord-3'];
    for (const legId of legacyIds) {
      if (existingOrdersMap.has(legId)) {
        ops.push({
          type: 'delete',
          col: 'job_orders',
          id: legId,
        });
      }
    }

    if (ops.length === 0) {
      return { synced: true };
    }

    const CHUNK_SIZE = 40;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      for (const op of chunk) {
        const ref = doc(db, op.col, op.id);
        if (op.type === 'set') {
          batch.set(ref, op.data, { merge: true });
        } else if (op.type === 'update') {
          batch.set(ref, op.data, { merge: true });
        } else {
          batch.delete(ref);
        }
      }
      await batch.commit();
    }

    return { synced: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Firebase] Workshop baseline sync error:', message);
    return { synced: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// TRUCK MANIFEST FIRESTORE SERVICES ("حمولة العربية")
// -----------------------------------------------------------------------------

export async function saveTruckManifestToFirestore(manifest: TruckManifest): Promise<TruckManifest> {
  const cleanManifest = stripUndefinedDeep(manifest) as TruckManifest;

  try {
    const docRef = doc(db, 'truck_manifests', cleanManifest.id);
    await setDoc(docRef, cleanManifest, { merge: true });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `truck_manifests/${cleanManifest.id}`);
  }

  return cleanManifest;
}

export function subscribeToTruckManifests(
  callback: (manifests: TruckManifest[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'truck_manifests');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: TruckManifest[] = [];
      snapshot.docs.forEach((docSnap) => {
        const raw = docSnap.data() as Partial<TruckManifest>;
        const id = raw?.id || docSnap.id;
        if (raw && (raw.tripDate || raw.truckNumber || Array.isArray(raw.items))) {
          list.push({ ...raw, id } as TruckManifest);
        }
      });
      callback(list);
    },
    (err) => {
      const wrapped = handleFirestoreError(err, OperationType.LIST, 'truck_manifests');
      if (onError) onError(wrapped);
    }
  );
}

export async function deleteTruckManifestFromFirestore(manifestId: string): Promise<void> {
  try {
    const docRef = doc(db, 'truck_manifests', manifestId);
    await deleteDoc(docRef);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, `truck_manifests/${manifestId}`);
  }
}

// -----------------------------------------------------------------------------
// CUSTOMER DELIVERY RECEIPT SERVICES ("إقرار استلام العميل المرتبط بأوامر الشغل")
// -----------------------------------------------------------------------------

export function subscribeToDeliveryReceipts(
  callback: (receipts: DeliveryReceiptRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'delivery_receipts');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DeliveryReceiptRecord[] = [];
      snapshot.docs.forEach((docSnap) => {
        const raw = docSnap.data() as Partial<DeliveryReceiptRecord>;
        const id = raw?.id || docSnap.id;
        if (raw && raw.receipt_number) {
          list.push({ ...raw, id } as DeliveryReceiptRecord);
        }
      });
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      callback(list);
    },
    (err) => {
      const wrapped = handleFirestoreError(err, OperationType.LIST, 'delivery_receipts');
      if (onError) onError(wrapped);
    }
  );
}

export async function issueDeliveryReceiptToFirestore(params: {
  receiptRecord: DeliveryReceiptRecord;
  orderUpdates: PlannedOrderReceiptUpdate[];
  fallbackOrdersById?: Map<string, JobOrderPopulated>;
}): Promise<DeliveryReceiptRecord> {
  const cleanReceipt = stripUndefinedDeep(params.receiptRecord) as DeliveryReceiptRecord;

  try {
    // Check if any target order isn't in Firestore yet so we write a full order doc instead of a partial fragment
    const missingOrderIds = new Set<string>();
    for (const item of params.orderUpdates) {
      const snap = await getDoc(doc(db, 'job_orders', item.orderId));
      if (!snap.exists() || !snap.data()?.order_number) {
        missingOrderIds.add(item.orderId);
      }
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'delivery_receipts', cleanReceipt.id), cleanReceipt);

    for (const item of params.orderUpdates) {
      const cleanUpdate = stripUndefinedDeep(item.updates) as Record<string, unknown>;
      const orderRef = doc(db, 'job_orders', item.orderId);
      if (missingOrderIds.has(item.orderId)) {
        const fallback = params.fallbackOrdersById?.get(item.orderId);
        batch.set(
          orderRef,
          buildFullOrderPatchDocument(fallback, { id: item.orderId, ...cleanUpdate }),
          { merge: true }
        );
      } else {
        batch.set(orderRef, cleanUpdate, { merge: true });
      }
    }

    await batch.commit();
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `delivery_receipts/${cleanReceipt.id}`);
  }

  return cleanReceipt;
}

export async function deleteDeliveryReceiptFromFirestore(
  receiptId: string,
  linkedOrderIds: string[] = []
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'delivery_receipts', receiptId));

    const nowIso = new Date().toISOString();
    for (const orderId of linkedOrderIds) {
      batch.set(
        doc(db, 'job_orders', orderId),
        {
          delivery_receipt_id: '',
          delivery_receipt_number: '',
          delivered_at: '',
          updated_at: nowIso,
        },
        { merge: true }
      );
    }

    await batch.commit();
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, `delivery_receipts/${receiptId}`);
  }
}

// -----------------------------------------------------------------------------
// FACTORY SETTINGS FIRESTORE SYNC ("إعدادات المصنع")
// -----------------------------------------------------------------------------

export function subscribeToFactorySettings(
  callback: (settings: Partial<FactorySettings>) => void,
  onError?: (err: Error) => void
) {
  const settingsRef = doc(db, 'settings', 'factory');
  return onSnapshot(
    settingsRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as Partial<FactorySettings>);
      }
    },
    (err) => {
      const wrapped = handleFirestoreError(err, OperationType.GET, 'settings/factory');
      if (onError) onError(wrapped);
    }
  );
}

export async function saveFactorySettingsToFirestore(
  settings: FactorySettings
): Promise<void> {
  try {
    const payload = stripUndefinedDeep({
      ...settings,
      updated_at: new Date().toISOString(),
    });
    await setDoc(doc(db, 'settings', 'factory'), payload, { merge: true });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, 'settings/factory');
  }
}
