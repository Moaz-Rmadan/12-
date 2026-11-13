import {
  Customer,
  DeliveryReceiptRecord,
  JobOrderPopulated,
  OrderStatus,
  ProductionStage,
  TruckManifest,
} from '../types';
import {
  FURNITURE_CATEGORIES,
  FurnitureCategory,
  getOrderCategory,
} from './furnitureClassifier';

export type DateAxisMode =
  | 'actual_delivery'
  | 'scheduled_delivery'
  | 'contract_date'
  | 'both';

export type TimePresetId =
  | 'all'
  | 'today'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export type AuditFilterMode =
  | 'all'
  | 'missing_receipt'
  | 'delivered_with_balance'
  | 'ready_unshipped'
  | 'overdue_now'
  | 'on_time_only'
  | 'delayed_delivered';

export type SmartSortBy =
  | 'delivery_desc'
  | 'delivery_asc'
  | 'contract_desc'
  | 'price_desc'
  | 'remaining_desc'
  | 'delay_desc';

export type WeekStartDay = 'saturday' | 'sunday';

export interface SmartSearchFilters {
  query: string;
  dateAxis: DateAxisMode;
  timePreset: TimePresetId;
  weekStartsOn: WeekStartDay;
  contractFrom: string;
  contractTo: string;
  deliveryFrom: string;
  deliveryTo: string;
  status: 'all' | OrderStatus;
  stage: 'all' | ProductionStage;
  category: FurnitureCategory;
  approver: string;
  branch: string;
  auditMode: AuditFilterMode;
  includeArchived: boolean;
  sortBy: SmartSortBy;
}

export interface TimePresetRange {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  label: string;
}

export interface LinkedManifestSummary {
  manifestId: string;
  tripDate: string;
  truckNumber: string;
  driverName: string;
  itemType?: string;
}

export interface EnrichedSearchOrder {
  order: JobOrderPopulated;
  category: FurnitureCategory;
  categoryLabel: string;
  approver: string;
  branch: string;
  contractDate: string;
  scheduledDeliveryDate: string;
  effectiveDeliveryDate: string;
  deliveryDateSource: 'receipt' | 'manifest' | 'scheduled' | 'none';
  linkedReceipt?: DeliveryReceiptRecord;
  linkedManifest?: LinkedManifestSummary;
  remainingBalance: number;
  leadTimeDays: number | null;
  deliveryDelayDays: number | null;
  isOnTimeDelivered: boolean | null;
  isOverdueNow: boolean;
  hasMissingReceiptAudit: boolean;
  hasUnpaidDeliveryAudit: boolean;
  isReadyUnshippedAudit: boolean;
}

export interface CategoryBreakdownItem {
  category: FurnitureCategory;
  label: string;
  count: number;
  deliveredCount: number;
  totalValue: number;
}

export interface Customer360Summary {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  totalOrders: number;
  deliveredCount: number;
  inProgressCount: number;
  readyCount: number;
  receiptCount: number;
  totalValue: number;
  totalDeposit: number;
  remainingBalance: number;
}

export interface ReturnManifestEntry {
  manifestId: string;
  tripDate: string;
  truckNumber: string;
  driverName: string;
  customerName: string;
  itemName: string;
  qty: number;
  returnReason?: string;
  itemType?: string;
}

export interface SmartSearchAnalytics {
  totalCount: number;
  deliveredCount: number;
  deliveredWithReceiptCount: number;
  readyCount: number;
  inProgressCount: number;
  draftCount: number;
  totalValue: number;
  totalDeposit: number;
  remainingBalance: number;
  collectionPercent: number;
  categoryBreakdown: CategoryBreakdownItem[];
  onTimeCount: number;
  lateDeliveredCount: number;
  onTimePercent: number | null;
  avgDelayDays: number | null;
  avgLeadTimeDays: number | null;
  missingReceiptCount: number;
  deliveredWithBalanceCount: number;
  readyUnshippedCount: number;
  overdueNowCount: number;
  previousPeriodCount: number | null;
  previousPeriodValue: number | null;
  deltaCount: number | null;
  deltaPercent: number | null;
  returnsInPeriod: ReturnManifestEntry[];
  customer360: Customer360Summary | null;
}

