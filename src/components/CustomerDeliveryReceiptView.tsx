import React, { useState, useMemo, useEffect } from 'react';
import { Customer, DeliveryReceiptRecord, JobOrderPopulated } from '../types';
import { printElementById } from '../utils/printHelper';
import { useAuth } from '../contexts/AuthContext';
import { isValidStatusTransition } from '../lib/permissions';
import {
  computeReceiptFinancialSummary,
  generateNextDeliveryReceiptNumber,
  getCustomerOrdersForReceipt,
  resolveInitialReceiptSelection,
} from '../utils/deliveryReceiptLink';
import {
  FileCheck,
  User,
  Calendar,
  Printer,
  Sparkles,
  MapPin,
  Layers,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Eye,
  Trash2,
  History,
  Save,
  Wallet,
} from 'lucide-react';

interface CustomerDeliveryReceiptViewProps {
  customers: Customer[];
  orders: JobOrderPopulated[];
  receipts?: DeliveryReceiptRecord[];
  initialCustomerId?: string;
  initialOrderId?: string;
  onCloseModal?: () => void;
  onIssueReceipt?: (params: {
    customer: Customer;
    selectedOrders: JobOrderPopulated[];
    receiptDate: string;
    notes?: string;
    deliveryBranch?: string;
    markAsDelivered: boolean;
  }) => Promise<{ receiptRecord: DeliveryReceiptRecord; transitionedOrderIds: string[] }>;
  onDeleteReceipt?: (receipt: DeliveryReceiptRecord) => Promise<void>;
  onSelectOrderForCard?: (order: JobOrderPopulated) => void;
}

