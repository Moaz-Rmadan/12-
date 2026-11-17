import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
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

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  const customersRef = collection(db, 'customers');

  return onSnapshot(
    customersRef,
    (snapshot) => {
      const map = new Map<string, Customer>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Customer;
        if (data && data.id) {
          map.set(data.id, data);
        }
      });
      callback(Array.from(map.values()));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'customers');
    }
  );
}

export function subscribeToJobOrders(callback: (orders: JobOrderPopulated[]) => void) {
  const ordersRef = collection(db, 'job_orders');

  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const map = new Map<string, JobOrderPopulated>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as JobOrderPopulated;
        if (data && data.id) {
          map.set(data.id, data);
        }
      });
      callback(Array.from(map.values()));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'job_orders');
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
      await updateDoc(doc(db, 'customers', customerId), {
        name: finalCustomer.name,
        address: finalCustomer.address,
        updated_at: nowIso,
      });
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

  try {
    await setDoc(doc(db, 'job_orders', orderId), newPopulatedOrder);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `job_orders/${orderId}`);
  }

  return newPopulatedOrder;
}

export async function updateOrderStatusInFirestore(
  orderId: string,
  newStatus: OrderStatus,
  options?: { deliveredAt?: string }
) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
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

    await updateDoc(orderDocRef, payload);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

export async function updateOrderStageInFirestore(orderId: string, newStage: string) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    const nowIso = new Date().toISOString();
    await updateDoc(orderDocRef, {
      current_stage: newStage,
      stage_updated_at: nowIso,
      updated_at: nowIso,
    });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

export async function updateOrderArchiveStatusInFirestore(orderId: string, isArchived: boolean) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    await updateDoc(orderDocRef, {
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

export async function archiveOrdersBatchInFirestore(orderIds: string[]) {
  if (!orderIds || orderIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    for (const orderId of orderIds) {
      batch.update(doc(db, 'job_orders', orderId), {
        is_archived: true,
        updated_at: nowIso,
      });
    }
    await batch.commit();
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
      await updateDoc(doc(db, 'customers', customerId), {
        name: finalCustomer.name,
        address: finalCustomer.address,
        updated_at: nowIso,
      });
    } else {
      finalCustomer = {
        id: customerId,
        name: payload.customer.name,
        phone: normalizedPhone || '01000000000',
        address: payload.customer.address || 'العنوان غير مدخل',
        created_at: nowIso,
        updated_at: nowIso,
      };
      await setDoc(doc(db, 'customers', customerId), finalCustomer);
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
      installation_notes: payload.job_details.installation_notes,
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

  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    await updateDoc(orderDocRef, {
      order_number: updatedPopulatedOrder.order_number,
      customer_id: updatedPopulatedOrder.customer_id,
      room_model_code: updatedPopulatedOrder.room_model_code,
      contract_date: updatedPopulatedOrder.contract_date,
      delivery_date: updatedPopulatedOrder.delivery_date,
      general_specs: updatedPopulatedOrder.general_specs,
      status: updatedPopulatedOrder.status,
      current_stage: updatedPopulatedOrder.current_stage,
      total_price: updatedPopulatedOrder.total_price,
      deposit_paid: updatedPopulatedOrder.deposit_paid,
      updated_at: nowIso,
      customer: updatedPopulatedOrder.customer,
      job_details: updatedPopulatedOrder.job_details,
      attachments: updatedPopulatedOrder.attachments,
    });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }

  return updatedPopulatedOrder;
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

// Ensure baseline workshop job orders & customers are stored in Firestore (Admin-only operation)
export async function seedWorkshopDataIfMissing(
  customers: Customer[],
  populatedOrders: JobOrderPopulated[]
): Promise<boolean> {
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
      if (!existingCust) {
        ops.push({
          type: 'set',
          col: 'customers',
          id: cust.id,
          data: JSON.parse(JSON.stringify(cust)),
        });
      } else {
        const custRepair = buildRepairedBaselineCustomerUpdate(existingCust, cust, nowIso);
        if (custRepair) {
          ops.push({
            type: 'update',
            col: 'customers',
            id: cust.id,
            data: JSON.parse(JSON.stringify(custRepair)),
          });
        }
      }
    }

    for (const ord of populatedOrders) {
      const existingDoc = existingOrdersMap.get(ord.id);
      if (!existingDoc) {
        ops.push({
          type: 'set',
          col: 'job_orders',
          id: ord.id,
          data: JSON.parse(JSON.stringify(ord)),
        });
      } else {
        const repairUpdates = buildRepairedBaselineOrderUpdate(existingDoc, ord, nowIso);
        if (repairUpdates) {
          ops.push({
            type: 'update',
            col: 'job_orders',
            id: ord.id,
            data: JSON.parse(JSON.stringify(repairUpdates)),
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
          data: JSON.parse(JSON.stringify(manifest)),
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
      return false;
    }

    const CHUNK_SIZE = 400;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      for (const op of chunk) {
        const ref = doc(db, op.col, op.id);
        if (op.type === 'set') {
          batch.set(ref, op.data);
        } else if (op.type === 'update') {
          batch.update(ref, op.data);
        } else {
          batch.delete(ref);
        }
      }
      await batch.commit();
    }

    return true;
  } catch (err) {
    console.warn('[Firebase] Workshop baseline sync skipped:', err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// TRUCK MANIFEST FIRESTORE SERVICES ("حمولة العربية")
// -----------------------------------------------------------------------------

export async function saveTruckManifestToFirestore(manifest: TruckManifest): Promise<TruckManifest> {
  const cleanManifest = JSON.parse(JSON.stringify(manifest)) as TruckManifest;

  try {
    const docRef = doc(db, 'truck_manifests', cleanManifest.id);
    await setDoc(docRef, cleanManifest, { merge: true });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `truck_manifests/${cleanManifest.id}`);
  }

  return cleanManifest;
}

export function subscribeToTruckManifests(callback: (manifests: TruckManifest[]) => void) {
  const colRef = collection(db, 'truck_manifests');

  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: TruckManifest[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as TruckManifest;
          if (data && data.id) {
            list.push(data);
          }
        });
        callback(list);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'truck_manifests');
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

export function subscribeToDeliveryReceipts(callback: (receipts: DeliveryReceiptRecord[]) => void) {
  const colRef = collection(db, 'delivery_receipts');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DeliveryReceiptRecord[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as DeliveryReceiptRecord;
        if (data && data.id) {
          list.push(data);
        }
      });
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'delivery_receipts');
    }
  );
}

export async function issueDeliveryReceiptToFirestore(params: {
  receiptRecord: DeliveryReceiptRecord;
  orderUpdates: PlannedOrderReceiptUpdate[];
}): Promise<DeliveryReceiptRecord> {
  const cleanReceipt = JSON.parse(JSON.stringify(params.receiptRecord)) as DeliveryReceiptRecord;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'delivery_receipts', cleanReceipt.id), cleanReceipt);

    for (const item of params.orderUpdates) {
      const cleanUpdate = JSON.parse(JSON.stringify(item.updates));
      batch.update(doc(db, 'job_orders', item.orderId), cleanUpdate);
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
      batch.update(doc(db, 'job_orders', orderId), {
        delivery_receipt_id: '',
        delivery_receipt_number: '',
        delivered_at: '',
        updated_at: nowIso,
      });
    }

    await batch.commit();
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, `delivery_receipts/${receiptId}`);
  }
}
