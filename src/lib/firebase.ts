import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
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
import { Customer, JobOrderPopulated, CreateJobOrderPayload, OrderStatus, TruckManifest } from '../types';
import { initialCustomers, initialOrders, getPopulatedOrders } from '../data/mockData';

// Initialize Firebase App & Firestore Database with persistent offline IndexedDB cache
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}, firebaseConfig.firestoreDatabaseId);
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
}

// -----------------------------------------------------------------------------
// FIRESTORE LIVE SYNC API SERVICES FOR EL-NAGGAR DESIGN
// -----------------------------------------------------------------------------

// Live Listener for Customers
export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  const customersRef = collection(db, 'customers');

  return onSnapshot(
    customersRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Seed default initial customers if empty
        initialCustomers.forEach((c) => {
          setDoc(doc(db, 'customers', c.id), c);
        });
        callback(initialCustomers);
      } else {
        const map = new Map<string, Customer>();
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Customer;
          if (data && data.id) {
            map.set(data.id, data);
          }
        });
        callback(Array.from(map.values()));
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'customers');
      callback(initialCustomers);
    }
  );
}

// Live Listener for Job Orders
export function subscribeToJobOrders(callback: (orders: JobOrderPopulated[]) => void) {
  const ordersRef = collection(db, 'job_orders');

  return onSnapshot(
    ordersRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Seed default initial orders if empty
        const defaultOrders = getPopulatedOrders();
        defaultOrders.forEach((o) => {
          setDoc(doc(db, 'job_orders', o.id), o);
        });
        callback(defaultOrders);
      } else {
        const map = new Map<string, JobOrderPopulated>();
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as JobOrderPopulated;
          if (data && data.id) {
            map.set(data.id, data);
          }
        });
        callback(Array.from(map.values()));
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'job_orders');
      callback(getPopulatedOrders());
    }
  );
}

// Save or Create Job Order in Firestore
export async function saveJobOrderToFirestore(payload: CreateJobOrderPayload): Promise<JobOrderPopulated> {
  const orderId = `ord-${Date.now()}`;
  const normalizedPhone = (payload.customer.phone || '').trim();

  let customerId = `cust-${Date.now()}`;
  let finalCustomer: Customer;

  try {
    // 1. Check if customer already exists in Firestore by phone
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
      // Customer exists: preserve original ID & history, update latest address or name if provided
      finalCustomer = {
        ...existingCustomerDoc,
        name: payload.customer.name || existingCustomerDoc.name,
        address: payload.customer.address || existingCustomerDoc.address,
      };
      await updateDoc(doc(db, 'customers', customerId), {
        name: finalCustomer.name,
        address: finalCustomer.address,
      });
    } else {
      // New Customer: create new customer document
      finalCustomer = {
        id: customerId,
        name: payload.customer.name,
        phone: normalizedPhone || '01000000000',
        address: payload.customer.address || 'العنوان غير مدخل',
        created_at: new Date().toISOString(),
      };
      await setDoc(doc(db, 'customers', customerId), finalCustomer);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${customerId}`);
    finalCustomer = {
      id: customerId,
      name: payload.customer.name,
      phone: normalizedPhone || '01000000000',
      address: payload.customer.address || 'العنوان غير مدخل',
      created_at: new Date().toISOString(),
    };
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
    },
    attachments: payload.attachments.map((a, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      job_order_id: orderId,
      file_type: a.file_type,
      file_url: a.file_url,
      title: a.title,
      description: a.description || '',
      uploaded_at: new Date().toISOString(),
    })),
  };

  try {
    // Write job order to Firestore
    await setDoc(doc(db, 'job_orders', orderId), newPopulatedOrder);
    console.log('[Firebase] Order saved to Firestore:', orderId);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `job_orders/${orderId}`);
  }

  return newPopulatedOrder;
}

// Update Order Status in Firestore
export async function updateOrderStatusInFirestore(orderId: string, newStatus: OrderStatus) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    await updateDoc(orderDocRef, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    });
    console.log('[Firebase] Order status updated:', orderId, newStatus);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

// Update Order Production Stage in Firestore
export async function updateOrderStageInFirestore(orderId: string, newStage: string) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    const nowIso = new Date().toISOString();
    await updateDoc(orderDocRef, {
      current_stage: newStage,
      stage_updated_at: nowIso,
      updated_at: nowIso,
    });
    console.log('[Firebase] Order stage updated:', orderId, newStage, nowIso);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

// Update Order Archive Status in Firestore
export async function updateOrderArchiveStatusInFirestore(orderId: string, isArchived: boolean) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    await updateDoc(orderDocRef, {
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    });
    console.log('[Firebase] Order archive status updated:', orderId, isArchived);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }
}

// Update Complete Job Order in Firestore (for modifications / amendments)
export async function updateJobOrderInFirestore(
  orderId: string,
  payload: CreateJobOrderPayload
): Promise<JobOrderPopulated> {
  const normalizedPhone = (payload.customer.phone || '').trim();
  const nowIso = new Date().toISOString();

  let customerId = `cust-${Date.now()}`;
  let finalCustomer: Customer;

  try {
    // 1. Check or update customer in Firestore
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
    handleFirestoreError(err, OperationType.WRITE, `customers/${customerId}`);
    finalCustomer = {
      id: customerId,
      name: payload.customer.name,
      phone: normalizedPhone || '01000000000',
      address: payload.customer.address || 'العنوان غير مدخل',
      updated_at: nowIso,
    };
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
      total_price: updatedPopulatedOrder.total_price,
      deposit_paid: updatedPopulatedOrder.deposit_paid,
      updated_at: nowIso,
      customer: updatedPopulatedOrder.customer,
      job_details: updatedPopulatedOrder.job_details,
      attachments: updatedPopulatedOrder.attachments,
    });
    console.log('[Firebase] Order updated in Firestore:', orderId);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `job_orders/${orderId}`);
  }

  return updatedPopulatedOrder;
}

// Delete Order from Firestore
export async function deleteOrderFromFirestore(orderId: string) {
  try {
    const orderDocRef = doc(db, 'job_orders', orderId);
    await deleteDoc(orderDocRef);
    console.log('[Firebase] Order deleted:', orderId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `job_orders/${orderId}`);
  }
}

// Delete Customer from Firestore
export async function deleteCustomerFromFirestore(customerId: string) {
  try {
    const custDocRef = doc(db, 'customers', customerId);
    await deleteDoc(custDocRef);
    console.log('[Firebase] Customer deleted:', customerId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `customers/${customerId}`);
  }
}

// Single Customer save to Firestore
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
    console.log('[Firebase] Customer saved:', custId);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${custId}`);
  }
  return custData;
}

