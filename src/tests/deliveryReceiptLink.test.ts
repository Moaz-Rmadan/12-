import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeliveryReceiptRecord,
  computeReceiptFinancialSummary,
  generateNextDeliveryReceiptNumber,
  getCustomerOrdersForReceipt,
  planOrderReceiptLinksAndDeliveryTransitions,
  resolveInitialReceiptSelection,
} from '../utils/deliveryReceiptLink';
import { Customer, DeliveryReceiptRecord, JobOrderPopulated } from '../types';
import { UserProfile } from '../types/auth';

const customers: Customer[] = [
  {
    id: 'cust-1',
    name: 'محمد جمال عثمان',
    phone: '01001112223',
    address: 'النزهة',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'cust-2',
    name: 'سلمى أشرف',
    phone: '01009998887',
    address: 'مدينة نصر',
    created_at: '2026-08-02T00:00:00Z',
  },
  {
    id: 'cust-empty-phone',
    name: 'عميل بدون هاتف',
    phone: '',
    address: 'مصر الجديدة',
    created_at: '2026-08-03T00:00:00Z',
  },
];

function makeOrder(overrides: Partial<JobOrderPopulated>): JobOrderPopulated {
  return {
    id: 'ord-1',
    order_number: 'JO-2026-001',
    customer_id: 'cust-1',
    room_model_code: 'شبابي ليدو',
    contract_date: '2026-08-23',
    delivery_date: '2026-10-05',
    general_specs: 'غرفة شبابي ليدو',
    status: 'تم التنفيذ',
    total_price: 50000,
    deposit_paid: 30000,
    current_stage: 'جاهز للتسليم',
    stage_updated_at: '2026-09-20T10:00:00Z',
    is_archived: false,
    created_at: '2026-08-23T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
    customer: customers[0],
    job_details: {
      id: 'det-1',
      job_order_id: 'ord-1',
      paint_details: 'كما بالمعرض',
      fabric_source: 'كارتلة 8',
      dimensions_cm: 'سرير 140 سم',
      color_code: 'CHARM-08',
      batch_number: 'BATCH-2026-01',
      installation_notes: 'تركيب كامل',
    },
    ...overrides,
  };
}

const sampleOrders: JobOrderPopulated[] = [
  makeOrder({
    id: 'ord-mgm-1',
    order_number: 'JO-2026-MGM-01',
    customer_id: 'cust-1',
    status: 'تم التنفيذ',
    total_price: 45000,
    deposit_paid: 45000,
    customer: customers[0],
  }),
  makeOrder({
    id: 'ord-mgm-2',
    order_number: 'JO-2026-MGM-02',
    customer_id: 'cust-1',
    status: 'قيد التشغيل',
    current_stage: 'كابينة أستر',
    total_price: 45000,
    deposit_paid: 20000,
    customer: customers[0],
  }),
  makeOrder({
    id: 'ord-mgm-draft',
    order_number: 'JO-2026-MGM-03',
    customer_id: 'cust-1',
    status: 'Draft',
    current_stage: 'لم يبدأ',
    total_price: 15000,
    deposit_paid: 5000,
    customer: customers[0],
  }),
  makeOrder({
    id: 'ord-mgm-archived',
    order_number: 'JO-2026-MGM-ARCH',
    customer_id: 'cust-1',
    status: 'تسليم',
    is_archived: true,
    customer: customers[0],
  }),
  makeOrder({
    id: 'ord-sal-1',
    order_number: 'JO-2026-SAL-01',
    customer_id: 'cust-2',
    status: 'تم التنفيذ',
    total_price: 60000,
    deposit_paid: 50000,
    customer: customers[1],
  }),
  makeOrder({
    id: 'ord-empty-phone',
    order_number: 'JO-2026-EMPTY-01',
    customer_id: 'cust-empty-phone',
    status: 'تم التنفيذ',
    customer: customers[2],
  }),
];