export const DEFAULT_SMART_SEARCH_FILTERS: SmartSearchFilters = {
  query: '',
  dateAxis: 'actual_delivery',
  timePreset: 'all',
  weekStartsOn: 'saturday',
  contractFrom: '',
  contractTo: '',
  deliveryFrom: '',
  deliveryTo: '',
  status: 'all',
  stage: 'all',
  category: 'all',
  approver: 'all',
  branch: 'all',
  auditMode: 'all',
  includeArchived: false,
  sortBy: 'delivery_desc',
};

/**
 * Normalize various date strings (YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, ISO timestamps)
 * into clean YYYY-MM-DD format. Returns '' if invalid or empty.
 */
export function normalizeIsoDate(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // ISO timestamp or YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return '';
}

/**
 * Normalize Arabic characters for forgiving search (أ/إ/آ -> ا, ى -> ي, ة -> ه, remove diacritics)
 */
export function normalizeSearchText(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLocalDate(isoDate: string): Date | null {
  const norm = normalizeIsoDate(isoDate);
  if (!norm) return null;
  const [y, m, d] = norm.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function diffDaysBetween(fromIso: string, toIso: string): number | null {
  const d1 = parseLocalDate(fromIso);
  const d2 = parseLocalDate(toIso);
  if (!d1 || !d2) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

export function getTimePresetRange(
  preset: TimePresetId,
  referenceDateIso: string = formatLocalDate(new Date()),
  weekStartsOn: WeekStartDay = 'saturday'
): TimePresetRange | null {
  if (preset === 'all' || preset === 'custom') return null;

  const ref = parseLocalDate(referenceDateIso) || new Date();
  const todayIso = formatLocalDate(ref);

  if (preset === 'today') {
    const yesterday = formatLocalDate(addDays(ref, -1));
    return {
      startDate: todayIso,
      endDate: todayIso,
      previousStartDate: yesterday,
      previousEndDate: yesterday,
      label: 'اليوم',
    };
  }

  if (preset === 'this_week' || preset === 'last_week') {
    const targetStartDow = weekStartsOn === 'saturday' ? 6 : 0; // JS getDay: Sun=0..Sat=6
    const currentDow = ref.getDay();
    const daysSinceWeekStart = (currentDow - targetStartDow + 7) % 7;
    const thisWeekStart = addDays(ref, -daysSinceWeekStart);
    const thisWeekEnd = addDays(thisWeekStart, 6);

    if (preset === 'this_week') {
      const prevStart = addDays(thisWeekStart, -7);
      const prevEnd = addDays(thisWeekEnd, -7);
      return {
        startDate: formatLocalDate(thisWeekStart),
        endDate: formatLocalDate(thisWeekEnd),
        previousStartDate: formatLocalDate(prevStart),
        previousEndDate: formatLocalDate(prevEnd),
        label: 'هذا الأسبوع',
      };
    } else {
      const lastStart = addDays(thisWeekStart, -7);
      const lastEnd = addDays(thisWeekEnd, -7);
      const prevStart = addDays(lastStart, -7);
      const prevEnd = addDays(lastEnd, -7);
      return {
        startDate: formatLocalDate(lastStart),
        endDate: formatLocalDate(lastEnd),
        previousStartDate: formatLocalDate(prevStart),
        previousEndDate: formatLocalDate(prevEnd),
        label: 'الأسبوع الماضي',
      };
    }
  }

  if (preset === 'this_month') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 12);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12);
    const prevStart = new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 12);
    const prevEnd = new Date(ref.getFullYear(), ref.getMonth(), 0, 12);
    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
      previousStartDate: formatLocalDate(prevStart),
      previousEndDate: formatLocalDate(prevEnd),
      label: 'هذا الشهر',
    };
  }

  if (preset === 'last_month') {
    const start = new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 12);
    const end = new Date(ref.getFullYear(), ref.getMonth(), 0, 12);
    const prevStart = new Date(ref.getFullYear(), ref.getMonth() - 2, 1, 12);
    const prevEnd = new Date(ref.getFullYear(), ref.getMonth() - 1, 0, 12);
    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
      previousStartDate: formatLocalDate(prevStart),
      previousEndDate: formatLocalDate(prevEnd),
      label: 'الشهر الماضي',
    };
  }

  if (preset === 'this_quarter') {
    const q = Math.floor(ref.getMonth() / 3);
    const start = new Date(ref.getFullYear(), q * 3, 1, 12);
    const end = new Date(ref.getFullYear(), q * 3 + 3, 0, 12);
    const prevStart = new Date(ref.getFullYear(), (q - 1) * 3, 1, 12);
    const prevEnd = new Date(ref.getFullYear(), q * 3, 0, 12);
    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
      previousStartDate: formatLocalDate(prevStart),
      previousEndDate: formatLocalDate(prevEnd),
      label: 'هذا الربع',
    };
  }

  // this_year
  const start = new Date(ref.getFullYear(), 0, 1, 12);
  const end = new Date(ref.getFullYear(), 11, 31, 12);
  const prevStart = new Date(ref.getFullYear() - 1, 0, 1, 12);
  const prevEnd = new Date(ref.getFullYear() - 1, 11, 31, 12);
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    previousStartDate: formatLocalDate(prevStart),
    previousEndDate: formatLocalDate(prevEnd),
    label: `سنة ${ref.getFullYear()}`,
  };
}