// Batch Customers Import to Firestore
export async function saveBatchCustomersToFirestore(
  newCustomers: Array<{ name: string; phone: string; address?: string }>
): Promise<Customer[]> {
  const addedCustomers: Customer[] = [];
  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  // Retrieve existing phone numbers to prevent duplicates
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
      console.log(`[Firebase] Batch imported ${addedCustomers.length} customers to Firestore`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'customers/batch');
    }
  }

  return addedCustomers;
}

// Batch Job Orders Import (with automatic customer separation & link)
export async function saveBatchJobOrdersToFirestore(
  ordersList: CreateJobOrderPayload[]
): Promise<JobOrderPopulated[]> {
  const populatedResults: JobOrderPopulated[] = [];
  for (const payload of ordersList) {
    try {
      const saved = await saveJobOrderToFirestore(payload);
      populatedResults.push(saved);
    } catch (err) {
      console.error('[Firebase] Error saving batch order:', payload.job_order.order_number, err);
    }
  }
  return populatedResults;
}

// Ensure all workshop job orders & customers are stored in Firestore
export async function seedWorkshopDataIfMissing(
  customers: Customer[],
  populatedOrders: JobOrderPopulated[]
): Promise<boolean> {
  try {
    const ordersSnap = await getDocs(collection(db, 'job_orders'));
    const existingOrderIds = new Set<string>();
    ordersSnap.forEach((docSnap) => {
      existingOrderIds.add(docSnap.id);
    });

    const custSnap = await getDocs(collection(db, 'customers'));
    const existingCustIds = new Set<string>();
    custSnap.forEach((docSnap) => {
      existingCustIds.add(docSnap.id);
    });

    const batch = writeBatch(db);
    let hasChanges = false;

    // 1. Seed any missing customers
    for (const cust of customers) {
      if (!existingCustIds.has(cust.id)) {
        const custRef = doc(db, 'customers', cust.id);
        batch.set(custRef, JSON.parse(JSON.stringify(cust)));
        hasChanges = true;
      }
    }

    // 2. Seed any missing job orders
    for (const ord of populatedOrders) {
      if (!existingOrderIds.has(ord.id)) {
        const ordRef = doc(db, 'job_orders', ord.id);
        batch.set(ordRef, JSON.parse(JSON.stringify(ord)));
        hasChanges = true;
      }
    }

    // 3. Clean up legacy dummy orders if present
    const legacyIds = ['ord-1', 'ord-2', 'ord-3'];
    for (const legId of legacyIds) {
      if (existingOrderIds.has(legId)) {
        const legRef = doc(db, 'job_orders', legId);
        batch.delete(legRef);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await batch.commit();
      console.log('[Firebase] Successfully synchronized workshop customers and orders to Firestore.');
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Firebase] Error syncing workshop orders to Firestore:', err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// TRUCK MANIFEST FIRESTORE SERVICES ("حمولة العربية")
// -----------------------------------------------------------------------------

export async function saveTruckManifestToFirestore(manifest: TruckManifest): Promise<TruckManifest> {
  // Strip all undefined fields to prevent Firestore "Unsupported field value: undefined" error
  const cleanManifest = JSON.parse(JSON.stringify(manifest)) as TruckManifest;

  try {
    const docRef = doc(db, 'truck_manifests', cleanManifest.id);
    await setDoc(docRef, cleanManifest, { merge: true });
    console.log('[Firebase] Saved truck manifest to Firestore:', cleanManifest.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `truck_manifests/${cleanManifest.id}`);
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
    console.log('[Firebase] Deleted truck manifest from Firestore:', manifestId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `truck_manifests/${manifestId}`);
  }
}


