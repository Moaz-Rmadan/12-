import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Customer, JobOrderPopulated, CreateJobOrderPayload, OrderStatus } from '../types';
import { initialCustomers, initialOrders, getPopulatedOrders } from '../data/mockData';

// Initialize Firebase App & Firestore Database
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test Firestore Connection on Boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Firestore connected successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client appears offline or pending connection.');
    }
  }
}
testFirestoreConnection();

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
  const customerId = `cust-${Date.now()}`;

  const newCustomer: Customer = {
    id: customerId,
    name: payload.customer.name,
    phone: payload.customer.phone || '01000000000',
    address: payload.customer.address || 'العنوان غير مدخل',
    created_at: new Date().toISOString(),
  };

  const newPopulatedOrder: JobOrderPopulated = {
    id: orderId,
    order_number: payload.job_order.order_number,
    customer_id: customerId,
    room_model_code: payload.job_order.room_model_code,
    contract_date: payload.job_order.contract_date,
    delivery_date: payload.job_order.delivery_date,
    general_specs: payload.job_order.general_specs,
    status: payload.job_order.status,
    total_price: payload.job_order.total_price,
    deposit_paid: payload.job_order.deposit_paid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer: newCustomer,
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
    // Write customer to Firestore
    await setDoc(doc(db, 'customers', customerId), newCustomer);
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
