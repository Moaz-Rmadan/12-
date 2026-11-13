import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEnrichedSearchOrders,
  buildSmartSearchCsv,
  computeSmartSearchAnalytics,
  DEFAULT_SMART_SEARCH_FILTERS,
  extractApproverName,
  filterAndSortSmartSearchOrders,
  getTimePresetRange,
  normalizeIsoDate,
} from '../utils/smartSearchEngine';
import { Customer, DeliveryReceiptRecord, JobOrderPopulated, TruckManifest } from '../types';

const customers: Customer[] = [
  {
    id: 'c-1',
    name: 'محمد جمال عثمان',
    phone: '01011223343',
    address: 'النزهة الجديدة',
  },
  {
    id: 'c-2',
    name: 'سلمى اشرف عبدالظاهر',
    phone: '01012345091',
    address: 'مدينة نصر',
  },
];

function makeOrder(overrides: Partial<JobOrderPopulated>): JobOrderPopulated {
  return {
    id: 'o-base',
    order_number: 'JO-2026-001',
    customer_id: 'c-1',
    room_model_code: 'شبابي ليدو',
    contract_date: '2026-10-01',
    delivery_date: '2026-11-10',
    general_specs: 'غرفة شبابي ليدو - يعتمد م/ بشير النجار',
    status: 'تسليم',
    total_price: 50000,
    deposit_paid: 50000,
    current_stage: 'جاهز للتسليم',
    is_archived: false,
    customer: customers[0],
    job_details: {
      id: 'd-base',
      job_order_id: 'o-base',
      dimensions_cm: '140x200',
      paint_details: 'كما بالمعرض',
      fabric_source: 'CHARM 8',
      color_code: 'CHARM-8',
      batch_number: 'B1',
      installation_notes: '',
    },
    ...overrides,
  };
}

const sampleReceipts: DeliveryReceiptRecord[] = [
  {
    id: 'dr-1',
    receipt_number: 'DR-2026-0001',
    customer_id: 'c-1',
    customer_name: 'محمد جمال عثمان',
    customer_phone: '01011223343',
    receipt_date: '2026-11-12',
    order_ids: ['o-1'],
    order_numbers: ['JO-2026-001'],
    items: [],
    total_contract_value: 50000,
    total_deposit_paid: 50000,
    remaining_balance: 0,
    delivery_branch: '84 جوزيف تيتو - النزهة الجديدة',
    created_at: '2026-11-12T10:00:00Z',
  },
];

const sampleManifests: TruckManifest[] = [
  {
    id: 'tm-1',
    tripDate: '2026/11/11',
    tripDay: 'الأربعاء',
    truckNumber: '1697',
    driverName: 'عصام',
    items: [
      {
        id: 'tmi-1',
        customerName: 'محمد جمال عثمان',
        qty: 1,
        itemName: 'نوم شبابي',
        specsDetails: 'تم التسليم',
        notes: '',
        salesperson: 'معاذ',
        orderId: 'o-1',
        itemType: 'delivery',
      },
      {
        id: 'tmi-ret',
        customerName: 'عميل صيانة',
        qty: 1,
        itemName: 'كمود ليدو',
        specsDetails: 'تعديل دهان',
        notes: '',
        salesperson: 'ورشة',
        itemType: 'return',
        returnReason: 'خدش أثناء النقل',
      },
    ],
  },
];

const sampleOrders: JobOrderPopulated[] = [
  // Delivered WITH receipt on 2026-11-12 (scheduled 2026-11-10 -> 2 days late, contract 2026-10-01 -> 42 days lead time)
  makeOrder({
    id: 'o-1',
    order_number: 'JO-2026-001',
    customer_id: 'c-1',
    customer: customers[0],
    room_model_code: 'شبابي ليدو',
    general_specs: 'غرفة شبابي ليدو - يعتمد: م/ بشير النجار',
    contract_date: '2026-10-01',
    delivery_date: '2026-11-10',
    delivered_at: '2026-11-12',
    delivery_receipt_id: 'dr-1',
    delivery_receipt_number: 'DR-2026-0001',
    status: 'تسليم',
    total_price: 50000,
    deposit_paid: 50000,
  }),
  // Delivered WITHOUT receipt and WITH unpaid balance in previous week (2026-11-04 <= 2026-11-05 -> on-time)
  makeOrder({
    id: 'o-2',
    order_number: 'JO-2026-002',
    customer_id: 'c-2',
    customer: customers[1],
    room_model_code: 'سفرة فرجينيا',
    general_specs: 'غرفة سفرة فرجينيا كاملة - يعتمد م/ محمد عبد الله',
    contract_date: '2026-10-05',
    delivery_date: '2026-11-05',
    delivered_at: '2026-11-04',
    status: 'تسليم',
    total_price: 80000,
    deposit_paid: 60000,
  }),
  // Ready unshipped ('تم التنفيذ') & overdue relative to 2026-11-13
  makeOrder({
    id: 'o-3',
    order_number: 'JO-2026-003',
    customer_id: 'c-2',
    customer: customers[1],
    room_model_code: 'انتريه كوين',
    general_specs: 'طقم انتريه كوين - إشراف م. مروان هلال',
    contract_date: '2026-10-15',
    delivery_date: '2026-11-08',
    status: 'تم التنفيذ',
    total_price: 40000,
    deposit_paid: 20000,
  }),
  // In progress, due later in November
  makeOrder({
    id: 'o-4',
    order_number: 'JO-2026-004',
    customer_id: 'c-1',
    customer: customers[0],
    room_model_code: 'نوم روما',
    general_specs: 'غرفة نوم روما ماستر - اعتماد م. محمود زايد',
    contract_date: '2026-11-02',
    delivery_date: '2026-11-28',
    status: 'قيد التشغيل',
    total_price: 120000,
    deposit_paid: 70000,
  }),
];