const adminUser: UserProfile = {
  uid: 'u-admin',
  email: 'admin@alnajjar.com',
  name: 'م. معاذ',
  role: 'admin',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const salesUser: UserProfile = {
  uid: 'u-sales',
  email: 'sales@alnajjar.com',
  name: 'أحمد مبيعات',
  role: 'sales',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

test('getCustomerOrdersForReceipt filters strictly by customer and excludes archived unless targeted', () => {
  const cust1Orders = getCustomerOrdersForReceipt(sampleOrders, customers[0]);
  assert.deepEqual(
    cust1Orders.map((o) => o.id),
    ['ord-mgm-1', 'ord-mgm-2', 'ord-mgm-draft']
  );

  // Explicitly targeting an archived order keeps it included
  const cust1WithArchived = getCustomerOrdersForReceipt(sampleOrders, customers[0], 'ord-mgm-archived');
  assert.ok(cust1WithArchived.some((o) => o.id === 'ord-mgm-archived'));

  // Empty phone on customer does not leak orders from other customers
  const emptyPhoneOrders = getCustomerOrdersForReceipt(sampleOrders, customers[2]);
  assert.deepEqual(
    emptyPhoneOrders.map((o) => o.id),
    ['ord-empty-phone']
  );
});

test('resolveInitialReceiptSelection prioritizes initialOrderId and isolates that single order', () => {
  const byOrder = resolveInitialReceiptSelection({
    orders: sampleOrders,
    customers,
    initialCustomerId: 'cust-2',
    initialOrderId: 'ord-mgm-2',
  });

  assert.equal(byOrder.customerId, 'cust-1');
  assert.deepEqual(byOrder.selectedOrderIds, ['ord-mgm-2']);
  assert.equal(byOrder.targetOrder?.order_number, 'JO-2026-MGM-02');
});

test('resolveInitialReceiptSelection falls back to initialCustomerId with non-Draft orders selected', () => {
  const byCustomer = resolveInitialReceiptSelection({
    orders: sampleOrders,
    customers,
    initialCustomerId: 'cust-1',
  });

  assert.equal(byCustomer.customerId, 'cust-1');
  assert.deepEqual(byCustomer.selectedOrderIds, ['ord-mgm-1', 'ord-mgm-2']);
  assert.equal(byCustomer.targetOrder, null);
});

test('generateNextDeliveryReceiptNumber produces sequential DR-YYYY-NNNN IDs per year', () => {
  assert.equal(generateNextDeliveryReceiptNumber([], 2026), 'DR-2026-0001');

  const existing: DeliveryReceiptRecord[] = [
    {
      id: 'dr-1',
      receipt_number: 'DR-2025-0099',
      customer_id: 'cust-1',
      customer_name: 'عميل',
      customer_phone: '0100',
      receipt_date: '2025-12-31',
      order_ids: ['o1'],
      order_numbers: ['JO-1'],
      items: [],
      total_contract_value: 1000,
      total_deposit_paid: 1000,
      remaining_balance: 0,
      issued_by_name: 'admin',
      mark_orders_delivered: true,
      created_at: '2025-12-31T00:00:00Z',
      updated_at: '2025-12-31T00:00:00Z',
    },
    {
      id: 'dr-2',
      receipt_number: 'DR-2026-0004',
      customer_id: 'cust-1',
      customer_name: 'عميل',
      customer_phone: '0100',
      receipt_date: '2026-10-01',
      order_ids: ['o2'],
      order_numbers: ['JO-2'],
      items: [],
      total_contract_value: 1000,
      total_deposit_paid: 1000,
      remaining_balance: 0,
      issued_by_name: 'admin',
      mark_orders_delivered: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  assert.equal(generateNextDeliveryReceiptNumber(existing, 2026), 'DR-2026-0005');
});

test('computeReceiptFinancialSummary and buildDeliveryReceiptRecord validate inputs and snapshot financials', () => {
  const selected = sampleOrders.filter((o) => ['ord-mgm-1', 'ord-mgm-2', 'ord-mgm-draft'].includes(o.id));
  const summary = computeReceiptFinancialSummary(selected);

  assert.equal(summary.totalValue, 105000);
  assert.equal(summary.totalDeposit, 70000);
  assert.equal(summary.remainingBalance, 35000);
  assert.equal(summary.isFullyPaid, false);
  assert.deepEqual(summary.draftOrderIds, ['ord-mgm-draft']);
  assert.deepEqual(summary.readyToDeliverOrderIds, ['ord-mgm-1']);

  assert.throws(() =>
    buildDeliveryReceiptRecord({
      receiptNumber: 'DR-2026-0001',
      customer: null,
      selectedOrders: selected,
      receiptDate: '2026-10-05',
    })
  );

  assert.throws(() =>
    buildDeliveryReceiptRecord({
      receiptNumber: 'DR-2026-0001',
      customer: customers[0],
      selectedOrders: [],
      receiptDate: '2026-10-05',
    })
  );

  const record = buildDeliveryReceiptRecord({
    id: 'dr-fixed',
    receiptNumber: 'DR-2026-0001',
    customer: customers[0],
    selectedOrders: [sampleOrders[0], sampleOrders[1]],
    receiptDate: '2026-10-05',
    notes: 'استلام كامل بدون ملاحظات',
    deliveryBranch: '84 جوزيف تيتو - النزهة الجديدة',
    userProfile: adminUser,
    markOrdersDelivered: true,
    nowIso: '2026-10-05T12:00:00.000Z',
  });

  assert.equal(record.id, 'dr-fixed');
  assert.equal(record.total_contract_value, 90000);
  assert.equal(record.total_deposit_paid, 65000);
  assert.equal(record.remaining_balance, 25000);
  assert.equal(record.items.length, 2);
  assert.deepEqual(record.order_numbers, ['JO-2026-MGM-01', 'JO-2026-MGM-02']);
});

test('planOrderReceiptLinksAndDeliveryTransitions enforces RBAC and only transitions تم التنفيذ orders', () => {
  const selected = [sampleOrders[0], sampleOrders[1], sampleOrders[2]]; // تم التنفيذ, قيد التشغيل, Draft
  const receiptRecord = buildDeliveryReceiptRecord({
    id: 'dr-test-1',
    receiptNumber: 'DR-2026-0001',
    customer: customers[0],
    selectedOrders: selected,
    receiptDate: '2026-10-05',
    userProfile: adminUser,
    markOrdersDelivered: true,
    nowIso: '2026-10-05T12:00:00.000Z',
  });

  // Admin transitions ONLY 'تم التنفيذ' -> 'تسليم', while linking all 3 orders
  const adminPlan = planOrderReceiptLinksAndDeliveryTransitions({
    selectedOrders: selected,
    receiptRecord,
    markAsDelivered: true,
    userProfile: adminUser,
    nowIso: '2026-10-05T12:00:00.000Z',
  });

  assert.equal(adminPlan.orderUpdates.length, 3);
  assert.deepEqual(adminPlan.transitionedOrderIds, ['ord-mgm-1']);
  assert.equal(adminPlan.skippedStatusTransitions.length, 2);
  assert.equal(adminPlan.orderUpdates[0].updates.status, 'تسليم');
  assert.equal(adminPlan.orderUpdates[0].updates.current_stage, 'جاهز للتسليم');
  assert.equal(adminPlan.orderUpdates[0].updates.delivery_receipt_number, 'DR-2026-0001');
  assert.equal(adminPlan.orderUpdates[1].updates.status, undefined);
  assert.equal(adminPlan.orderUpdates[1].updates.delivery_receipt_id, 'dr-test-1');

  // Sales user cannot transition status even on 'تم التنفيذ', but receipt link still stamps
  const salesPlan = planOrderReceiptLinksAndDeliveryTransitions({
    selectedOrders: [sampleOrders[0]],
    receiptRecord,
    markAsDelivered: true,
    userProfile: salesUser,
    nowIso: '2026-10-05T12:00:00.000Z',
  });

  assert.deepEqual(salesPlan.transitionedOrderIds, []);
  assert.equal(salesPlan.skippedStatusTransitions.length, 1);
  assert.equal(salesPlan.orderUpdates[0].updates.status, undefined);
  assert.equal(salesPlan.orderUpdates[0].updates.delivery_receipt_number, 'DR-2026-0001');
});
