import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDeliveryClosureStatus,
  getOrderRemainingBalance,
  isActiveWorkshopOrder,
  isArchivedOrder,
  isDeliveredActiveOrder,
  partitionOrdersByLifecycle,
} from '../utils/orderLifecycle';
import { canAccessTab, isValidStatusTransition } from '../lib/permissions';
import { JobOrderPopulated } from '../types';
import { UserProfile } from '../types/auth';

function makeLifecycleOrder(overrides: Partial<JobOrderPopulated>): JobOrderPopulated {
  return {
    id: 'ord-1',
    order_number: 'JO-2026-100',
    customer_id: 'cust-1',
    room_model_code: 'نوم ماستر',
    contract_date: '2026-09-01',
    delivery_date: '2026-10-15',
    general_specs: 'غرفة نوم كاملة',
    status: 'قيد التشغيل',
    total_price: 80000,
    deposit_paid: 50000,
    current_stage: 'نجارة عفش',
    stage_updated_at: '2026-09-10T10:00:00Z',
    is_archived: false,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-10T10:00:00Z',
    ...overrides,
  };
}

const makeUser = (overrides: Partial<UserProfile>): UserProfile => ({
  uid: 'u-1',
  email: 'user@alnajjar.com',
  name: 'مستخدم',
  role: 'operations',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

test('lifecycle predicates separate active workshop, delivered, and archived orders cleanly', () => {
  const draftOrder = makeLifecycleOrder({ id: 'o-draft', status: 'Draft', is_archived: false });
  const inProgressOrder = makeLifecycleOrder({ id: 'o-run', status: 'قيد التشغيل', is_archived: false });
  const executedOrder = makeLifecycleOrder({ id: 'o-done', status: 'تم التنفيذ', is_archived: false });
  const deliveredOrder = makeLifecycleOrder({ id: 'o-del', status: 'تسليم', is_archived: false });
  const archivedDeliveredOrder = makeLifecycleOrder({ id: 'o-arch-del', status: 'تسليم', is_archived: true });
  const archivedExecutedOrder = makeLifecycleOrder({ id: 'o-arch-exec', status: 'تم التنفيذ', is_archived: true });

  assert.equal(isActiveWorkshopOrder(draftOrder), true);
  assert.equal(isActiveWorkshopOrder(inProgressOrder), true);
  assert.equal(isActiveWorkshopOrder(executedOrder), true);
  assert.equal(isActiveWorkshopOrder(deliveredOrder), false);
  assert.equal(isActiveWorkshopOrder(archivedDeliveredOrder), false);
  assert.equal(isActiveWorkshopOrder(archivedExecutedOrder), false);

  assert.equal(isDeliveredActiveOrder(deliveredOrder), true);
  assert.equal(isDeliveredActiveOrder(inProgressOrder), false);
  assert.equal(isDeliveredActiveOrder(archivedDeliveredOrder), false);

  assert.equal(isArchivedOrder(archivedDeliveredOrder), true);
  assert.equal(isArchivedOrder(deliveredOrder), false);
});

test('partitionOrdersByLifecycle removes delivered orders from active queue and identifies ready-to-archive closures', () => {
  const orders: JobOrderPopulated[] = [
    makeLifecycleOrder({ id: 'a1', status: 'Draft' }),
    makeLifecycleOrder({ id: 'a2', status: 'قيد التشغيل' }),
    makeLifecycleOrder({ id: 'a3', status: 'تم التنفيذ' }),
    makeLifecycleOrder({
      id: 'd-ready',
      status: 'تسليم',
      total_price: 50000,
      deposit_paid: 50000,
      delivery_receipt_number: 'DR-2026-0001',
      delivered_at: '2026-10-12',
    }),
    makeLifecycleOrder({
      id: 'd-unpaid',
      status: 'تسليم',
      total_price: 50000,
      deposit_paid: 30000,
      delivery_receipt_id: 'rec-2',
    }),
    makeLifecycleOrder({
      id: 'd-no-receipt',
      status: 'تسليم',
      total_price: 40000,
      deposit_paid: 40000,
    }),
    makeLifecycleOrder({
      id: 'arch-1',
      status: 'تسليم',
      is_archived: true,
    }),
  ];

  const partitioned = partitionOrdersByLifecycle(orders);

  assert.deepEqual(
    partitioned.activeOrders.map((o) => o.id),
    ['a1', 'a2', 'a3']
  );
  assert.deepEqual(
    partitioned.deliveredOrders.map((o) => o.id),
    ['d-ready', 'd-unpaid', 'd-no-receipt']
  );
  assert.deepEqual(
    partitioned.readyToArchiveOrders.map((o) => o.id),
    ['d-ready']
  );
  assert.deepEqual(
    partitioned.archivedOrders.map((o) => o.id),
    ['arch-1']
  );
});

test('getOrderRemainingBalance and getDeliveryClosureStatus compute financial settlement and receipt requirements', () => {
  assert.equal(getOrderRemainingBalance({ total_price: 60000, deposit_paid: 45000 }), 15000);
  assert.equal(getOrderRemainingBalance({ total_price: 60000, deposit_paid: 70000 }), 0);

  const unpaidNoReceipt = getDeliveryClosureStatus(
    makeLifecycleOrder({
      status: 'تسليم',
      total_price: 60000,
      deposit_paid: 40000,
      delivery_date: '2026-11-02',
    })
  );
  assert.equal(unpaidNoReceipt.remainingBalance, 20000);
  assert.equal(unpaidNoReceipt.isFinanciallySettled, false);
  assert.equal(unpaidNoReceipt.hasDeliveryReceipt, false);
  assert.equal(unpaidNoReceipt.isReadyToArchive, false);
  assert.deepEqual(unpaidNoReceipt.pendingRequirements, ['تحصيل باقي الحساب', 'إصدار إقرار استلام']);
  assert.equal(unpaidNoReceipt.deliveredDate, '2026-11-02');

  const settledWithReceipt = getDeliveryClosureStatus(
    makeLifecycleOrder({
      status: 'تسليم',
      total_price: 60000,
      deposit_paid: 60000,
      delivery_receipt_number: 'DR-2026-0010',
      delivered_at: '2026-11-04',
      delivery_date: '2026-11-02',
    })
  );
  assert.equal(settledWithReceipt.remainingBalance, 0);
  assert.equal(settledWithReceipt.isFinanciallySettled, true);
  assert.equal(settledWithReceipt.hasDeliveryReceipt, true);
  assert.equal(settledWithReceipt.isReadyToArchive, true);
  assert.deepEqual(settledWithReceipt.pendingRequirements, []);
  assert.equal(settledWithReceipt.deliveredDate, '2026-11-04');
});

test('RBAC grants deliveries & archive tab access and restricts return-from-delivery to admin or delegated manager', () => {
  const admin = makeUser({ role: 'admin' });
  const delegatedOps = makeUser({ role: 'operations', isDelegatedManager: true });
  const regularOps = makeUser({ role: 'operations', isDelegatedManager: false });
  const accounting = makeUser({ role: 'accounting' });
  const sales = makeUser({ role: 'sales' });

  for (const user of [admin, delegatedOps, regularOps, accounting, sales]) {
    assert.equal(canAccessTab(user, 'deliveries'), true);
    assert.equal(canAccessTab(user, 'archive'), true);
  }
  assert.equal(canAccessTab(null, 'deliveries'), false);
  assert.equal(canAccessTab(null, 'archive'), false);

  // Admin & delegated operations manager can revert a delivered order back to production
  assert.equal(isValidStatusTransition('تسليم', 'تم التنفيذ', admin).allowed, true);
  assert.equal(isValidStatusTransition('تسليم', 'قيد التشغيل', admin).allowed, true);
  assert.equal(isValidStatusTransition('تسليم', 'تم التنفيذ', delegatedOps).allowed, true);
  assert.equal(isValidStatusTransition('تسليم', 'قيد التشغيل', delegatedOps).allowed, true);

  // Regular operations, accounting, and sales cannot revert a delivered order
  assert.equal(isValidStatusTransition('تسليم', 'تم التنفيذ', regularOps).allowed, false);
  assert.equal(isValidStatusTransition('تسليم', 'تم التنفيذ', accounting).allowed, false);
  assert.equal(isValidStatusTransition('تسليم', 'قيد التشغيل', sales).allowed, false);

  // Reverting straight back to Draft is disallowed for everyone
  assert.equal(isValidStatusTransition('تسليم', 'Draft', admin).allowed, false);
});