test('normalizeIsoDate parses YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, and ISO timestamps', () => {
  assert.equal(normalizeIsoDate('2026-11-13'), '2026-11-13');
  assert.equal(normalizeIsoDate('2026/3/4'), '2026-03-04');
  assert.equal(normalizeIsoDate('5/10/2026'), '2026-10-05');
  assert.equal(normalizeIsoDate('2026-11-13T14:22:00Z'), '2026-11-13');
  assert.equal(normalizeIsoDate('invalid'), '');
  assert.equal(normalizeIsoDate(''), '');
});

test('getTimePresetRange computes Saturday-start and Sunday-start factory weeks and comparison periods', () => {
  // 2026-11-13 is Friday
  const satWeek = getTimePresetRange('this_week', '2026-11-13', 'saturday');
  assert.ok(satWeek);
  assert.equal(satWeek.startDate, '2026-11-07');
  assert.equal(satWeek.endDate, '2026-11-13');
  assert.equal(satWeek.previousStartDate, '2026-10-31');
  assert.equal(satWeek.previousEndDate, '2026-11-06');

  const sunWeek = getTimePresetRange('this_week', '2026-11-13', 'sunday');
  assert.ok(sunWeek);
  assert.equal(sunWeek.startDate, '2026-11-08');
  assert.equal(sunWeek.endDate, '2026-11-14');

  const month = getTimePresetRange('this_month', '2026-11-13', 'saturday');
  assert.ok(month);
  assert.equal(month.startDate, '2026-11-01');
  assert.equal(month.endDate, '2026-11-30');
  assert.equal(month.previousStartDate, '2026-10-01');
  assert.equal(month.previousEndDate, '2026-10-31');
});

test('buildEnrichedSearchOrders resolves effective delivery date, approver, lead time, and audit flags', () => {
  assert.equal(extractApproverName(sampleOrders[0]), 'م/ بشير النجار');
  assert.equal(extractApproverName(sampleOrders[1]), 'م/ محمد عبد الله');

  const enriched = buildEnrichedSearchOrders({
    orders: sampleOrders,
    receipts: sampleReceipts,
    truckManifests: sampleManifests,
    referenceDateIso: '2026-11-13',
  });

  const o1 = enriched.find((e) => e.order.id === 'o-1')!;
  assert.equal(o1.effectiveDeliveryDate, '2026-11-12');
  assert.equal(o1.deliveryDateSource, 'receipt');
  assert.equal(o1.leadTimeDays, 42);
  assert.equal(o1.deliveryDelayDays, 2);
  assert.equal(o1.isOnTimeDelivered, false);
  assert.equal(o1.hasMissingReceiptAudit, false);
  assert.equal(o1.hasUnpaidDeliveryAudit, false);
  assert.equal(o1.category, 'youth_bedroom');

  const o2 = enriched.find((e) => e.order.id === 'o-2')!;
  assert.equal(o2.isOnTimeDelivered, true);
  assert.equal(o2.hasMissingReceiptAudit, true);
  assert.equal(o2.hasUnpaidDeliveryAudit, true);
  assert.equal(o2.remainingBalance, 20000);
  assert.equal(o2.category, 'dining_room');

  const o3 = enriched.find((e) => e.order.id === 'o-3')!;
  assert.equal(o3.isReadyUnshippedAudit, true);
  assert.equal(o3.isOverdueNow, true);
  assert.equal(o3.deliveryDelayDays, 5);
});

