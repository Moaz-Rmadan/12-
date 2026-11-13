import {
  Customer,
  DeliveryReceiptItemSnapshot,
  DeliveryReceiptRecord,
  JobOrderPopulated,
  OrderStatus,
  ProductionStage,
} from '../types';
import { UserProfile } from '../types/auth';
import { isValidStatusTransition } from '../lib/permissions';

export interface InitialReceiptSelection {
  customerId: string;
  selectedOrderIds: string[];
  targetOrder: JobOrderPopulated | null;
}

export interface ReceiptFinancialSummary {
  totalValue: number;
  totalDeposit: number;
  remainingBalance: number;
  isFullyPaid: boolean;
  draftOrderIds: string[];
  readyToDeliverOrderIds: string[];
  alreadyLinkedOrderNumbers: string[];
}

export interface PlannedOrderReceiptUpdate {
  orderId: string;
  orderNumber: string;
  updates: {
    delivery_receipt_id: string;
    delivery_receipt_number: string;
    delivered_at: string;
    updated_at: string;
    status?: OrderStatus;
    current_stage?: ProductionStage;
    stage_updated_at?: string;
  };
}

export interface SkippedStatusTransition {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  reason: string;
}

export function getCustomerOrdersForReceipt(
  orders: JobOrderPopulated[],
  customer: Customer | null | undefined,
  includeArchivedForOrderId?: string
): JobOrderPopulated[] {
  if (!customer) return [];
  const normalizedPhone = (customer.phone || '').trim();

  return orders.filter((o) => {
    if (o.is_archived && o.id !== includeArchivedForOrderId) {
      return false;
    }
    if (o.customer_id === customer.id) {
      return true;
    }
    if (
      normalizedPhone &&
      o.customer?.phone &&
      o.customer.phone.trim() === normalizedPhone
    ) {
      return true;
    }
    return false;
  });
}

export function resolveInitialReceiptSelection(params: {
  orders: JobOrderPopulated[];
  customers: Customer[];
  initialCustomerId?: string;
  initialOrderId?: string;
}): InitialReceiptSelection {
  const { orders, customers, initialCustomerId, initialOrderId } = params;

  if (initialOrderId) {
    const targetOrder = orders.find((o) => o.id === initialOrderId) || null;
    if (targetOrder) {
      const matchedCustomer =
        customers.find((c) => c.id === targetOrder.customer_id) ||
        (targetOrder.customer?.phone
          ? customers.find((c) => c.phone.trim() === targetOrder.customer?.phone?.trim())
          : undefined) ||
        null;

      return {
        customerId: matchedCustomer?.id || targetOrder.customer_id,
        selectedOrderIds: [targetOrder.id],
        targetOrder,
      };
    }
  }

  const resolvedCustomer =
    (initialCustomerId ? customers.find((c) => c.id === initialCustomerId) : undefined) ||
    customers[0] ||
    null;

  if (!resolvedCustomer) {
    return {
      customerId: '',
      selectedOrderIds: [],
      targetOrder: null,
    };
  }

  const custOrders = getCustomerOrdersForReceipt(orders, resolvedCustomer);
  const nonDraftOrders = custOrders.filter((o) => o.status !== 'Draft');
  const defaultSelected = nonDraftOrders.length > 0 ? nonDraftOrders : custOrders;

  return {
    customerId: resolvedCustomer.id,
    selectedOrderIds: defaultSelected.map((o) => o.id),
    targetOrder: null,
  };
}