export const CustomerDeliveryReceiptView: React.FC<CustomerDeliveryReceiptViewProps> = ({
  customers,
  orders,
  receipts = [],
  initialCustomerId,
  initialOrderId,
  onCloseModal,
  onIssueReceipt,
  onDeleteReceipt,
  onSelectOrderForCard,
}) => {
  const { userProfile } = useAuth();

  const initialSelection = useMemo(
    () =>
      resolveInitialReceiptSelection({
        orders,
        customers,
        initialCustomerId,
        initialOrderId,
      }),
    [orders, customers, initialCustomerId, initialOrderId]
  );

  // Currently selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialSelection.customerId);
  // Selected Order IDs included in the current receipt
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(initialSelection.selectedOrderIds);
  // Viewing an already saved receipt record (null = live builder mode)
  const [viewingSavedReceipt, setViewingSavedReceipt] = useState<DeliveryReceiptRecord | null>(null);

  // Sync selection whenever user navigates here from a specific order or customer
  useEffect(() => {
    const resolved = resolveInitialReceiptSelection({
      orders,
      customers,
      initialCustomerId,
      initialOrderId,
    });
    if (resolved.customerId) {
      setSelectedCustomerId(resolved.customerId);
      setSelectedOrderIds(resolved.selectedOrderIds);
      const existingLinkedReceipt = resolved.targetOrder?.delivery_receipt_id
        ? receipts.find((r) => r.id === resolved.targetOrder?.delivery_receipt_id) || null
        : null;
      setViewingSavedReceipt(existingLinkedReceipt);
    }
  }, [initialCustomerId, initialOrderId]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Orders linked to the selected customer (excludes archived unless explicitly opened by initialOrderId)
  const customerOrders = useMemo(() => {
    return getCustomerOrdersForReceipt(orders, selectedCustomer, initialOrderId);
  }, [orders, selectedCustomer, initialOrderId]);

  // Quick Order / Customer Search Query
  const [quickLookupQuery, setQuickLookupQuery] = useState<string>('');

  const quickLookupMatches = useMemo(() => {
    const q = quickLookupQuery.trim().toLowerCase();
    if (!q) return [];
    return orders
      .filter((o) => !o.is_archived)
      .filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.room_model_code.toLowerCase().includes(q) ||
          (o.customer?.name || '').toLowerCase().includes(q) ||
          (o.customer?.phone || '').includes(q)
      )
      .slice(0, 8);
  }, [orders, quickLookupQuery]);

  const handlePickOrderFromSearch = (ord: JobOrderPopulated) => {
    const matchedCust =
      customers.find((c) => c.id === ord.customer_id) ||
      (ord.customer?.phone
        ? customers.find((c) => c.phone.trim() === ord.customer?.phone?.trim())
        : undefined);
    setViewingSavedReceipt(null);
    setSelectedCustomerId(matchedCust?.id || ord.customer_id);
    setSelectedOrderIds([ord.id]);
    setQuickLookupQuery('');
    setIssueFeedback(null);
  };

  const handleSelectCustomerChange = (newCustId: string) => {
    setViewingSavedReceipt(null);
    setSelectedCustomerId(newCustId);
    setIssueFeedback(null);
    const cust = customers.find((c) => c.id === newCustId) || null;
    const custOrds = getCustomerOrdersForReceipt(orders, cust);
    const nonDraft = custOrds.filter((o) => o.status !== 'Draft');
    setSelectedOrderIds((nonDraft.length > 0 ? nonDraft : custOrds).map((o) => o.id));
  };

  // Editable receipt metadata
  const [receiptDate, setReceiptDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [deliveryBranch, setDeliveryBranch] = useState<string>('84 جوزيف تيتو - النزهة الجديدة');
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [showFinancialOnPrint, setShowFinancialOnPrint] = useState<boolean>(false);
  const [markAsDelivered, setMarkAsDelivered] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [issueFeedback, setIssueFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [historyFilterMode, setHistoryFilterMode] = useState<'customer' | 'all'>('customer');

  // Toggle order inclusion
  const toggleOrderSelection = (orderId: string) => {
    setViewingSavedReceipt(null);
    setIssueFeedback(null);
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setViewingSavedReceipt(null);
    setSelectedOrderIds(customerOrders.map((o) => o.id));
  };

  const handleUnselectAll = () => {
    setViewingSavedReceipt(null);
    setSelectedOrderIds([]);
  };

  // Orders actually included in the live builder document
  const activeReceiptOrders = useMemo(() => {
    return customerOrders.filter((o) => selectedOrderIds.includes(o.id));
  }, [customerOrders, selectedOrderIds]);

  const financialSummary = useMemo(
    () => computeReceiptFinancialSummary(activeReceiptOrders),
    [activeReceiptOrders]
  );

  const canMarkDeliveredByRole = useMemo(() => {
    return isValidStatusTransition('تم التنفيذ', 'تسليم', userProfile).allowed;
  }, [userProfile]);

  const nextPreviewReceiptNumber = useMemo(
    () => generateNextDeliveryReceiptNumber(receipts),
    [receipts]
  );

  // Saved receipts filtered for display
  const filteredSavedReceipts = useMemo(() => {
    if (historyFilterMode === 'customer' && selectedCustomer) {
      return receipts.filter((r) => r.customer_id === selectedCustomer.id);
    }
    return receipts;
  }, [receipts, historyFilterMode, selectedCustomer]);

  // Display values for the A4 canvas (either viewing a saved receipt OR live builder)
  const displayReceiptNumber = viewingSavedReceipt
    ? viewingSavedReceipt.receipt_number
    : nextPreviewReceiptNumber;
  const displayCustomerName = viewingSavedReceipt
    ? viewingSavedReceipt.customer_name
    : selectedCustomer?.name || 'غير محدد';
  const displayCustomerPhone = viewingSavedReceipt
    ? viewingSavedReceipt.customer_phone
    : selectedCustomer?.phone || '';
  const displayReceiptDate = viewingSavedReceipt
    ? viewingSavedReceipt.receipt_date
    : receiptDate;
  const displayNotes = viewingSavedReceipt ? viewingSavedReceipt.notes || '' : receiptNotes;

  const displayItems = useMemo(() => {
    if (viewingSavedReceipt) {
      return viewingSavedReceipt.items.map((item) => ({
        id: item.order_id,
        order_number: item.order_number,
        room_model_code: item.room_model_code,
        general_specs: item.general_specs,
        paint_details: item.paint_details,
        fabric_source: item.fabric_source,
        dimensions_cm: item.dimensions_cm,
        total_price: item.total_price,
        deposit_paid: item.deposit_paid,
      }));
    }
    return activeReceiptOrders.map((ord) => ({
      id: ord.id,
      order_number: ord.order_number,
      room_model_code: ord.room_model_code,
      general_specs: ord.general_specs,
      paint_details: ord.job_details?.paint_details || 'مرفق بأمر التشغيل',
      fabric_source:
        ord.job_details?.fabric_source || ord.job_details?.color_code || 'مرفق بأمر التشغيل',
      dimensions_cm: ord.job_details?.dimensions_cm
        ? `مقاس ${ord.job_details.dimensions_cm}`
        : 'مرفق بأمر التشغيل',
      total_price: ord.total_price,
      deposit_paid: ord.deposit_paid,
    }));
  }, [viewingSavedReceipt, activeReceiptOrders]);

  const displayFinancial = useMemo(() => {
    if (viewingSavedReceipt) {
      return {
        totalValue: viewingSavedReceipt.total_contract_value,
        totalDeposit: viewingSavedReceipt.total_deposit_paid,
        remainingBalance: viewingSavedReceipt.remaining_balance,
      };
    }
    return financialSummary;
  }, [viewingSavedReceipt, financialSummary]);

  // Total text characters count in rendered items
  const totalReceiptTextChars = useMemo(() => {
    return displayItems.reduce((acc, item) => {
      return (
        acc +
        (item.general_specs?.length || 0) +
        (item.room_model_code?.length || 0) +
        (item.paint_details?.length || 0) +
        (item.fabric_source?.length || 0) +
        (item.dimensions_cm?.length || 0)
      );
    }, 0);
  }, [displayItems]);

  // Density override state
  const [densityOverride, setDensityOverride] = useState<
    'auto' | 'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'
  >('auto');
  const [manualFontScale, setManualFontScale] = useState<number>(100);
  const [fillPageHeight, setFillPageHeight] = useState<boolean>(true);

  const autoDetectedDensity = useMemo<
    'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'
  >(() => {
    const count = displayItems.length;
    if (count <= 2 && totalReceiptTextChars < 280) return 'spacious';
    if (count <= 4 && totalReceiptTextChars < 550) return 'comfortable';
    if (count <= 6 && totalReceiptTextChars < 900) return 'balanced';
    if (count <= 8 && totalReceiptTextChars < 1300) return 'compact';
    return 'micro';
  }, [displayItems.length, totalReceiptTextChars]);

  const activeDensity = densityOverride === 'auto' ? autoDetectedDensity : densityOverride;

  const receiptDensity = useMemo(() => {
    switch (activeDensity) {
      case 'spacious':
        return {
          containerPadding: 'p-6 sm:p-8',
          fontSize: 'text-sm sm:text-base',
          brandTitleText: 'text-2xl sm:text-3xl font-black',
          badgeText: 'text-sm sm:text-base px-4 py-1.5',
          spacingY: 'space-y-4 sm:space-y-5',
          itemPadding: 'pb-3 space-y-1',
          productTitleText: 'text-sm sm:text-base font-black',
          specsText: 'text-xs sm:text-sm',
          notesHeight: 'space-y-3',
          notesLine: 'pb-2',
          footerMargin: 'pt-4 mt-4',
        };
      case 'comfortable':
        return {
          containerPadding: 'p-5 sm:p-6',
          fontSize: 'text-xs sm:text-sm',
          brandTitleText: 'text-xl sm:text-2xl font-black',
          badgeText: 'text-xs sm:text-sm px-3.5 py-1',
          spacingY: 'space-y-3 sm:space-y-4',
          itemPadding: 'pb-2.5 space-y-0.5',
          productTitleText: 'text-xs sm:text-sm font-black',
          specsText: 'text-[11px] sm:text-xs',
          notesHeight: 'space-y-2',
          notesLine: 'pb-1',
          footerMargin: 'pt-3 mt-3',
        };
      case 'balanced':
        return {
          containerPadding: 'p-4 sm:p-5',
          fontSize: 'text-[11px] sm:text-xs',
          brandTitleText: 'text-lg sm:text-xl font-black',
          badgeText: 'text-xs px-3 py-1',
          spacingY: 'space-y-2.5 sm:space-y-3',
          itemPadding: 'pb-2 space-y-0.5',
          productTitleText: 'text-xs font-black',
          specsText: 'text-[10.5px] sm:text-[11px]',
          notesHeight: 'space-y-1.5',
          notesLine: 'pb-0.5',
          footerMargin: 'pt-2.5 mt-2.5',
        };
      case 'compact':
        return {
          containerPadding: 'p-3 sm:p-4',
          fontSize: 'text-[10px] sm:text-[10.5px]',
          brandTitleText: 'text-base sm:text-lg font-black',
          badgeText: 'text-[11px] px-2.5 py-0.5',
          spacingY: 'space-y-2',
          itemPadding: 'pb-1.5 space-y-0.5',
          productTitleText: 'text-[10.5px] sm:text-[11px] font-black',
          specsText: 'text-[9.5px] sm:text-[10px]',
          notesHeight: 'space-y-1',
          notesLine: 'pb-0.5',
          footerMargin: 'pt-2 mt-2',
        };
      case 'micro':
      default:
        return {
          containerPadding: 'p-2 sm:p-3',
          fontSize: 'text-[9px] sm:text-[9.5px]',
          brandTitleText: 'text-sm sm:text-base font-black',
          badgeText: 'text-[10px] px-2 py-0.5',
          spacingY: 'space-y-1.5',
          itemPadding: 'pb-1 space-y-0',
          productTitleText: 'text-[9.5px] sm:text-[10px] font-black',
          specsText: 'text-[8.5px] sm:text-[9px]',
          notesHeight: 'space-y-0.5',
          notesLine: 'pb-0.5',
          footerMargin: 'pt-1.5 mt-1.5',
        };
    }
  }, [activeDensity]);

  const handlePrintReceipt = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    printElementById('printable-delivery-receipt', orientation);
  };

  const handleIssueAndLink = async () => {
    if (!onIssueReceipt || !selectedCustomer || activeReceiptOrders.length === 0) return;
    setIsSubmitting(true);
    setIssueFeedback(null);
    try {
      const result = await onIssueReceipt({
        customer: selectedCustomer,
        selectedOrders: activeReceiptOrders,
        receiptDate,
        notes: receiptNotes,
        deliveryBranch,
        markAsDelivered: markAsDelivered && canMarkDeliveredByRole,
      });
      setViewingSavedReceipt(result.receiptRecord);
      setIssueFeedback({
        type: 'success',
        message: `تم اعتماد الإقرار رقم ${result.receiptRecord.receipt_number} وربطه بـ ${result.receiptRecord.order_ids.length} أمر شغل${
          result.transitionedOrderIds.length > 0
            ? ` (وتم تحويل ${result.transitionedOrderIds.length} أمر إلى حالة تسليم)`
            : ''
        }.`,
      });
    } catch (err) {
      setIssueFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر حفظ إقرار الاستلام. يرجى المحاولة مجدداً.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* TOP HEADER & PRIMARY ACTIONS */}
      <div className="no-print bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3352] text-white p-5 sm:p-8 rounded-3xl border border-[#4B83B8]/30 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-[#4B83B8]/15 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-blue-200 text-xs font-mono font-bold tracking-wide mb-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Official Delivery Protocol • Linked Receipt Studio</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono">
              {displayReceiptNumber}
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black font-serif text-white tracking-tight leading-tight">
            إقرار وتقـريـر اسـتـلام الـمـنـتـج
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed font-normal">
            مربوط مباشرة بسجل أوامر الشغل: ابحث برقم الأمر أو العميل، اربط الأوامر المستلمة بالإقرار واحفظه في السجل، مع تحديث حالة التسليم تلقائياً.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-[#4B83B8]/30 shrink-0">
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              aria-label="إغلاق"
              className="p-3 rounded-2xl bg-white/5 hover:bg-rose-600/20 text-slate-300 hover:text-white transition-all cursor-pointer group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
          )}

          {onIssueReceipt && !viewingSavedReceipt && (
            <button
              type="button"
              onClick={handleIssueAndLink}
              disabled={isSubmitting || !selectedCustomer || activeReceiptOrders.length === 0}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ والربط...' : 'اعتماد وحفظ الإقرار وربطه بالأوامر'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePrintReceipt('portrait')}
            disabled={!selectedCustomer && !viewingSavedReceipt}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-xl shadow-amber-900/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
          >
            <Printer className="w-5 h-5" />
            <span>طباعة الإقرار المعتمد (A4)</span>
          </button>
        </div>
      </div>

      {/* SAVED RECEIPT VIEWING MODE BANNER OR ISSUE FEEDBACK */}
      {issueFeedback && (
        <div
          className={`no-print p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-xs ${
            issueFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {issueFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{issueFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setIssueFeedback(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {viewingSavedReceipt && (
        <div className="no-print bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200">
            <Link2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>
              أنت تستعرض الآن الإقرار المحفوظ رقم{' '}
              <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200">
                {viewingSavedReceipt.receipt_number}
              </span>{' '}
              المرتبط بـ ({viewingSavedReceipt.order_numbers.join('، ')})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewingSavedReceipt(null)}
            className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-black cursor-pointer transition-colors"
          >
            العودة لإنشاء إقرار جديد
          </button>
        </div>
      )}

      {/* CUSTOMER & ORDERS SELECTION CONTROLS */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Quick Lookup by Order Number / Customer Name */}
        <div className="relative">
          <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-amber-600" />
            <span>بحث سريع برقم أمر الشغل (JO-2026-...) أو اسم العميل أو الهاتف للربط المباشر:</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={quickLookupQuery}
              onChange={(e) => setQuickLookupQuery(e.target.value)}
              placeholder="اكتب مثلاً: JO-2026-MGM-02 أو محمد جمال أو سلمى..."
              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none"
            />
            {quickLookupQuery ? (
              <button
                type="button"
                onClick={() => setQuickLookupQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {quickLookupMatches.length > 0 && (
            <div className="mt-2 rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden z-20 relative">
              {quickLookupMatches.map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => handlePickOrderFromSearch(ord)}
                  className="w-full px-4 py-3 text-right hover:bg-amber-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                        {ord.order_number}
                      </span>
                      <span className="font-black text-xs text-slate-900 dark:text-white">
                        {ord.customer?.name || 'غير مسجل'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        • {ord.room_model_code}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ord.delivery_receipt_number && (
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {ord.delivery_receipt_number}
                      </span>
                    )}
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {ord.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 1: Select Customer, Receipt Date & Branch */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Customer Dropdown */}
          <div className="md:col-span-6 space-y-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>اختيار العميل المستلم:</span>
            </label>
            <div className="relative group">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomerChange(e.target.value)}
                aria-label="اختيار العميل المستلم"
                className="w-full px-4 py-3.5 text-xs sm:text-sm font-black rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none cursor-pointer appearance-none transition-all shadow-inner"
              >
                {customers.map((c) => {
                  const count = getCustomerOrdersForReceipt(orders, c).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.phone} • [{count} أمر]
                    </option>
                  );
                })}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Receipt Date Picker */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>تاريخ الاستلام:</span>
            </label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => {
                setViewingSavedReceipt(null);
                setReceiptDate(e.target.value);
              }}
              className="w-full px-4 py-3.5 text-xs sm:text-sm font-black font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner"
            />
          </div>

          {/* Delivery Branch */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>فرع / نقطة التسليم:</span>
            </label>
            <select
              value={deliveryBranch}
              onChange={(e) => setDeliveryBranch(e.target.value)}
              aria-label="فرع أو نقطة التسليم"
              className="w-full px-3 py-3.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="84 جوزيف تيتو - النزهة الجديدة">84 جوزيف تيتو - النزهة الجديدة</option>
              <option value="29 مكرم عبيد - مدينة نصر">29 مكرم عبيد - مدينة نصر</option>
              <option value="51 نبيل الوقاد - أرض الجولف">51 نبيل الوقاد - أرض الجولف</option>
              <option value="طريق بورسعيد - دمياط">طريق بورسعيد - دمياط</option>
              <option value="تسليم مباشر بموقع العميل">تسليم مباشر بموقع العميل</option>
            </select>
          </div>
        </div>

        {/* Row 2: Customer Orders Checkbox Selection Pipeline */}
        {selectedCustomer && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center border border-emerald-100 dark:border-emerald-800 shadow-inner shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    أوامر شغل العميل المرتبطة
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500">
                    المحدد للإقرار: <strong>{activeReceiptOrders.length}</strong> من أصل{' '}
                    <strong>{customerOrders.length}</strong> أمر شغل نشط
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-4 py-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  تحديد الكل
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={handleUnselectAll}
                  className="px-4 py-1.5 text-[10px] font-black text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  استبعاد الكل
                </button>
              </div>
            </div>

            {financialSummary.draftOrderIds.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  تنبيه: يوجد ({financialSummary.draftOrderIds.length}) أمر شغل بحالة مسودة غير معتمدة ضمن الاختيار. تأكد من اعتماد أمر الشغل قبل التسليم النهائي.
                </span>
              </div>
            )}

            {financialSummary.alreadyLinkedOrderNumbers.length > 0 && !viewingSavedReceipt && (
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    الأمر ({financialSummary.alreadyLinkedOrderNumbers.join('، ')}) مرتبط مسبقاً بإقرار استلام محفوظ. اعتماد إقرار جديد سيحدّث الربط بالرقم الجديد.
                  </span>
                </div>
                {(() => {
                  const firstLinked = activeReceiptOrders.find((o) => o.delivery_receipt_id);
                  const matchedRec = firstLinked
                    ? receipts.find((r) => r.id === firstLinked.delivery_receipt_id)
                    : undefined;
                  return matchedRec ? (
                    <button
                      type="button"
                      onClick={() => setViewingSavedReceipt(matchedRec)}
                      className="px-3 py-1 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-[11px] font-black cursor-pointer"
                    >
                      عرض الإقرار السابق ({matchedRec.receipt_number})
                    </button>
                  ) : null;
                })()}
              </div>
            )}

            {customerOrders.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-amber-50/50 dark:bg-slate-800/20 border-2 border-dashed border-amber-200 dark:border-slate-700">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-400">
                  لا توجد أوامر شغل نشطة مسجلة لهذا العميل حالياً.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  const remaining = Math.max(0, (ord.total_price || 0) - (ord.deposit_paid || 0));
                  return (
                    <div
                      key={ord.id}
                      className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-lg ring-4 ring-emerald-500/5'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100 hover:border-emerald-300'
                      }`}
                    >
                      {isChecked && (
                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-600" />
                      )}

                      <button
                        type="button"
                        onClick={() => toggleOrderSelection(ord.id)}
                        className="w-full text-right flex items-start gap-3 cursor-pointer"
                      >
                        <div className={`mt-0.5 shrink-0 transition-transform duration-300 ${isChecked ? 'scale-110' : 'scale-100'}`}>
                          {isChecked ? (
                            <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                              <FileCheck className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <span
                              className={`font-mono font-black text-[10px] tracking-tighter ${
                                isChecked ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-600'
                              }`}
                            >
                              {ord.order_number}
                            </span>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                ord.status === 'تم التنفيذ'
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : ord.status === 'تسليم'
                                  ? 'bg-indigo-200 text-indigo-900'
                                  : ord.status === 'Draft'
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {ord.status === 'Draft' ? 'مسودة' : ord.status}
                            </span>
                          </div>

                          <h5
                            className={`font-black text-xs truncate transition-colors ${
                              isChecked ? 'text-emerald-950 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {ord.room_model_code}
                          </h5>
                          <p className="text-[10px] font-bold text-slate-500 line-clamp-1 mt-1">
                            {ord.general_specs}
                          </p>
                        </div>
                      </button>

                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[10px] font-bold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono ${
                              remaining === 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {remaining === 0
                              ? 'خالص السداد'
                              : `متبقي: ${remaining.toLocaleString()} ج.م`}
                          </span>
                          {ord.delivery_receipt_number && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">
                              {ord.delivery_receipt_number}
                            </span>
                          )}
                        </div>

                        {onSelectOrderForCard && (
                          <button
                            type="button"
                            onClick={() => onSelectOrderForCard(ord)}
                            className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 hover:underline cursor-pointer shrink-0"
                            title="معاينة كارت الورشة"
                          >
                            <Eye className="w-3 h-3" />
                            <span>الكارت</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Financial Clearance, Workflow Sync & Notes Bar */}
            {activeReceiptOrders.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 items-start">
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>الملخص المالي للأوامر المحددة:</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        financialSummary.isFullyPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {financialSummary.isFullyPaid ? 'خالص بالكامل' : 'يوجد متبقي للتحصيل'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="block text-[10px] text-slate-400 font-sans">إجمالي التعاقد</span>
                      <strong className="text-slate-900 dark:text-white">
                        {financialSummary.totalValue.toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="block text-[10px] text-slate-400 font-sans">المدفوع</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {financialSummary.totalDeposit.toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="block text-[10px] text-slate-400 font-sans">المتبقي</span>
                      <strong className={financialSummary.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {financialSummary.remainingBalance.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markAsDelivered && canMarkDeliveredByRole}
                        disabled={!canMarkDeliveredByRole}
                        onChange={(e) => setMarkAsDelivered(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                      <span>
                        تحديث حالة الأوامر المنفذة ("تم التنفيذ") إلى "تسليم" تلقائياً عند اعتماد الإقرار
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showFinancialOnPrint}
                        onChange={(e) => setShowFinancialOnPrint(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span>إظهار ملخص السداد على ورقة الطباعة</span>
                    </label>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder="ملاحظات التسليم المرتبطة بالإقرار (مثلاً: تم التسليم بحضور العميل، ملاحظات تركيب...)"
                      className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SAVED LINKED RECEIPTS HISTORY */}
      {receipts.length > 0 && (
        <div className="no-print bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  سجل إقرارات الاستلام المعتمدة ({filteredSavedReceipts.length})
                </h3>
                <p className="text-[11px] font-bold text-slate-500">
                  كل إقرار محفوظ ومرتبط بأوامر الشغل الخاصة به للمعاينة وإعادة الطباعة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setHistoryFilterMode('customer')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                  historyFilterMode === 'customer'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                إقرارات العميل المحدد
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilterMode('all')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                  historyFilterMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                كافة الإقرارات ({receipts.length})
              </button>
            </div>
          </div>

          {filteredSavedReceipts.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-3 text-center">
              لم يتم إصدار إقرارات استلام محفوظة لهذا العميل بعد.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSavedReceipts.map((rec) => {
                const isViewing = viewingSavedReceipt?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                      isViewing
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs text-indigo-800 dark:text-indigo-300">
                        {rec.receipt_number}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {rec.receipt_date}
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {rec.customer_name}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rec.order_numbers.map((num) => (
                        <span
                          key={num}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setViewingSavedReceipt(rec)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-[11px] font-black cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة / طباعة</span>
                      </button>

                      {onDeleteReceipt && userProfile?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (viewingSavedReceipt?.id === rec.id) {
                              setViewingSavedReceipt(null);
                            }
                            onDeleteReceipt(rec);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="حذف الإقرار وفك الربط بالأوامر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PRINTABLE OFFICIAL SHEET - SMART ADAPTIVE PREVIEW */}
      <div className="space-y-4">
        {/* Adaptive Density Controller */}
        <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Maximize2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    محرك الملاءمة التلقائية لصفحة الطباعة
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase tracking-tighter">
                    Smart Fit Engine
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  يعمل النظام تلقائياً على حساب حجم الخطوط والهوامش لضمان بقاء الإقرار في صفحة A4 واحدة مع ملء الفراغات لضمان مظهر احترافي.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setFillPageHeight((f) => !f)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                  fillPageHeight
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${fillPageHeight ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                <span>{fillPageHeight ? 'تفعيل ملء الصفحة بالكامل' : 'تعبئة طبيعية'}</span>
              </button>
            </div>
          </div>

          {/* Density Presets & Manual Sizer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 block">
                أنماط الكثافة (Pre-sets):
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'auto', label: 'تأقلم تلقائي', icon: '🤖' },
                  { id: 'spacious', label: 'مكبر', icon: '🔍' },
                  { id: 'comfortable', label: 'مريح', icon: '📄' },
                  { id: 'balanced', label: 'قياسي', icon: '⚖️' },
                  { id: 'compact', label: 'مضغوط', icon: '📐' },
                  { id: 'micro', label: 'كثيف', icon: '⚡' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDensityOverride(d.id as any)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer border flex items-center gap-2 ${
                      densityOverride === d.id
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-inner'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-transparent hover:border-emerald-200'
                    }`}
                  >
                    <span>{d.icon}</span>
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 block">
                حجم الخط اليدوي (Manual Scaling):
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setManualFontScale((s) => Math.max(80, s - 5))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-600 shadow-sm hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {manualFontScale}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualFontScale((s) => Math.min(135, s + 5))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-600 shadow-sm hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>

                {manualFontScale !== 100 && (
                  <button
                    type="button"
                    onClick={() => setManualFontScale(100)}
                    className="p-3 rounded-xl bg-amber-500 text-slate-950 font-black text-[10px] shadow-lg shadow-amber-500/20 active:scale-90 transition-all cursor-pointer uppercase tracking-tighter"
                  >
                    Reset 100%
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LIVE CANVAS PREVIEW */}
        <div className="flex justify-center p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 group relative">
          <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-slate-900/80 text-white p-2 rounded-full lg:hidden opacity-50 pointer-events-none group-hover:opacity-0 transition-opacity">
            <RotateCcw className="w-5 h-5 animate-spin" />
          </div>

          <div
            id="printable-delivery-receipt"
            className={`bg-white text-black density-${activeDensity} ${receiptDensity.containerPadding} rounded-none border-2 sm:border-4 border-slate-900 shadow-2xl max-w-[210mm] w-full font-serif ${receiptDensity.fontSize} leading-snug relative flex flex-col justify-between print-card my-auto`}
            style={{
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              pageBreakInside: 'avoid',
              pageBreakAfter: 'avoid',
              breakInside: 'avoid',
              minHeight: fillPageHeight ? (activeDensity === 'spacious' ? '274mm' : '272mm') : 'auto',
              fontSize: manualFontScale !== 100 ? `${manualFontScale}%` : undefined,
            }}
          >
            {/* DOCUMENT CONTENT */}
            <div className={`receipt-content-wrapper flex-1 flex flex-col ${receiptDensity.spacingY}`}>
              {/* 1. BRAND HEADER WITH LOGO & SERIAL RECEIPT NUMBER */}
              <div className="relative border-b-2 border-slate-950 pb-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-700 text-amber-300 font-black text-xl sm:text-2xl rounded-lg flex items-center justify-center border-2 border-emerald-600 shadow-xs font-serif shrink-0">
                      A
                    </div>
                    <div>
                      <h1 className={`receipt-brand-title font-black text-emerald-800 tracking-wider font-serif ${receiptDensity.brandTitleText}`}>
                        النجار فيرنتشر
                      </h1>
                      <span className="text-[9px] sm:text-[10px] text-slate-600 block -mt-0.5 uppercase tracking-widest font-mono font-bold">
                        El-Naggar Furniture
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0 space-y-1">
                    <div className={`receipt-badge-title bg-emerald-800 text-white font-black rounded-md tracking-wider border border-emerald-700 shadow-2xs text-center ${receiptDensity.badgeText}`}>
                      تـقـريـر اسـتـلام الـمـنـتـج
                    </div>
                    <div className="font-mono text-[10px] font-black text-slate-700 text-center">
                      رقم الإقرار: {displayReceiptNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. CUSTOMER, LINKED ORDER NUMBERS & RECEIPT DATE GRID */}
              <div className="border-b-2 border-slate-950 pb-2 font-bold text-xs sm:text-sm space-y-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-950 font-black shrink-0">اسم العميل :</span>
                    <span className="font-extrabold text-blue-950 text-sm sm:text-base border-b border-dotted border-slate-400 px-2 min-w-[180px]">
                      {displayCustomerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-emerald-950 font-black shrink-0">تاريخ الاستلام :</span>
                    <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-400 px-2 dir-ltr">
                      {displayReceiptDate.replace(/-/g, ' / ')}
                    </span>
                  </div>
                </div>

                {displayItems.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="text-emerald-950 font-black shrink-0">أوامر الشغل المرتبطة :</span>
                    <span className="font-mono font-bold text-slate-800">
                      {displayItems.map((i) => i.order_number).join(' • ')}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. PRODUCTS BOX */}
              <div className="space-y-2 border-2 border-slate-950 p-2.5 sm:p-3 rounded-xs bg-white">
                <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-950 px-2.5 py-0.5 font-black text-xs sm:text-sm rounded-xs inline-block">
                  الـمـنـتـجـات عـبـارة عـن :
                </div>

                <div className="space-y-2 pt-0.5">
                  {displayItems.length === 0 ? (
                    <div className="text-slate-500 font-bold text-xs py-1 italic text-center">
                      (لم يتم تحديد منتجات للتقرير - يمكنك تفعيل الأوامر من الأعلى)
                    </div>
                  ) : (
                    displayItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`border-b border-slate-300 ${receiptDensity.itemPadding} last:border-0 last:pb-0`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div
                            className={`receipt-product-title font-black text-red-600 print:text-red-600 ${receiptDensity.productTitleText}`}
                            style={{ color: '#dc2626' }}
                          >
                            <span>{idx + 1}. </span>
                            {item.room_model_code &&
                              !item.general_specs?.includes(item.room_model_code) && (
                                <span className="font-black ml-1">[{item.room_model_code}] </span>
                              )}
                            <span>{item.general_specs || item.room_model_code}</span>
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-600 shrink-0">
                            #{item.order_number}
                          </span>
                        </div>

                        <div
                          className={`receipt-specs-grid grid grid-cols-3 gap-1 text-slate-800 pr-2 font-semibold ${receiptDensity.specsText}`}
                        >
                          <div>
                            <strong>الدهان:</strong> {item.paint_details}
                          </div>
                          <div>
                            <strong>التنجيد:</strong> {item.fabric_source}
                          </div>
                          <div>
                            <strong>المواصفات:</strong> {item.dimensions_cm}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {showFinancialOnPrint && displayItems.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-400 grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-900">
                    <div>
                      إجمالي التعاقد: <span className="font-mono">{displayFinancial.totalValue.toLocaleString()} ج.م</span>
                    </div>
                    <div>
                      المدفوع: <span className="font-mono">{displayFinancial.totalDeposit.toLocaleString()} ج.م</span>
                    </div>
                    <div>
                      المتبقي: <span className="font-mono">{displayFinancial.remainingBalance.toLocaleString()} ج.م</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. EVALUATION FORM */}
              <div className="space-y-2 pt-1 font-bold text-xs">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                  <span className="text-emerald-950 font-black shrink-0">ما هو تقييمك للمنتج ؟</span>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span>مقبول ( &nbsp; )</span>
                    <span>جيد ( &nbsp; )</span>
                    <span>جيد جداً ( &nbsp; )</span>
                    <span className="text-emerald-800">ممتاز ( &nbsp; )</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                  <span className="text-emerald-950 font-black shrink-0">ما هو تقييمك لفريق العمل ؟</span>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span>مقبول ( &nbsp; )</span>
                    <span>جيد ( &nbsp; )</span>
                    <span>جيد جداً ( &nbsp; )</span>
                    <span className="text-emerald-800">ممتاز ( &nbsp; )</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-800 font-bold block mb-0.5 text-[11px]">ملاحظات أخرى:</span>
                  {displayNotes ? (
                    <p className="text-xs font-bold text-slate-900 border-b border-dotted border-slate-400 pb-1">
                      {displayNotes}
                    </p>
                  ) : (
                    <div
                      className={`receipt-notes-lines ${receiptDensity.notesHeight} text-slate-400 font-mono text-[10px] overflow-hidden`}
                    >
                      <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>
                        &nbsp;
                      </p>
                      <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>
                        &nbsp;
                      </p>
                      {(activeDensity === 'spacious' || displayItems.length <= 2) && (
                        <>
                          <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>
                            &nbsp;
                          </p>
                          <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>
                            &nbsp;
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. LEGAL DISCLAIMER & BRANCHES LIST */}
              <div className="space-y-1.5 pt-1 text-[10px] sm:text-[11px] leading-snug font-serif">
                <p className="font-extrabold text-slate-900 text-justify">
                  أقر أنا الموقع أدناه بأنني قد استلمت كافة المستحقات من شركة النجار فيرنتشر وفروعها كالأتي :
                </p>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-300">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>84 جوزيف تيتو - النزهة الجديدة</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>29 مكرم عبيد - مدينة نصر</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>51 نبيل الوقاد - أرض الجولف</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>طريق بورسعيد - دمياط</span>
                  </div>
                </div>

                <p className="font-semibold text-slate-900 text-justify pt-0.5">
                  و أنني بالتوقيع على هذا الإقرار أخلي طرف الشركة من أي مستحقات أو خلافه يتعلق بالمنتجات المطلوبة من الشركة كاملة وخالية من عيوب الصناعة .
                </p>

                <p className="font-semibold text-slate-900 text-justify">
                  وبعد المعاينة والقبول وهي في حالة جيدة وتم سداد القيمة المتفق عليها في العقد. توقيع العميل أو تابعه أو أي مستخدم ملحق بخدمته على هذا الإذن يقوم مقام إمضاء العميل نفسه.
                </p>
              </div>
            </div>

            {/* 6. SIGNATURES BLOCK */}
            <div className={`border-t border-slate-300 ${receiptDensity.footerMargin} space-y-2 font-serif shrink-0`}>
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <div className="space-y-1 flex-1">
                  <p className="font-black text-slate-900">و هذا إقرار مني بذلك ,</p>

                  <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold pt-0.5">
                    <p>التوقيع / ....................</p>
                    <p>الرقم القومي / ....................</p>
                    <p>رقم الهاتف / {displayCustomerPhone || '....................'}</p>
                  </div>
                </div>

                <div className="text-left space-y-1 shrink-0 pl-2">
                  <div className="font-mono font-bold text-xs text-slate-700">
                    تحريراً في : {displayReceiptDate.replace(/-/g, ' / ')}
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    ختم الاستلام والتسليم • {displayReceiptNumber}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