const KNOWN_APPROVER_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /بشير\s*النجار/i, canonical: 'م/ بشير النجار' },
  { pattern: /وليد\s*النجار/i, canonical: 'م/ وليد النجار' },
  { pattern: /محمد\s*عبد\s*الله/i, canonical: 'م/ محمد عبد الله' },
  { pattern: /مروان\s*هلال/i, canonical: 'م/ مروان هلال' },
  { pattern: /محمود\s*زايد/i, canonical: 'م/ محمود زايد' },
  { pattern: /رانيا\s*النجار/i, canonical: 'م/ رانيا النجار' },
  { pattern: /معاذ\s*رمضان|معاذ/i, canonical: 'م/ معاذ رمضان' },
];

export function extractApproverName(order: JobOrderPopulated): string {
  const haystack = `${order.general_specs || ''} ${order.job_details?.installation_notes || ''}`;
  for (const { pattern, canonical } of KNOWN_APPROVER_PATTERNS) {
    if (pattern.test(haystack)) {
      return canonical;
    }
  }

  const explicitMatch = haystack.match(/(?:يعتمد|اعتماد|إشراف|اشراف|بأمر من|بامر من)\s*[:/\-]*\s*(?:م\.?|م\/|أ\.?)?\s*([^\n.،,()]{3,28})/);
  if (explicitMatch && explicitMatch[1]) {
    const cleaned = explicitMatch[1].trim();
    if (cleaned && !cleaned.includes('غير محدد')) {
      return cleaned;
    }
  }

  return 'غير محدد';
}

export function getCategoryDisplayLabel(category: FurnitureCategory): string {
  if (category === 'all') return 'الكل';
  if (category === 'other') return 'أخرى';
  return FURNITURE_CATEGORIES.find((c) => c.id === category)?.shortName || 'أخرى';
}