export function generateNextDeliveryReceiptNumber(
  existingReceipts: DeliveryReceiptRecord[],
  year: number = new Date().getFullYear()
): string {
  const prefix = `DR-${year}-`;
  let maxSeq = 0;

  for (const r of existingReceipts) {
    const num = (r.receipt_number || '').trim();
    if (!num.startsWith(prefix)) continue;
    const suffix = num.slice(prefix.length);
    const parsed = Number.parseInt(suffix, 10);
    if (Number.isFinite(parsed) && parsed > maxSeq) {
      maxSeq = parsed;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export function computeReceiptFinancialSummary(
  selectedOrders: JobOrderPopulated[]
): ReceiptFinancialSummary {
  let totalValue = 0;
  let totalDeposit = 0;
  const draftOrderIds: string[] = [];
  const readyToDeliverOrderIds: string[] = [];
  const alreadyLinkedOrderNumbers: string[] = [];

  for (const ord of selectedOrders) {
    totalValue += Number(ord.total_price) || 0;
    totalDeposit += Number(ord.deposit_paid) || 0;
    if (ord.status === 'Draft') {
      draftOrderIds.push(ord.id);
    }
    if (ord.status === 'تم التنفيذ') {
      readyToDeliverOrderIds.push(ord.id);
    }
    if (ord.delivery_receipt_number) {
      alreadyLinkedOrderNumbers.push(ord.order_number);
    }
  }

  const remainingBalance = Math.max(0, totalValue - totalDeposit);
  return {
    totalValue,
    totalDeposit,
    remainingBalance,
    isFullyPaid: remainingBalance === 0,
    draftOrderIds,
    readyToDeliverOrderIds,
    alreadyLinkedOrderNumbers,
  };
}

export function buildDeliveryReceiptRecord(params: {
  id?: string;
  receiptNumber: string;
  customer: Customer | null;
  selectedOrders: JobOrderPopulated[];
  receiptDate: string;
  notes?: string;
  deliveryBranch?: string;
  userProfile?: UserProfile | null;
  markOrdersDelivered?: boolean;
  nowIso?: string;
}): DeliveryReceiptRecord {
  const {
    id,
    receiptNumber,
    customer,
    selectedOrders,
    receiptDate,
    notes = '',
    deliveryBranch = '',
    userProfile = null,
    markOrdersDelivered = false,
    nowIso = new Date().toISOString(),
  } = params;

  if (!customer) {
    throw new Error('يجب اختيار العميل المستلم قبل إصدار الإقرار.');
  }
  if (!selectedOrders || selectedOrders.length === 0) {
    throw new Error('يجب تحديد أمر شغل واحد على الأقل لربطه بإقرار الاستلام.');
  }
  if (!receiptDate || !receiptDate.trim()) {
    throw new Error('يجب تحديد تاريخ الاستلام.');
  }

  const summary = computeReceiptFinancialSummary(selectedOrders);

  const items: DeliveryReceiptItemSnapshot[] = selectedOrders.map((ord) => ({
    order_id: ord.id,
    order_number: ord.order_number,
    room_model_code: ord.room_model_code || '',
    general_specs: ord.general_specs || '',
    paint_details: ord.job_details?.paint_details || 'مرفق بأمر التشغيل',
    fabric_source: ord.job_details?.fabric_source || ord.job_details?.color_code || 'مرفق بأمر التشغيل',
    dimensions_cm: ord.job_details?.dimensions_cm || 'مرفق بأمر التشغيل',
    total_price: Number(ord.total_price) || 0,
    deposit_paid: Number(ord.deposit_paid) || 0,
  }));

  const cleanNumber = receiptNumber.trim() || `DR-${new Date().getFullYear()}-0001`;
  const receiptId = id || `dr-${cleanNumber.toLowerCase().replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;

  return {
    id: receiptId,
    receipt_number: cleanNumber,
    customer_id: customer.id,
    customer_name: customer.name,
    customer_phone: customer.phone || '',
    receipt_date: receiptDate.trim(),
    order_ids: selectedOrders.map((o) => o.id),
    order_numbers: selectedOrders.map((o) => o.order_number),
    items,
    total_contract_value: summary.totalValue,
    total_deposit_paid: summary.totalDeposit,
    remaining_balance: summary.remainingBalance,
    notes: notes.trim(),
    delivery_branch: deliveryBranch.trim(),
    issued_by_name: userProfile?.name || 'إدارة التسليم',
    issued_by_uid: userProfile?.uid || '',
    mark_orders_delivered: Boolean(markOrdersDelivered),
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export function planOrderReceiptLinksAndDeliveryTransitions(params: {
  selectedOrders: JobOrderPopulated[];
  receiptRecord: DeliveryReceiptRecord;
  markAsDelivered: boolean;
  userProfile: UserProfile | null | undefined;
  nowIso?: string;
}): {
  orderUpdates: PlannedOrderReceiptUpdate[];
  transitionedOrderIds: string[];
  skippedStatusTransitions: SkippedStatusTransition[];
} {
  const {
    selectedOrders,
    receiptRecord,
    markAsDelivered,
    userProfile,
    nowIso = new Date().toISOString(),
  } = params;

  const orderUpdates: PlannedOrderReceiptUpdate[] = [];
  const transitionedOrderIds: string[] = [];
  const skippedStatusTransitions: SkippedStatusTransition[] = [];

  for (const ord of selectedOrders) {
    const updates: PlannedOrderReceiptUpdate['updates'] = {
      delivery_receipt_id: receiptRecord.id,
      delivery_receipt_number: receiptRecord.receipt_number,
      delivered_at: receiptRecord.receipt_date,
      updated_at: nowIso,
    };

    if (markAsDelivered && ord.status !== 'تسليم') {
      const transition = isValidStatusTransition(ord.status, 'تسليم', userProfile);
      if (transition.allowed) {
        updates.status = 'تسليم';
        updates.current_stage = 'جاهز للتسليم';
        updates.stage_updated_at = nowIso;
        transitionedOrderIds.push(ord.id);
      } else {
        skippedStatusTransitions.push({
          orderId: ord.id,
          orderNumber: ord.order_number,
          currentStatus: ord.status,
          reason: transition.error || 'حالة الأمر لا تسمح بالانتقال المباشر للتسليم',
        });
      }
    }

    orderUpdates.push({
      orderId: ord.id,
      orderNumber: ord.order_number,
      updates,
    });
  }

  return {
    orderUpdates,
    transitionedOrderIds,
    skippedStatusTransitions,
  };
}