test('filterAndSortSmartSearchOrders and computeSmartSearchAnalytics support multi-axis time presets and comparisons', () => {
  const enriched = buildEnrichedSearchOrders({
    orders: sampleOrders,
    receipts: sampleReceipts,
    truckManifests: sampleManifests,
    referenceDateIso: '2026-11-13',
  });

  // Query: how many rooms were ACTUALLY delivered this week (2026-11-07 .. 2026-11-13)?
  const weekDeliveredFilters = {
    ...DEFAULT_SMART_SEARCH_FILTERS,
    dateAxis: 'actual_delivery' as const,
    timePreset: 'this_week' as const,
    weekStartsOn: 'saturday' as const,
  };
  const weekMatches = filterAndSortSmartSearchOrders({
    enrichedOrders: enriched,
    filters: weekDeliveredFilters,
    referenceDateIso: '2026-11-13',
  });
  assert.deepEqual(
    weekMatches.map((m) => m.order.id),
    ['o-1']
  );

  const weekAnalytics = computeSmartSearchAnalytics({
    matchedOrders: weekMatches,
    allEnrichedOrders: enriched,
    filters: weekDeliveredFilters,
    truckManifests: sampleManifests,
    customers,
    referenceDateIso: '2026-11-13',
  });
  assert.equal(weekAnalytics.totalCount, 1);
  assert.equal(weekAnalytics.previousPeriodCount, 1); // o-2 was delivered 2026-11-04 (last week)
  assert.equal(weekAnalytics.deltaCount, 0);
  assert.equal(weekAnalytics.returnsInPeriod.length, 1);
  assert.ok(weekAnalytics.customer360);
  assert.equal(weekAnalytics.customer360?.customerName, 'محمد جمال عثمان');

  // Query: combined contract date range + customer name
  const combinedFilters = {
    ...DEFAULT_SMART_SEARCH_FILTERS,
    query: 'سلمى',
    dateAxis: 'both' as const,
    timePreset: 'custom' as const,
    contractFrom: '2026-10-01',
    contractTo: '2026-10-10',
  };
  const combinedMatches = filterAndSortSmartSearchOrders({
    enrichedOrders: enriched,
    filters: combinedFilters,
    referenceDateIso: '2026-11-13',
  });
  assert.deepEqual(
    combinedMatches.map((m) => m.order.id),
    ['o-2']
  );

  // Query: all delivered in November 2026 -> checks on-time compliance & category breakdown
  const monthDeliveredFilters = {
    ...DEFAULT_SMART_SEARCH_FILTERS,
    dateAxis: 'actual_delivery' as const,
    timePreset: 'this_month' as const,
  };
  const monthMatches = filterAndSortSmartSearchOrders({
    enrichedOrders: enriched,
    filters: monthDeliveredFilters,
    referenceDateIso: '2026-11-13',
  });
  assert.deepEqual(
    monthMatches.map((m) => m.order.id),
    ['o-1', 'o-2']
  );

  const monthAnalytics = computeSmartSearchAnalytics({
    matchedOrders: monthMatches,
    allEnrichedOrders: enriched,
    filters: monthDeliveredFilters,
    truckManifests: sampleManifests,
    customers,
    referenceDateIso: '2026-11-13',
  });
  assert.equal(monthAnalytics.onTimeCount, 1);
  assert.equal(monthAnalytics.lateDeliveredCount, 1);
  assert.equal(monthAnalytics.onTimePercent, 50);
  assert.equal(monthAnalytics.missingReceiptCount, 1);
  assert.equal(monthAnalytics.deliveredWithBalanceCount, 1);
  assert.equal(monthAnalytics.customer360, null); // 2 different customers matched

  const csv = buildSmartSearchCsv(monthMatches);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('JO-2026-001'));
  assert.ok(csv.includes('DR-2026-0001'));
});

test('supports Arabic hamza/yaa normalization and custom contract-date filtering on active orders', () => {
  const enriched = buildEnrichedSearchOrders({
    orders: sampleOrders,
    receipts: sampleReceipts,
    truckManifests: sampleManifests,
    referenceDateIso: '2026-11-13',
  });

  // Search with variant Arabic spelling (سلمي vs سلمى) and custom contract range on default actual_delivery axis
  const matches = filterAndSortSmartSearchOrders({
    enrichedOrders: enriched,
    filters: {
      ...DEFAULT_SMART_SEARCH_FILTERS,
      query: 'سلمي',
      dateAxis: 'actual_delivery',
      timePreset: 'custom',
      contractFrom: '2026-10-01',
      contractTo: '2026-10-31',
    },
    referenceDateIso: '2026-11-13',
  });

  assert.deepEqual(
    matches.map((m) => m.order.id),
    ['o-3', 'o-2']
  );
});