export function buildEnrichedSearchOrders(params: {
  orders: JobOrderPopulated[];
  receipts?: DeliveryReceiptRecord[];
  truckManifests?: TruckManifest[];
  referenceDateIso?: string;
}): EnrichedSearchOrder[] {
  const {
    orders,
    receipts = [],
    truckManifests = [],
    referenceDateIso = formatLocalDate(new Date()),
  } = params;

  const receiptById = new Map<string, DeliveryReceiptRecord>();
  const receiptByOrderId = new Map<string, DeliveryReceiptRecord>();

  for (const r of receipts) {
    receiptById.set(r.id, r);
    for (const oid of r.order_ids || []) {
      if (!receiptByOrderId.has(oid)) {
        receiptByOrderId.set(oid, r);
      }
    }
  }

  const manifestByOrderId = new Map<string, LinkedManifestSummary>();
  for (const m of truckManifests) {
    const tripIso = normalizeIsoDate(m.tripDate);
    for (const item of m.items || []) {
      if (item.orderId && !manifestByOrderId.has(item.orderId)) {
        manifestByOrderId.set(item.orderId, {
          manifestId: m.id,
          tripDate: tripIso || m.tripDate,
          truckNumber: m.truckNumber,
          driverName: m.driverName,
          itemType: item.itemType,
        });
      }
    }
  }

  return orders.map((order) => {
    const category = getOrderCategory(order);
    const categoryLabel = getCategoryDisplayLabel(category);
    const approver = extractApproverName(order);
    const contractDate = normalizeIsoDate(order.contract_date);
    const scheduledDeliveryDate = normalizeIsoDate(order.delivery_date);

    const linkedReceipt =
      (order.delivery_receipt_id ? receiptById.get(order.delivery_receipt_id) : undefined) ||
      receiptByOrderId.get(order.id);
    const linkedManifest = manifestByOrderId.get(order.id);

    const receiptDateIso = normalizeIsoDate(order.delivered_at || linkedReceipt?.receipt_date);
    const manifestDateIso = normalizeIsoDate(linkedManifest?.tripDate);

    let effectiveDeliveryDate = '';
    let deliveryDateSource: EnrichedSearchOrder['deliveryDateSource'] = 'none';

    if (receiptDateIso) {
      effectiveDeliveryDate = receiptDateIso;
      deliveryDateSource = 'receipt';
    } else if (order.status === 'تسليم' && manifestDateIso) {
      effectiveDeliveryDate = manifestDateIso;
      deliveryDateSource = 'manifest';
    } else if (scheduledDeliveryDate) {
      effectiveDeliveryDate = scheduledDeliveryDate;
      deliveryDateSource = 'scheduled';
    }

    const totalPrice = Number(order.total_price) || 0;
    const depositPaid = Number(order.deposit_paid) || 0;
    const remainingBalance = Math.max(0, totalPrice - depositPaid);

    const isDelivered = order.status === 'تسليم';
    const leadTimeDays =
      isDelivered && contractDate && effectiveDeliveryDate
        ? diffDaysBetween(contractDate, effectiveDeliveryDate)
        : null;

    let deliveryDelayDays: number | null = null;
    let isOnTimeDelivered: boolean | null = null;

    if (isDelivered && scheduledDeliveryDate && effectiveDeliveryDate) {
      const delay = diffDaysBetween(scheduledDeliveryDate, effectiveDeliveryDate);
      if (delay !== null) {
        deliveryDelayDays = delay;
        isOnTimeDelivered = delay <= 0;
      }
    }

    let isOverdueNow = false;
    if (!isDelivered && !order.is_archived && scheduledDeliveryDate) {
      const activeDelay = diffDaysBetween(scheduledDeliveryDate, referenceDateIso);
      if (activeDelay !== null && activeDelay > 0) {
        isOverdueNow = true;
        deliveryDelayDays = activeDelay;
      }
    }

    const branch =
      linkedReceipt?.delivery_branch?.trim() ||
      (order.customer?.address ? order.customer.address.trim() : '') ||
      'غير محدد';

    const hasMissingReceiptAudit =
      isDelivered && !order.delivery_receipt_id && !linkedReceipt;
    const hasUnpaidDeliveryAudit =
      (isDelivered || Boolean(linkedManifest)) && remainingBalance > 0;
    const isReadyUnshippedAudit =
      order.status === 'تم التنفيذ' && !linkedManifest && !order.is_archived;

    return {
      order,
      category,
      categoryLabel,
      approver,
      branch,
      contractDate,
      scheduledDeliveryDate,
      effectiveDeliveryDate,
      deliveryDateSource,
      linkedReceipt,
      linkedManifest,
      remainingBalance,
      leadTimeDays: leadTimeDays !== null && leadTimeDays >= 0 ? leadTimeDays : null,
      deliveryDelayDays,
      isOnTimeDelivered,
      isOverdueNow,
      hasMissingReceiptAudit,
      hasUnpaidDeliveryAudit,
      isReadyUnshippedAudit,
    };
  });
}

function isDateWithinRange(dateIso: string, fromIso: string, toIso: string): boolean {
  if (!fromIso && !toIso) return true;
  if (!dateIso) return false;
  if (fromIso && dateIso < fromIso) return false;
  if (toIso && dateIso > toIso) return false;
  return true;
}

