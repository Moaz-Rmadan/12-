import React, { useMemo, useState } from 'react';
import {
  PackageCheck,
  Search,
  Archive,
  FileCheck,
  Eye,
  RotateCcw,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  ArrowUpDown,
} from 'lucide-react';
import { JobOrderPopulated, OrderStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';
import { hasPermission, isValidStatusTransition } from '../lib/permissions';
import {
  getDeliveryClosureStatus,
  isDeliveredActiveOrder,
} from '../utils/orderLifecycle';

interface DeliveriesViewProps {
  orders: JobOrderPopulated[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  onOpenDeliveryReceipt: (order: JobOrderPopulated) => void;
  onUpdateArchiveStatus: (id: string, isArchived: boolean) => Promise<void> | void;
  onBatchArchiveOrders: (ids: string[]) => Promise<void>;
  onUpdateStatus: (id: string, newStatus: OrderStatus) => Promise<void> | void;
  onNavigateToArchive: () => void;
}

type DeliverySubFilter = 'all' | 'ready_to_archive' | 'unpaid' | 'missing_receipt';

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  orders,
  onSelectOrder,
  onOpenDeliveryReceipt,
  onUpdateArchiveStatus,
  onBatchArchiveOrders,
  onUpdateStatus,
  onNavigateToArchive,
}) => {
  const { userProfile, hasPerm } = useAuth();
  const { confirmAction } = useFeedback();

  const [searchQuery, setSearchQuery] = useState('');
  const [subFilter, setSubFilter] = useState<DeliverySubFilter>('all');
  const [sortBy, setSortBy] = useState<'delivered_desc' | 'balance_desc' | 'order_number'>('delivered_desc');
  const [isBatchArchiving, setIsBatchArchiving] = useState(false);

  const canArchive = hasPermission(userProfile, 'order:update_production_fields');
  const canReadFinance = hasPerm('finance:read');
  const canManageReceipt = hasPerm('delivery:manage');
  const canRevertDelivery = isValidStatusTransition('تسليم', 'تم التنفيذ', userProfile).allowed;

  const deliveredEntries = useMemo(() => {
    return orders
      .filter(isDeliveredActiveOrder)
      .map((order) => ({
        order,
        closure: getDeliveryClosureStatus(order),
      }));
  }, [orders]);

  const metrics = useMemo(() => {
    let totalCount = deliveredEntries.length;
    let readyCount = 0;
    let unpaidCount = 0;
    let missingReceiptCount = 0;
    let totalRemainingBalance = 0;

    for (const item of deliveredEntries) {
      if (item.closure.isReadyToArchive) readyCount += 1;
      if (!item.closure.isFinanciallySettled) {
        unpaidCount += 1;
        totalRemainingBalance += item.closure.remainingBalance;
      }
      if (!item.closure.hasDeliveryReceipt) missingReceiptCount += 1;
    }

    return {
      totalCount,
      readyCount,
      unpaidCount,
      missingReceiptCount,
      totalRemainingBalance,
    };
  }, [deliveredEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return deliveredEntries
      .filter(({ order, closure }) => {
        if (subFilter === 'ready_to_archive' && !closure.isReadyToArchive) return false;
        if (subFilter === 'unpaid' && closure.isFinanciallySettled) return false;
        if (subFilter === 'missing_receipt' && closure.hasDeliveryReceipt) return false;

        if (q) {
          const matches =
            order.order_number.toLowerCase().includes(q) ||
            order.room_model_code.toLowerCase().includes(q) ||
            order.general_specs.toLowerCase().includes(q) ||
            (order.customer?.name || '').toLowerCase().includes(q) ||
            (order.customer?.phone || '').toLowerCase().includes(q) ||
            (order.delivery_receipt_number || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'balance_desc') {
          return b.closure.remainingBalance - a.closure.remainingBalance;
        }
        if (sortBy === 'order_number') {
          return a.order.order_number.localeCompare(b.order.order_number);
        }
        return (b.closure.deliveredDate || '').localeCompare(a.closure.deliveredDate || '');
      });
  }, [deliveredEntries, subFilter, searchQuery, sortBy]);

  const handleSingleArchive = async (order: JobOrderPopulated) => {
    const closure = getDeliveryClosureStatus(order);
    const warnings: string[] = [];
    if (!closure.isFinanciallySettled && canReadFinance) {
      warnings.push(`يوجد متبقي تحصيل قدره ${closure.remainingBalance.toLocaleString('ar-EG')} ج.م`);
    }
    if (!closure.hasDeliveryReceipt) {
      warnings.push('لم يتم ربط إقرار استلام عميل رسمي بعد');
    }

    const confirmed = await confirmAction({
      title: `نقل الأمر ${order.order_number} إلى الأرشيف النهائي`,
      message:
        warnings.length > 0
          ? `تنبيه: ${warnings.join(' · ')}. هل تريد أرشفة الأمر وإغلاقه على كل حال؟`
          : `الأمر مستوفٍ لإقرار الاستلام والسداد الكامل. سيتم نقله من سجل التسليمات إلى الأرشيف التاريخي.`,
      confirmLabel: 'تأكيد الأرشفة',
      tone: warnings.length > 0 ? 'warning' : 'primary',
    });
    if (!confirmed) return;

    await onUpdateArchiveStatus(order.id, true);
  };

  const handleBatchArchiveReady = async () => {
    const readyIds = deliveredEntries
      .filter((e) => e.closure.isReadyToArchive)
      .map((e) => e.order.id);
    if (readyIds.length === 0) return;

    const confirmed = await confirmAction({
      title: 'أرشفة التسليمات المكتملة دفعة واحدة',
      message: `سيتم نقل ${readyIds.length} أمر شغل (مسددة بالكامل وموثقة بإقرار استلام) إلى الأرشيف النهائي.`,
      confirmLabel: `أرشفة ${readyIds.length} أمر`,
      tone: 'primary',
    });
    if (!confirmed) return;

    setIsBatchArchiving(true);
    try {
      await onBatchArchiveOrders(readyIds);
    } finally {
      setIsBatchArchiving(false);
    }
  };

  const handleReturnToWorkshop = async (order: JobOrderPopulated) => {
    const confirmed = await confirmAction({
      title: `إرجاع الأمر ${order.order_number} إلى التشغيل`,
      message:
        'يُستخدم هذا الإجراء في حالة التسليم بالخطأ أو رجوع قطعة للمصنع للصيانة أو تعديل الدهان. سيعود الأمر إلى قائمة "أوامر الشغل الجارية" بحالة (تم التنفيذ).',
      confirmLabel: 'إرجاع لقائمة الأوامر',
      tone: 'warning',
    });
    if (!confirmed) return;

    await onUpdateStatus(order.id, 'تم التنفيذ');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3352] text-white p-5 sm:p-7 rounded-2xl border border-[#4B83B8]/30 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C6A355]/20 text-[#C6A355] border border-[#C6A355]/40 flex items-center justify-center shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-white">
              سجل التسليمات ومتابعة ما بعد التسليم
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              تنتقل هنا تلقائياً الأوامر التي تحصل على حالة «تسليم» لتختفي من طابور الورش، مع متابعة التحصيل المالي وإقرارات استلام العملاء قبل إغلاقها ونقلها للأرشيف النهائي.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {canArchive && metrics.readyCount > 0 && (
            <button
              type="button"
              disabled={isBatchArchiving}
              onClick={handleBatchArchiveReady}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#C6A355] hover:bg-[#d4b366] text-[#16253B] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
              <span>أرشفة المكتملة ({metrics.readyCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToArchive}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
          >
            <Archive className="w-4 h-4 text-[#C6A355]" />
            <span>فتح الأرشيف التاريخي</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">تسليمات قيد المتابعة</span>
          <strong className="text-2xl font-black font-mono tabular-nums text-[#233B5D] dark:text-white mt-1 block">
            {metrics.totalCount}
          </strong>
          <span className="text-[11px] text-slate-400">خرجت من أوامر الشغل الجارية</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">جاهزة للأرشفة النهائية</span>
          <strong className="text-2xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1 block">
            {metrics.readyCount}
          </strong>
          <span className="text-[11px] text-slate-400">مسددة بالكامل وموثقة بإقرار</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">بانتظار تحصيل مالي</span>
          <strong className="text-2xl font-black font-mono tabular-nums text-amber-700 dark:text-amber-400 mt-1 block">
            {metrics.unpaidCount}
          </strong>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {canReadFinance
              ? `متبقي ${metrics.totalRemainingBalance.toLocaleString('ar-EG')} ج.م`
              : 'مقيد بصلاحية الحسابات'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">بدون إقرار استلام</span>
          <strong className="text-2xl font-black font-mono tabular-nums text-rose-700 dark:text-rose-400 mt-1 block">
            {metrics.missingReceiptCount}
          </strong>
          <span className="text-[11px] text-slate-400">تحتاج ربط إقرار استلام العميل</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: `الكل (${metrics.totalCount})` },
            { id: 'ready_to_archive', label: `جاهز للأرشفة (${metrics.readyCount})` },
            { id: 'unpaid', label: `عليه متبقي مالي (${metrics.unpaidCount})` },
            { id: 'missing_receipt', label: `بدون إقرار (${metrics.missingReceiptCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubFilter(tab.id as DeliverySubFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                subFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-[#233B5D] dark:text-white shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الأمر، العميل، الموديل، الإقرار..."
              className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4B83B8]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="ترتيب التسليمات"
              className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="delivered_desc">الأحدث تسليماً</option>
              {canReadFinance && <option value="balance_desc">الأعلى متبقي مالي</option>}
              <option value="order_number">رقم أمر الشغل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries Cards */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
            لا توجد تسليمات مطابقة في هذه القائمة
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            عند تغيير حالة أي أمر شغل إلى «تسليم» أو إصدار إقرار استلام مع تأكيد التسليم، سيظهر هنا تلقائياً لمتابعة التقفيل والأرشفة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntries.map(({ order, closure }) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Header */}
                <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#16253B] text-white tabular-nums shrink-0">
                      {order.order_number}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 truncate">
                      {order.room_model_code}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                    تم التسليم
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3.5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-2">
                      {order.general_specs}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {order.customer?.name || 'عميل'}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Phone className="w-3 h-3" />
                        {order.customer?.phone || '—'}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3 h-3" />
                        {closure.deliveredDate || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Closure Status Checklist */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#4B83B8]" />
                        <span>إقرار الاستلام:</span>
                      </span>
                      {closure.hasDeliveryReceipt ? (
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {order.delivery_receipt_number || 'مرتبط'}
                        </span>
                      ) : (
                        <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          غير مرتبط
                        </span>
                      )}
                    </div>

                    {canReadFinance && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-[#C6A355]" />
                          <span>الموقف المالي:</span>
                        </span>
                        {closure.isFinanciallySettled ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            مسدد بالكامل
                          </span>
                        ) : (
                          <span className="font-mono font-black text-amber-700 dark:text-amber-400 tabular-nums">
                            متبقي {closure.remainingBalance.toLocaleString('ar-EG')} ج.م
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSelectOrder(order)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white bg-[#233B5D] hover:bg-[#1E3352] transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C6A355]" />
                  <span>التفاصيل</span>
                </button>

                {canManageReceipt && (
                  <button
                    type="button"
                    onClick={() => onOpenDeliveryReceipt(order)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{closure.hasDeliveryReceipt ? 'الإقرار' : 'إصدار إقرار'}</span>
                  </button>
                )}

                {canArchive && (
                  <button
                    type="button"
                    onClick={() => handleSingleArchive(order)}
                    className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                      closure.isReadyToArchive
                        ? 'bg-[#C6A355] hover:bg-[#d4b366] text-[#16253B]'
                        : 'bg-white dark:bg-slate-800 text-[#233B5D] dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                    title="نقل الأمر إلى الأرشيف النهائي"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>أرشفة</span>
                  </button>
                )}

                {canRevertDelivery && (
                  <button
                    type="button"
                    onClick={() => handleReturnToWorkshop(order)}
                    className="p-2 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                    title="إرجاع للتشغيل (مرتجع أو تعديل تسليم)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
