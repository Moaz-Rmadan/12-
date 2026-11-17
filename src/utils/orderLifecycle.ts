import { JobOrderPopulated } from '../types';

export interface DeliveryClosureStatus {
  remainingBalance: number;
  isFinanciallySettled: boolean;
  hasDeliveryReceipt: boolean;
  isReadyToArchive: boolean;
  pendingRequirements: string[];
  deliveredDate: string;
}

export interface LifecyclePartition {
  activeOrders: JobOrderPopulated[];
  deliveredOrders: JobOrderPopulated[];
  archivedOrders: JobOrderPopulated[];
  readyToArchiveOrders: JobOrderPopulated[];
}

/**
 * Active factory workshop orders (excludes delivered and archived orders).
 */
export function isActiveWorkshopOrder(order: Pick<JobOrderPopulated, 'status' | 'is_archived'>): boolean {
  return !order.is_archived && order.status !== 'تسليم';
}

/**
 * Orders that have been delivered to the customer and are awaiting post-delivery closure
 * (financial settlement, delivery receipt confirmation, warranty window) before final archiving.
 */
export function isDeliveredActiveOrder(order: Pick<JobOrderPopulated, 'status' | 'is_archived'>): boolean {
  return !order.is_archived && order.status === 'تسليم';
}

/**
 * Closed historical orders stored in the factory archive.
 */
export function isArchivedOrder(order: Pick<JobOrderPopulated, 'is_archived'>): boolean {
  return Boolean(order.is_archived);
}

/**
 * Remaining uncollected balance on a job order.
 */
export function getOrderRemainingBalance(order: Pick<JobOrderPopulated, 'total_price' | 'deposit_paid'>): number {
  const total = Number(order.total_price) || 0;
  const paid = Number(order.deposit_paid) || 0;
  return Math.max(0, total - paid);
}

/**
 * Computes whether a delivered order satisfies all closure criteria for final archiving.
 */
export function getDeliveryClosureStatus(order: JobOrderPopulated): DeliveryClosureStatus {
  const remainingBalance = getOrderRemainingBalance(order);
  const isFinanciallySettled = remainingBalance === 0;
  const hasDeliveryReceipt = Boolean(order.delivery_receipt_id || order.delivery_receipt_number);
  const pendingRequirements: string[] = [];

  if (!isFinanciallySettled) {
    pendingRequirements.push('تحصيل باقي الحساب');
  }
  if (!hasDeliveryReceipt) {
    pendingRequirements.push('إصدار إقرار استلام');
  }

  return {
    remainingBalance,
    isFinanciallySettled,
    hasDeliveryReceipt,
    isReadyToArchive: order.status === 'تسليم' && !order.is_archived && isFinanciallySettled && hasDeliveryReceipt,
    pendingRequirements,
    deliveredDate: (order.delivered_at || order.delivery_date || '').trim(),
  };
}

/**
 * Partitions all orders into the three factory lifecycle queues.
 */
export function partitionOrdersByLifecycle(orders: JobOrderPopulated[]): LifecyclePartition {
  const activeOrders: JobOrderPopulated[] = [];
  const deliveredOrders: JobOrderPopulated[] = [];
  const archivedOrders: JobOrderPopulated[] = [];
  const readyToArchiveOrders: JobOrderPopulated[] = [];

  for (const ord of orders) {
    if (isArchivedOrder(ord)) {
      archivedOrders.push(ord);
    } else if (isDeliveredActiveOrder(ord)) {
      deliveredOrders.push(ord);
      if (getDeliveryClosureStatus(ord).isReadyToArchive) {
        readyToArchiveOrders.push(ord);
      }
    } else {
      activeOrders.push(ord);
    }
  }

  return {
    activeOrders,
    deliveredOrders,
    archivedOrders,
    readyToArchiveOrders,
  };
}