export function resolveEffectiveDateRanges(
  filters: SmartSearchFilters,
  referenceDateIso?: string
): {
  contractFrom: string;
  contractTo: string;
  deliveryFrom: string;
  deliveryTo: string;
  presetRange: TimePresetRange | null;
} {
  const presetRange = getTimePresetRange(
    filters.timePreset,
    referenceDateIso,
    filters.weekStartsOn
  );

  let contractFrom = normalizeIsoDate(filters.contractFrom);
  let contractTo = normalizeIsoDate(filters.contractTo);
  let deliveryFrom = normalizeIsoDate(filters.deliveryFrom);
  let deliveryTo = normalizeIsoDate(filters.deliveryTo);

  if (presetRange) {
    if (filters.dateAxis === 'contract_date') {
      contractFrom = presetRange.startDate;
      contractTo = presetRange.endDate;
    } else if (filters.dateAxis === 'actual_delivery' || filters.dateAxis === 'scheduled_delivery') {
      deliveryFrom = presetRange.startDate;
      deliveryTo = presetRange.endDate;
    } else if (filters.dateAxis === 'both') {
      if (!contractFrom && !contractTo) {
        contractFrom = presetRange.startDate;
        contractTo = presetRange.endDate;
      }
      if (!deliveryFrom && !deliveryTo) {
        deliveryFrom = presetRange.startDate;
        deliveryTo = presetRange.endDate;
      }
    }
  }

  return { contractFrom, contractTo, deliveryFrom, deliveryTo, presetRange };
}

function matchesNonDateFilters(item: EnrichedSearchOrder, filters: SmartSearchFilters): boolean {
  const { order } = item;

  if (!filters.includeArchived && order.is_archived) {
    return false;
  }

  if (filters.status !== 'all' && order.status !== filters.status) {
    return false;
  }

  if (filters.stage !== 'all' && order.current_stage !== filters.stage) {
    return false;
  }

  if (filters.category !== 'all' && item.category !== filters.category) {
    return false;
  }

  if (filters.approver !== 'all' && item.approver !== filters.approver) {
    return false;
  }

  if (filters.branch !== 'all' && item.branch !== filters.branch) {
    return false;
  }

  if (filters.auditMode === 'missing_receipt' && !item.hasMissingReceiptAudit) return false;
  if (filters.auditMode === 'delivered_with_balance' && !item.hasUnpaidDeliveryAudit) return false;
  if (filters.auditMode === 'ready_unshipped' && !item.isReadyUnshippedAudit) return false;
  if (filters.auditMode === 'overdue_now' && !item.isOverdueNow) return false;
  if (filters.auditMode === 'on_time_only' && item.isOnTimeDelivered !== true) return false;
  if (filters.auditMode === 'delayed_delivered' && !(item.order.status === 'تسليم' && (item.deliveryDelayDays || 0) > 0)) {
    return false;
  }

  const q = normalizeSearchText(filters.query);
  if (q) {
    const searchable = normalizeSearchText(
      [
        order.order_number,
        order.room_model_code,
        order.general_specs,
        order.customer?.name,
        order.customer?.phone,
        order.customer?.address,
        order.delivery_receipt_number,
        item.linkedReceipt?.receipt_number,
        item.linkedManifest?.truckNumber,
        item.linkedManifest?.driverName,
        order.job_details?.paint_details,
        order.job_details?.fabric_source,
        order.job_details?.color_code,
        order.job_details?.wood_type,
        item.approver,
        item.categoryLabel,
      ]
        .filter(Boolean)
        .join(' ')
    );

    if (!searchable.includes(q)) {
      return false;
    }
  }

  return true;
}

function matchesDateRangeForItem(
  item: EnrichedSearchOrder,
  dateAxis: DateAxisMode,
  contractFrom: string,
  contractTo: string,
  deliveryFrom: string,
  deliveryTo: string
): boolean {
  const hasContractFilter = Boolean(contractFrom || contractTo);
  const hasDeliveryFilter = Boolean(deliveryFrom || deliveryTo);

  if (hasContractFilter && !isDateWithinRange(item.contractDate, contractFrom, contractTo)) {
    return false;
  }

  if (hasDeliveryFilter) {
    const targetDeliveryDate =
      dateAxis === 'scheduled_delivery'
        ? item.scheduledDeliveryDate
        : item.effectiveDeliveryDate;

    if (dateAxis === 'actual_delivery' && item.order.status !== 'تسليم') {
      return false;
    }

    if (!isDateWithinRange(targetDeliveryDate, deliveryFrom, deliveryTo)) {
      return false;
    }
  } else if (dateAxis === 'actual_delivery' && item.order.status !== 'تسليم') {
    // When user explicitly picks "التسليم الفعلي" even with a preset or active delivery axis,
    // keep delivered orders when a preset or delivery date filter is active; for 'all' preset, show all unless filtered.
    return true;
  }

  return true;
}

