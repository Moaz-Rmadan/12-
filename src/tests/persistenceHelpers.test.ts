import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFullOrderPatchDocument,
  clearLocalWorkspaceState,
  loadLocalWorkspaceState,
  loadPersistedDemoSessionFlag,
  saveLocalWorkspaceState,
  savePersistedDemoSessionFlag,
  stripUndefinedDeep,
  StorageLike,
} from '../utils/persistenceHelpers';
import { JobOrderPopulated } from '../types';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

const sampleOrder: JobOrderPopulated = {
  id: 'ord-test-1',
  order_number: 'JO-2026-9001',
  customer_id: 'cust-1',
  room_model_code: 'RM-01',
  contract_date: '2026-11-01',
  delivery_date: '2026-11-20',
  general_specs: 'غرفة نوم كاملة',
  status: 'تم التنفيذ',
  current_stage: 'تشطيب وتغليف',
  total_price: 50000,
  deposit_paid: 20000,
  is_archived: false,
  customer: {
    id: 'cust-1',
    name: 'عميل تجريبي',
    phone: '01012345678',
    address: 'القاهرة',
  },
  job_details: {
    id: 'det-1',
    job_order_id: 'ord-test-1',
    dimensions_cm: '200x200',
    wood_type: 'زان',
    paint_details: 'أستر',
    fabric_source: 'كتان',
    color_code: 'C-1',
    batch_number: 'B-1',
    installation_notes: 'بدون ملاحظات',
    created_at: undefined,
  },
  attachments: [],
};

test('stripUndefinedDeep removes undefined object keys recursively without touching valid fields', () => {
  const input = {
    a: 'ok',
    b: undefined,
    nested: {
      c: 123,
      d: undefined,
    },
    arr: [1, undefined, { x: undefined, y: true }],
  };
  const cleaned = stripUndefinedDeep(input) as Record<string, any>;
  assert.equal('b' in cleaned, false);
  assert.equal(cleaned.a, 'ok');
  assert.equal('d' in cleaned.nested, false);
  assert.equal(cleaned.nested.c, 123);
  assert.equal(cleaned.arr[1], null);
  assert.equal('x' in cleaned.arr[2], false);
  assert.equal(cleaned.arr[2].y, true);
});

test('buildFullOrderPatchDocument produces complete order document with status/archive patches and no undefined values', () => {
  const docPayload = buildFullOrderPatchDocument(sampleOrder, {
    status: 'تسليم',
    is_archived: true,
    delivered_at: '2026-11-17',
  });

  assert.equal(docPayload.id, 'ord-test-1');
  assert.equal(docPayload.order_number, 'JO-2026-9001');
  assert.equal(docPayload.status, 'تسليم');
  assert.equal(docPayload.is_archived, true);
  assert.equal(docPayload.delivered_at, '2026-11-17');
  assert.equal('created_at' in (docPayload.job_details as Record<string, unknown>), false);
});

test('local workspace persistence preserves delivered, archived, receipt, and manifest state across simulated reload', () => {
  const memStorage = createMemoryStorage();

  const modifiedOrder: JobOrderPopulated = {
    ...sampleOrder,
    status: 'تسليم',
    is_archived: true,
    delivery_receipt_id: 'dr-1',
    delivery_receipt_number: 'DR-2026-0001',
    delivered_at: '2026-11-17',
  };

  const saved = saveLocalWorkspaceState(
    {
      orders: [modifiedOrder],
      customers: [sampleOrder.customer!],
      truckManifests: [
        {
          id: 'man-1',
          tripDate: '2026/11/17',
          tripDay: 'الثلاثاء',
          driverName: 'عصام',
          truckNumber: '4455',
          items: [],
        },
      ],
      deliveryReceipts: [
        {
          id: 'dr-1',
          receipt_number: 'DR-2026-0001',
          customer_id: 'cust-1',
          customer_name: 'عميل تجريبي',
          customer_phone: '01012345678',
          receipt_date: '2026-11-17',
          order_ids: ['ord-test-1'],
          order_numbers: ['JO-2026-9001'],
          items: [],
          total_contract_value: 50000,
          total_deposit_paid: 20000,
          remaining_balance: 30000,
          mark_orders_delivered: true,
          created_at: '2026-11-17T10:00:00Z',
          updated_at: '2026-11-17T10:00:00Z',
        },
      ],
    },
    memStorage
  );
  assert.equal(saved, true);

  // Simulate page refresh by loading with defaults
  const reloaded = loadLocalWorkspaceState(
    {
      orders: [sampleOrder],
      customers: [],
      truckManifests: [],
      deliveryReceipts: [],
    },
    memStorage
  );

  assert.equal(reloaded.orders.length, 1);
  assert.equal(reloaded.orders[0].status, 'تسليم');
  assert.equal(reloaded.orders[0].is_archived, true);
  assert.equal(reloaded.deliveryReceipts.length, 1);
  assert.equal(reloaded.deliveryReceipts[0].receipt_number, 'DR-2026-0001');
  assert.equal(reloaded.truckManifests.length, 1);
  assert.equal(reloaded.truckManifests[0].truckNumber, '4455');

  savePersistedDemoSessionFlag(true, memStorage);
  assert.equal(loadPersistedDemoSessionFlag(memStorage), true);

  savePersistedDemoSessionFlag(false, memStorage);
  clearLocalWorkspaceState(memStorage);
  assert.equal(loadPersistedDemoSessionFlag(memStorage), false);
});
