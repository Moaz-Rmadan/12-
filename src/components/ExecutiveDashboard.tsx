import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertTriangle,
  ArrowUpLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Layers,
  PackageCheck,
  Printer,
  Search,
  ShieldCheck,
  Truck,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { Customer, JobOrderPopulated, ProductionStage, TruckManifest } from '../types';
import { FURNITURE_CATEGORIES, getCategoryCounts } from '../utils/furnitureClassifier';
import { partitionOrdersByLifecycle } from '../utils/orderLifecycle';
import {
  computeMonthlySummaryMap,
  detectMonthQueryFromText,
  formatMonthYearArabic,
  normalizeSearchText,
  SmartSearchFilters,
} from '../utils/smartSearchEngine';

interface ExecutiveDashboardProps {
  orders: JobOrderPopulated[];
  customers: Customer[];
  truckManifests: TruckManifest[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  onEditOrder?: (order: JobOrderPopulated) => void;
  onOpenNewOrderModal: () => void;
  onNavigateTab: (tab: string, contextId?: string, orderId?: string) => void;
  onOpenSmartSearch: (filters: Partial<SmartSearchFilters>) => void;
}

const STAGES_LIST: ProductionStage[] = [
  'لم يبدأ',
  'نجارة عفش',
  'نجارة انتريهات',
  'خدمة وتجهيز',
  'كابينة أستر',
  'كابينة دوكو',
  'تنجيد',
  'تشطيب وتغليف',
  'جاهز للتسليم',
];

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  orders,
  customers,
  truckManifests,
  onSelectOrder,
  onOpenNewOrderModal,
  onNavigateTab,
  onOpenSmartSearch,
}) => {
  const { hasPerm } = useAuth();
  const [quickQuery, setQuickQuery] = useState('');

  const lifecycle = useMemo(() => partitionOrdersByLifecycle(orders), [orders]);

  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const radarMetrics = useMemo(() => {
    const activeOrders = lifecycle.activeOrders;
    const deliveredOrders = lifecycle.deliveredOrders;
    const archivedOrders = lifecycle.archivedOrders;

    const inProgress = activeOrders.filter((o) => o.status === 'قيد التشغيل').length;
    const readyCompleted = activeOrders.filter((o) => o.status === 'تم التنفيذ').length;
    const draftCount = activeOrders.filter((o) => o.status === 'Draft').length;

    const nonArchivedOrders = orders.filter((o) => !o.is_archived);
    const totalRevenue = nonArchivedOrders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
    const totalDeposits = nonArchivedOrders.reduce((acc, o) => acc + (Number(o.deposit_paid) || 0), 0);
    const pendingBalance = Math.max(0, totalRevenue - totalDeposits);
    const collectionRate = totalRevenue > 0 ? Math.round((totalDeposits / totalRevenue) * 100) : 0;

    const criticalOrders = activeOrders.filter((o) => {
      const diff = getDaysDiff(o.delivery_date);
      return diff !== null && diff <= 3;
    });

    const totalTrips = truckManifests.length;
    const totalCargoItems = truckManifests.reduce((sum, m) => sum + (m.items?.length || 0), 0);
    const returnItems = truckManifests.reduce(
      (sum, m) => sum + (m.items?.filter((it) => it.itemType === 'return')?.length || 0),
      0
    );

    const stageCounts: Record<string, number> = {};
    STAGES_LIST.forEach((st) => (stageCounts[st] = 0));
    activeOrders.forEach((o) => {
      const st = o.current_stage || 'لم يبدأ';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    });

    return {
      activeCount: activeOrders.length,
      deliveredCount: deliveredOrders.length,
      archivedCount: archivedOrders.length,
      readyToArchiveCount: lifecycle.readyToArchiveOrders.length,
      inProgress,
      readyCompleted,
      draftCount,
      totalRevenue,
      totalDeposits,
      pendingBalance,
      collectionRate,
      criticalCount: criticalOrders.length,
      totalTrips,
      totalCargoItems,
      returnItems,
      stageCounts,
    };
  }, [lifecycle, orders, truckManifests, now]);

  // Compact active workshop room breakdown (only currently active workshop queue)
  const activeCategoryCounts = useMemo(
    () => getCategoryCounts(lifecycle.activeOrders),
    [lifecycle.activeOrders]
  );

  // Recent months pulse for quick jumping to Smart Search Month Center
  const { availableMonths, monthsMap } = useMemo(
    () => computeMonthlySummaryMap(orders.filter((o) => !o.is_archived)),
    [orders]
  );
  const recentMonths = useMemo(() => availableMonths.slice(0, 4), [availableMonths]);

  const detectedMonth = useMemo(
    () => detectMonthQueryFromText(quickQuery, availableMonths),
    [quickQuery, availableMonths]
  );

  // Lightweight Quick Jump Search preview (top 5 orders + top 3 customers)
  const quickPreview = useMemo(() => {
    const q = normalizeSearchText(quickQuery);
    if (!q) return { orders: [] as JobOrderPopulated[], customers: [] as Customer[] };

    const matchedOrders = orders
      .filter((o) => {
        const hay = normalizeSearchText(
          [
            o.order_number,
            o.room_model_code,
            o.customer?.name,
            o.customer?.phone,
            o.delivery_receipt_number,
            o.job_details?.color_code,
            o.job_details?.batch_number,
          ]
            .filter(Boolean)
            .join(' ')
        );
        return hay.includes(q);
      })
      .slice(0, 5);

    const matchedCustomers = customers
      .filter((c) => {
        const hay = normalizeSearchText(`${c.name} ${c.phone} ${c.address}`);
        return hay.includes(q);
      })
      .slice(0, 3);

    return { orders: matchedOrders, customers: matchedCustomers };
  }, [quickQuery, orders, customers]);

  const handleQuickJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickQuery.trim();
    if (!trimmed) {
      onOpenSmartSearch({});
      return;
    }
    if (detectedMonth) {
      onOpenSmartSearch({ selectedMonth: detectedMonth, monthMode: 'both' });
      return;
    }
    onOpenSmartSearch({ query: trimmed, includeArchived: true });
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* 1. EXECUTIVE COMMAND HERO & 4 PULSE METRICS */}
      <div className="bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3352] rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-[#4B83B8]/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-[#E6C87E] tracking-wide">
              غرفة القيادة التنفيذية · مصنع النجار فيرنتشر
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-serif">
              لوحة القيادة والرقابة اللحظية
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              ملخص مباشر لنبض التشغيل بالورش، الالتزامات الحرجة، السيولة، وحركة التسليمات — ولأي جرد شهري أو حصر غرف تفصيلي انتقل مباشرة إلى مركز البحث الشامل.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenSmartSearch({})}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4B83B8]/30 hover:bg-[#4B83B8]/45 border border-blue-300/30 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4 text-sky-300" />
              <span>البحث الشامل وحصر الغرف والشهور</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة الملخص</span>
            </button>

            {hasPerm('order:create') && (
              <button
                type="button"
                onClick={onOpenNewOrderModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C6A355] hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black transition-colors cursor-pointer shadow-md whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>أمر شغل جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 EXECUTIVE PULSE CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[#4B83B8]/30 relative z-10">
          {/* Card 1: Financial Volume */}
          {hasPerm('finance:read') ? (
            <button
              type="button"
              onClick={() => onOpenSmartSearch({ auditMode: 'delivered_with_balance' })}
              className="text-right bg-[#16253B]/75 hover:bg-[#16253B] rounded-2xl p-4 border border-[#4B83B8]/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-blue-200 text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-300" />
                  <span>التعاقدات النشطة</span>
                </span>
                <span className="font-mono text-[11px] text-emerald-300 tabular-nums">
                  {radarMetrics.collectionRate}% مسدد
                </span>
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-white">
                {radarMetrics.totalRevenue.toLocaleString('en-US')}{' '}
                <span className="text-xs font-sans font-bold text-amber-300">ج.م</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between font-mono tabular-nums">
                <span>محصل: {radarMetrics.totalDeposits.toLocaleString('en-US')}</span>
                <span className="text-rose-300">متبقي: {radarMetrics.pendingBalance.toLocaleString('en-US')}</span>
              </div>
            </button>
          ) : (
            <div className="bg-[#16253B]/60 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-center items-center text-center opacity-75">
              <ShieldCheck className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-[11px] font-bold text-slate-300">المؤشرات المالية محجوبة</span>
            </div>
          )}

          {/* Card 2: Active Factory Queue */}
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="text-right bg-[#16253B]/75 hover:bg-[#16253B] rounded-2xl p-4 border border-[#4B83B8]/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-blue-200 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-[#4B83B8]" />
                <span>أوامر الشغل الجارية</span>
              </span>
              <span className="text-[11px] text-emerald-300 font-bold tabular-nums">
                {radarMetrics.readyCompleted} جاهز للتسليم
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-white">
              {radarMetrics.activeCount}{' '}
              <span className="text-xs font-sans font-bold text-blue-200">أمر بالورشة</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between tabular-nums">
              <span>تشغيل: {radarMetrics.inProgress}</span>
              <span>مسودات: {radarMetrics.draftCount}</span>
            </div>
          </button>

          {/* Card 3: Critical SLA */}
          <button
            type="button"
            onClick={() => onOpenSmartSearch({ auditMode: 'overdue_now', sortBy: 'delay_desc' })}
            className="text-right bg-[#16253B]/75 hover:bg-[#16253B] rounded-2xl p-4 border border-rose-400/35 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-rose-300 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>حرج أو متأخر (SLA)</span>
              </span>
              <span className="text-[10px] text-rose-200 font-bold">خلال 72 ساعة</span>
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-rose-300">
              {radarMetrics.criticalCount}{' '}
              <span className="text-xs font-sans font-bold text-rose-200">أمر يحتاج متابعة</span>
            </div>
            <div className="text-[11px] text-amber-300 mt-1 font-bold">
              اضغط لعرضها في البحث الشامل
            </div>
          </button>

          {/* Card 4: Deliveries & Logistics */}
          <button
            type="button"
            onClick={() => onNavigateTab('deliveries')}
            className="text-right bg-[#16253B]/75 hover:bg-[#16253B] rounded-2xl p-4 border border-[#4B83B8]/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-blue-200 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>التسليمات والأرشفة</span>
              </span>
              <span className="text-[11px] text-amber-300 font-bold tabular-nums">
                {radarMetrics.totalTrips} رحلة شحن
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-white">
              {radarMetrics.deliveredCount}{' '}
              <span className="text-xs font-sans font-bold text-blue-200">بانتظار التقفيل</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between tabular-nums">
              <span>جاهز للأرشفة: {radarMetrics.readyToArchiveCount}</span>
              <span>مؤرشف: {radarMetrics.archivedCount}</span>
            </div>
          </button>
        </div>

        {/* WORKSHOP STAGE BOTTLENECK RADAR BAR */}
        <div className="mt-5 pt-4 border-t border-[#4B83B8]/30 relative z-10">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-2.5 font-bold">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>رادار مراحل التصنيع للأوامر الجارية (انقر على أي مرحلة لفتح قائمة أوامرها):</span>
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-300">
              {radarMetrics.activeCount} أمر داخل خطوط الإنتاج
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
            {STAGES_LIST.map((st) => {
              const count = radarMetrics.stageCounts[st] || 0;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onOpenSmartSearch({ stage: st })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-blue-100 border border-white/10 transition-colors cursor-pointer"
                >
                  <span>{st}</span>
                  <span className="font-mono text-[11px] font-black tabular-nums opacity-85">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. QUICK JUMP SEARCH BAR (PASS-THROUGH TO SMART SEARCH OR ORDER CARD) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <form onSubmit={handleQuickJumpSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#C6A355] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="وصول سريع: اكتب اسم العميل، رقم الأمر JO-...، الهاتف، أو اسم الشهر (سبتمبر، أكتوبر، نوفمبر)..."
              className="w-full pr-10 pl-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-[#C6A355] text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold outline-none transition-colors"
            />
            {quickQuery && (
              <button
                type="button"
                onClick={() => setQuickQuery('')}
                aria-label="مسح البحث السريع"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#16253B] hover:bg-[#233B5D] text-white text-xs sm:text-sm font-black transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{detectedMonth ? `استعلام شهر ${formatMonthYearArabic(detectedMonth)}` : 'فتح في البحث الشامل'}</span>
            <ArrowUpLeft className="w-4 h-4 text-[#C6A355]" />
          </button>
        </form>

        {/* Instant Quick Jump Preview */}
        {quickQuery.trim() && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {detectedMonth && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span>
                    {formatMonthYearArabic(detectedMonth)}: تعاقد{' '}
                    <strong className="font-mono tabular-nums">{monthsMap[detectedMonth]?.contractCount || 0}</strong> · تسليم{' '}
                    <strong className="font-mono tabular-nums">{monthsMap[detectedMonth]?.deliveryCount || 0}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSmartSearch({ selectedMonth: detectedMonth, monthMode: 'both' })}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer whitespace-nowrap"
                >
                  عرض تحليل الشهر الكامل
                </button>
              </div>
            )}

            {quickPreview.customers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black text-slate-500">العملاء:</span>
                {quickPreview.customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onOpenSmartSearch({ query: c.name, includeArchived: true })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                    <span className="font-mono text-[10px] opacity-75">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}

            {quickPreview.orders.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {quickPreview.orders.map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => onSelectOrder(ord)}
                    className="w-full text-right px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                        <span className="font-mono text-amber-800 dark:text-amber-300">{ord.order_number}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="truncate">{ord.customer?.name || 'غير مسجل'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {ord.room_model_code} · {ord.current_stage || 'لم يبدأ'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                      {ord.is_archived ? 'مؤرشف' : ord.status === 'Draft' ? 'مسودة' : ord.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : !detectedMonth && quickPreview.customers.length === 0 ? (
              <div className="text-xs font-bold text-slate-500 text-center py-2">
                لا توجد نتائج فورية مطابقة — اضغط «فتح في البحث الشامل» لتوسيع نطاق التواريخ والأرشيف.
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 3. TWO COMPACT EXECUTIVE SNAPSHOTS (ACTIVE ROOMS + RECENT MONTHS -> DEEP-LINK TO SMART SEARCH) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Snapshot A: Active Workshop Rooms Load */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C6A355]" />
                <span>توزيع الغرف الجارية بالورش الآن</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اضغط على أي تصنيف لفتح حصره الكامل في «البحث الشامل»
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSmartSearch({})}
              className="text-xs font-black text-[#233B5D] dark:text-[#8CB4D9] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              الحصر الشامل ←
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {FURNITURE_CATEGORIES.slice(0, 7).map((cat) => {
              const count = activeCategoryCounts[cat.id] || 0;
              const pct =
                radarMetrics.activeCount > 0 ? Math.round((count / radarMetrics.activeCount) * 100) : 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onOpenSmartSearch({ category: cat.id })}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-[#EBF3FA] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">
                    {cat.shortName}
                  </div>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-lg font-black font-mono tabular-nums text-[#16253B] dark:text-white">
                      {count}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-500">{pct}%</span>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="p-3 rounded-2xl bg-[#16253B] text-white text-right transition-colors cursor-pointer hover:bg-[#233B5D]"
            >
              <div className="text-[11px] font-black text-[#E6C87E]">كافة الجارية</div>
              <div className="text-lg font-black font-mono tabular-nums mt-1.5">
                {radarMetrics.activeCount}
              </div>
            </button>
          </div>
        </div>

        {/* Snapshot B: Monthly Pulse (Latest 4 Months -> Smart Search Month Center) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#4B83B8]" />
                <span>نبض الشهور (تعاقدات مقابل تسليمات)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اضغط على أي شهر لفتح مركز الاستعلام والمقارنة في «البحث الشامل»
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSmartSearch({})}
              className="text-xs font-black text-[#233B5D] dark:text-[#8CB4D9] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              كل الشهور ←
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recentMonths.map((m) => {
              const data = monthsMap[m];
              const deliveryPct =
                data.deliveryCount > 0 ? Math.round((data.deliveredCount / data.deliveryCount) * 100) : 0;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onOpenSmartSearch({ selectedMonth: m, monthMode: 'both' })}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-[#EBF3FA] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatMonthYearArabic(m)}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{m}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
                    <span className="text-blue-700 dark:text-blue-300">تعاقد: {data.contractCount}</span>
                    <span className="text-emerald-700 dark:text-emerald-300">تسليم: {data.deliveryCount}</span>
                    <span className="font-mono text-slate-500">{deliveryPct}% منجز</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. QUICK OPERATIONAL NAVIGATION FOOTER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab('orders')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#4B83B8] text-right transition-colors cursor-pointer flex items-center justify-between gap-2"
        >
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">أوامر الشغل الجارية</span>
          <Clock className="w-4 h-4 text-[#4B83B8] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('deliveries')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-right transition-colors cursor-pointer flex items-center justify-between gap-2"
        >
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">التسليمات والتحصيل</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('truck-manifest')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-right transition-colors cursor-pointer flex items-center justify-between gap-2"
        >
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">
            حمولات الشحن ({radarMetrics.totalCargoItems})
          </span>
          <Truck className="w-4 h-4 text-amber-600 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('archive')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 text-right transition-colors cursor-pointer flex items-center justify-between gap-2"
        >
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">
            الأرشيف ({radarMetrics.archivedCount})
          </span>
          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
        </button>
      </div>
    </div>
  );
};