export function filterAndSortSmartSearchOrders(params: {
  enrichedOrders: EnrichedSearchOrder[];
  filters: SmartSearchFilters;
  referenceDateIso?: string;
}): EnrichedSearchOrder[] {
  const { enrichedOrders, filters, referenceDateIso } = params;
  const { contractFrom, contractTo, deliveryFrom, deliveryTo } = resolveEffectiveDateRanges(
    filters,
    referenceDateIso
  );

  const filtered = enrichedOrders.filter((item) => {
    if (!matchesNonDateFilters(item, filters)) return false;

    // Only enforce delivered status when an actual_delivery date range is active
    if (
      filters.dateAxis === 'actual_delivery' &&
      Boolean(deliveryFrom || deliveryTo) &&
      item.order.status !== 'تسليم'
    ) {
      return false;
    }

    return matchesDateRangeForItem(
      item,
      filters.dateAxis,
      contractFrom,
      contractTo,
      deliveryFrom,
      deliveryTo
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'delivery_asc':
        return (a.effectiveDeliveryDate || '9999-12-31').localeCompare(
          b.effectiveDeliveryDate || '9999-12-31'
        );
      case 'delivery_desc':
        return (b.effectiveDeliveryDate || '').localeCompare(a.effectiveDeliveryDate || '');
      case 'contract_desc':
        return (b.contractDate || '').localeCompare(a.contractDate || '');
      case 'price_desc':
        return (b.order.total_price || 0) - (a.order.total_price || 0);
      case 'remaining_desc':
        return b.remainingBalance - a.remainingBalance;
      case 'delay_desc':
        return (b.deliveryDelayDays ?? -9999) - (a.deliveryDelayDays ?? -9999);
      default:
        return 0;
    }
  });

  return sorted;
}

export function computeSmartSearchAnalytics(params: {
  matchedOrders: EnrichedSearchOrder[];
  allEnrichedOrders: EnrichedSearchOrder[];
  filters: SmartSearchFilters;
  truckManifests?: TruckManifest[];
  customers?: Customer[];
  referenceDateIso?: string;
}): SmartSearchAnalytics {
  const {
    matchedOrders,
    allEnrichedOrders,
    filters,
    truckManifests = [],
    customers = [],
    referenceDateIso,
  } = params;

  let deliveredCount = 0;
  let deliveredWithReceiptCount = 0;
  let readyCount = 0;
  let inProgressCount = 0;
  let draftCount = 0;
  let totalValue = 0;
  let totalDeposit = 0;
  let remainingBalance = 0;

  let onTimeCount = 0;
  let lateDeliveredCount = 0;
  let totalDelayDaysOnLate = 0;
  let totalLeadTimeDays = 0;
  let leadTimeSamples = 0;

  let missingReceiptCount = 0;
  let deliveredWithBalanceCount = 0;
  let readyUnshippedCount = 0;
  let overdueNowCount = 0;

  const categoryMap = new Map<FurnitureCategory, CategoryBreakdownItem>();

  for (const item of matchedOrders) {
    const { order } = item;
    const price = Number(order.total_price) || 0;
    const deposit = Number(order.deposit_paid) || 0;
    totalValue += price;
    totalDeposit += deposit;
    remainingBalance += item.remainingBalance;

    if (order.status === 'تسليم') {
      deliveredCount++;
      if (order.delivery_receipt_id || item.linkedReceipt) {
        deliveredWithReceiptCount++;
      }
    } else if (order.status === 'تم التنفيذ') {
      readyCount++;
    } else if (order.status === 'قيد التشغيل') {
      inProgressCount++;
    } else if (order.status === 'Draft') {
      draftCount++;
    }

    if (item.isOnTimeDelivered === true) onTimeCount++;
    if (item.isOnTimeDelivered === false) {
      lateDeliveredCount++;
      if (item.deliveryDelayDays && item.deliveryDelayDays > 0) {
        totalDelayDaysOnLate += item.deliveryDelayDays;
      }
    }
    if (item.leadTimeDays !== null) {
      totalLeadTimeDays += item.leadTimeDays;
      leadTimeSamples++;
    }

    if (item.hasMissingReceiptAudit) missingReceiptCount++;
    if (item.hasUnpaidDeliveryAudit) deliveredWithBalanceCount++;
    if (item.isReadyUnshippedAudit) readyUnshippedCount++;
    if (item.isOverdueNow) overdueNowCount++;

    const existingCat = categoryMap.get(item.category) || {
      category: item.category,
      label: item.categoryLabel,
      count: 0,
      deliveredCount: 0,
      totalValue: 0,
    };
    existingCat.count += 1;
    if (order.status === 'تسليم') existingCat.deliveredCount += 1;
    existingCat.totalValue += price;
    categoryMap.set(item.category, existingCat);
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

  const complianceTotal = onTimeCount + lateDeliveredCount;
  const onTimePercent =
    complianceTotal > 0 ? Math.round((onTimeCount / complianceTotal) * 100) : null;
  const avgDelayDays =
    lateDeliveredCount > 0 ? Math.round((totalDelayDaysOnLate / lateDeliveredCount) * 10) / 10 : null;
  const avgLeadTimeDays =
    leadTimeSamples > 0 ? Math.round((totalLeadTimeDays / leadTimeSamples) * 10) / 10 : null;

  const collectionPercent =
    totalValue > 0 ? Math.round((totalDeposit / totalValue) * 100) : 0;

  // Period-over-period comparison
  const { presetRange, deliveryFrom, deliveryTo, contractFrom, contractTo } =
    resolveEffectiveDateRanges(filters, referenceDateIso);

  let previousPeriodCount: number | null = null;
  let previousPeriodValue: number | null = null;
  let deltaCount: number | null = null;
  let deltaPercent: number | null = null;

  if (presetRange) {
    const prevOrders = allEnrichedOrders.filter((item) => {
      if (!matchesNonDateFilters(item, filters)) return false;
      if (filters.dateAxis === 'actual_delivery' && item.order.status !== 'تسليم') {
        return false;
      }
      if (filters.dateAxis === 'contract_date') {
        return isDateWithinRange(
          item.contractDate,
          presetRange.previousStartDate,
          presetRange.previousEndDate
        );
      }
      if (filters.dateAxis === 'both') {
        return (
          isDateWithinRange(
            item.contractDate,
            presetRange.previousStartDate,
            presetRange.previousEndDate
          ) &&
          isDateWithinRange(
            item.effectiveDeliveryDate,
            presetRange.previousStartDate,
            presetRange.previousEndDate
          )
        );
      }
      const targetDate =
        filters.dateAxis === 'scheduled_delivery'
          ? item.scheduledDeliveryDate
          : item.effectiveDeliveryDate;
      return isDateWithinRange(
        targetDate,
        presetRange.previousStartDate,
        presetRange.previousEndDate
      );
    });

    previousPeriodCount = prevOrders.length;
    previousPeriodValue = prevOrders.reduce((s, o) => s + (Number(o.order.total_price) || 0), 0);
    deltaCount = matchedOrders.length - previousPeriodCount;
    deltaPercent =
      previousPeriodCount > 0
        ? Math.round(((matchedOrders.length - previousPeriodCount) / previousPeriodCount) * 100)
        : matchedOrders.length > 0
        ? 100
        : 0;
  }

  // Returns / maintenance / accessories in selected date window
  const returnRangeStart = deliveryFrom || contractFrom;
  const returnRangeEnd = deliveryTo || contractTo;
  const returnsInPeriod: ReturnManifestEntry[] = [];
  const qLower = filters.query.trim().toLowerCase();

  for (const m of truckManifests) {
    const tripIso = normalizeIsoDate(m.tripDate);
    if ((returnRangeStart || returnRangeEnd) && !isDateWithinRange(tripIso, returnRangeStart, returnRangeEnd)) {
      continue;
    }
    for (const item of m.items || []) {
      if (item.itemType !== 'return' && item.itemType !== 'accessories') continue;
      if (qLower) {
        const text = `${item.customerName} ${item.itemName} ${item.specsDetails} ${item.returnReason || ''}`.toLowerCase();
        if (!text.includes(qLower)) continue;
      }
      returnsInPeriod.push({
        manifestId: m.id,
        tripDate: tripIso || m.tripDate,
        truckNumber: m.truckNumber,
        driverName: m.driverName,
        customerName: item.customerName,
        itemName: item.itemName,
        qty: item.qty || 1,
        returnReason: item.returnReason,
        itemType: item.itemType,
      });
    }
  }

  // Customer 360 summary when matched orders belong to a single customer
  let customer360: Customer360Summary | null = null;
  if (matchedOrders.length > 0) {
    const uniqueCustIds = new Set(matchedOrders.map((m) => m.order.customer_id).filter(Boolean));
    if (uniqueCustIds.size === 1) {
      const custId = Array.from(uniqueCustIds)[0];
      const custRecord =
        customers.find((c) => c.id === custId) || matchedOrders[0].order.customer;
      const receiptIds = new Set(
        matchedOrders
          .map((m) => m.order.delivery_receipt_id || m.linkedReceipt?.id)
          .filter(Boolean)
      );
      customer360 = {
        customerId: custId,
        customerName: custRecord?.name || 'غير مسجل',
        customerPhone: custRecord?.phone || '---',
        customerAddress: custRecord?.address || '---',
        totalOrders: matchedOrders.length,
        deliveredCount,
        inProgressCount,
        readyCount,
        receiptCount: receiptIds.size,
        totalValue,
        totalDeposit,
        remainingBalance,
      };
    }
  }

  return {
    totalCount: matchedOrders.length,
    deliveredCount,
    deliveredWithReceiptCount,
    readyCount,
    inProgressCount,
    draftCount,
    totalValue,
    totalDeposit,
    remainingBalance,
    collectionPercent,
    categoryBreakdown,
    onTimeCount,
    lateDeliveredCount,
    onTimePercent,
    avgDelayDays,
    avgLeadTimeDays,
    missingReceiptCount,
    deliveredWithBalanceCount,
    readyUnshippedCount,
    overdueNowCount,
    previousPeriodCount,
    previousPeriodValue,
    deltaCount,
    deltaPercent,
    returnsInPeriod,
    customer360,
  };
}

function escapeCsvCell(val: string | number | undefined | null): string {
  const s = String(val ?? '');
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildSmartSearchCsv(matchedOrders: EnrichedSearchOrder[]): string {
  const headers = [
    'رقم أمر الشغل',
    'العميل',
    'الهاتف',
    'التصنيف',
    'كود الغرفة / الموديل',
    'تاريخ التعاقد',
    'موعد التسليم بالعقد',
    'تاريخ التسليم الفعلي',
    'الحالة',
    'مرحلة الورشة',
    'رقم إقرار الاستلام',
    'رقم العربية / السائق',
    'إجمالي التعاقد',
    'المدفوع',
    'المتبقي',
    'المهندس / المعتمد',
  ];

  const rows = matchedOrders.map((item) => {
    const o = item.order;
    const truckText = item.linkedManifest
      ? `${item.linkedManifest.truckNumber} (${item.linkedManifest.driverName})`
      : '';
    return [
      o.order_number,
      o.customer?.name || '',
      o.customer?.phone || '',
      item.categoryLabel,
      o.room_model_code,
      item.contractDate,
      item.scheduledDeliveryDate,
      o.status === 'تسليم' ? item.effectiveDeliveryDate : '',
      o.status === 'Draft' ? 'مسودة' : o.status,
      o.current_stage || '',
      o.delivery_receipt_number || item.linkedReceipt?.receipt_number || '',
      truckText,
      o.total_price || 0,
      o.deposit_paid || 0,
      item.remainingBalance,
      item.approver,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  // UTF-8 BOM so Microsoft Excel opens Arabic properly
  return '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}
