import React, { useEffect, useMemo, useState } from 'react';
import {
  Customer,
  DeliveryReceiptRecord,
  JobOrderPopulated,
  OrderStatus,
  ProductionStage,
  TruckManifest,
} from '../types';
import { FURNITURE_CATEGORIES, FurnitureCategory } from '../utils/furnitureClassifier';
import {
  AuditFilterMode,
  buildEnrichedSearchOrders,
  buildSmartSearchCsv,
  computeSmartSearchAnalytics,
  DateAxisMode,
  DEFAULT_SMART_SEARCH_FILTERS,
  filterAndSortSmartSearchOrders,
  resolveEffectiveDateRanges,
  SmartSearchFilters,
  SmartSortBy,
  TimePresetId,
} from '../utils/smartSearchEngine';
import { printElementById } from '../utils/printHelper';
import {
  AlertTriangle,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  Filter,
  Layers,
  Package,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Wallet,
  X,
} from 'lucide-react';

interface SavedSmartQuery {
  id: string;
  label: string;
  filters: SmartSearchFilters;
}

interface SmartSearchStudioProps {
  orders: JobOrderPopulated[];
  customers: Customer[];
  receipts: DeliveryReceiptRecord[];
  truckManifests: TruckManifest[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  onOpenDeliveryReceipt: (order: JobOrderPopulated) => void;
  onEditOrder?: (order: JobOrderPopulated) => void;
}

const SAVED_QUERIES_STORAGE_KEY = 'alnajjar_smart_search_saved_v1';

const PRODUCTION_STAGES: ProductionStage[] = [
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

const QUICK_TIME_PRESETS: Array<{ id: TimePresetId; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'هذا الأسبوع' },
  { id: 'last_week', label: 'الأسبوع الماضي' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'this_quarter', label: 'هذا الربع' },
  { id: 'this_year', label: 'هذه السنة (2026)' },
];

const DATE_AXIS_OPTIONS: Array<{ id: DateAxisMode; label: string; hint: string }> = [
  { id: 'actual_delivery', label: 'التسليم الفعلي', hint: 'حسب تاريخ إقرار الاستلام / التسليم' },
  { id: 'scheduled_delivery', label: 'موعد التسليم بالعقد', hint: 'الالتزامات والمواعيد المجدولة' },
  { id: 'contract_date', label: 'تاريخ التعاقد', hint: 'حجم المبيعات والعقود الجديدة' },
  { id: 'both', label: 'نطاق مزدوج (تعاقد + تسليم)', hint: 'بحث متقاطع بين التعاقد والتسليم' },
];

const ROLE_SCENARIOS: Array<{
  id: string;
  label: string;
  description: string;
  patch: Partial<SmartSearchFilters>;
}> = [
  {
    id: 'week_delivered',
    label: 'جرد تسليمات الأسبوع',
    description: 'الغرف المسلمة فعلياً هذا الأسبوع',
    patch: { ...DEFAULT_SMART_SEARCH_FILTERS, dateAxis: 'actual_delivery', timePreset: 'this_week' },
  },
  {
    id: 'month_contracts',
    label: 'تعاقدات هذا الشهر',
    description: 'العقود المبرمة خلال الشهر الحالي',
    patch: { ...DEFAULT_SMART_SEARCH_FILTERS, dateAxis: 'contract_date', timePreset: 'this_month' },
  },
  {
    id: 'delivered_balance',
    label: 'اتسلمت وعليها متبقي مالي',
    description: 'تحصيل المتبقي على أوامر تم تسليمها/شحنها',
    patch: { ...DEFAULT_SMART_SEARCH_FILTERS, dateAxis: 'actual_delivery', timePreset: 'all', auditMode: 'delivered_with_balance' },
  },
  {
    id: 'missing_receipt',
    label: 'اتسلمت بدون إقرار استلام',
    description: 'أوامر مسلمة وتحتاج توثيق إقرار استلام',
    patch: { ...DEFAULT_SMART_SEARCH_FILTERS, dateAxis: 'actual_delivery', timePreset: 'all', auditMode: 'missing_receipt' },
  },
  {
    id: 'ready_unshipped',
    label: 'جاهزة تنتظر الشحن',
    description: 'تم تنفيذها ولم تدرج بشيت حمولة عربية',
    patch: { ...DEFAULT_SMART_SEARCH_FILTERS, dateAxis: 'scheduled_delivery', timePreset: 'all', auditMode: 'ready_unshipped' },
  },
  {
    id: 'overdue_now',
    label: 'متأخرة عن موعد العقد',
    description: 'تجاوزت موعد التسليم ولم تسلم بعد',
    patch: { ...DEFAULT_SMART_SEARCH_FILTERS, dateAxis: 'scheduled_delivery', timePreset: 'all', auditMode: 'overdue_now', sortBy: 'delay_desc' },
  },
];

export const SmartSearchStudio: React.FC<SmartSearchStudioProps> = ({
  orders,
  customers,
  receipts,
  truckManifests,
  onSelectOrder,
  onOpenDeliveryReceipt,
  onEditOrder,
}) => {
  const [filters, setFilters] = useState<SmartSearchFilters>(DEFAULT_SMART_SEARCH_FILTERS);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [saveQueryName, setSaveQueryName] = useState<string>('');
  const [showSaveInput, setShowSaveInput] = useState<boolean>(false);
  const [savedQueries, setSavedQueries] = useState<SavedSmartQuery[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_QUERIES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_QUERIES_STORAGE_KEY, JSON.stringify(savedQueries));
    } catch {
      // ignore storage quota failures
    }
  }, [savedQueries]);

  const enrichedOrders = useMemo(
    () =>
      buildEnrichedSearchOrders({
        orders,
        receipts,
        truckManifests,
      }),
    [orders, receipts, truckManifests]
  );

  // Extract unique approvers and delivery branches for dynamic filter dropdowns
  const availableApprovers = useMemo(() => {
    const set = new Set<string>();
    enrichedOrders.forEach((item) => {
      if (item.approver && item.approver !== 'غير محدد') {
        set.add(item.approver);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [enrichedOrders]);

  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((r) => {
      if (r.delivery_branch?.trim()) set.add(r.delivery_branch.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [receipts]);

  const matchedOrders = useMemo(
    () =>
      filterAndSortSmartSearchOrders({
        enrichedOrders,
        filters,
      }),
    [enrichedOrders, filters]
  );

  const analytics = useMemo(
    () =>
      computeSmartSearchAnalytics({
        matchedOrders,
        allEnrichedOrders: enrichedOrders,
        filters,
        truckManifests,
        customers,
      }),
    [matchedOrders, enrichedOrders, filters, truckManifests, customers]
  );

  const effectiveRanges = useMemo(
    () => resolveEffectiveDateRanges(filters),
    [filters]
  );

  const updateFilter = <K extends keyof SmartSearchFilters>(
    key: K,
    value: SmartSearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveCurrentQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const label = saveQueryName.trim();
    if (!label) return;
    const next: SavedSmartQuery = {
      id: `sq-${Date.now()}`,
      label,
      filters: { ...filters },
    };
    setSavedQueries((prev) => [next, ...prev.slice(0, 9)]);
    setSaveQueryName('');
    setShowSaveInput(false);
  };

  const handleExportCsv = () => {
    const csv = buildSmartSearchCsv(matchedOrders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `alnajjar-smart-search-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetAllFilters = () => {
    setFilters(DEFAULT_SMART_SEARCH_FILTERS);
  };

  const hasActiveFilters =
    Boolean(filters.query.trim()) ||
    filters.timePreset !== 'all' ||
    Boolean(filters.contractFrom || filters.contractTo || filters.deliveryFrom || filters.deliveryTo) ||
    filters.status !== 'all' ||
    filters.stage !== 'all' ||
    filters.category !== 'all' ||
    filters.approver !== 'all' ||
    filters.branch !== 'all' ||
    filters.auditMode !== 'all' ||
    filters.includeArchived;

  return (
    <div className="space-y-6">
      {/* 1. HERO HEADER & PRIMARY COMMAND BAR */}
      <div className="no-print bg-gradient-to-l from-[#10213A] via-[#1B3152] to-[#152844] text-white rounded-3xl p-5 sm:p-8 border border-[#4B83B8]/30 shadow-xl relative overflow-hidden">
        <div className="absolute -left-24 -top-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs font-black mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>وحدة الاستعلام الشامل والرقابة الزمنية • Smart Query Studio</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black font-serif text-white">
              البحث الشامل وجرد التسليمات والتعاقدات
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              احصل فوراً على إجابات دقيقة: كم غرفة سُلّمت هذا الأسبوع أو الشهر أو السنة، تفصيل الغرف، البحث بنطاق تاريخ التعاقد والتسليم معاً، ومراقبة الفجوات المالية وإقرارات الاستلام.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowSaveInput((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/15 cursor-pointer transition-colors"
            >
              <Bookmark className="w-4 h-4 text-amber-300" />
              <span>حفظ هذا البحث</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={matchedOrders.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg cursor-pointer transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => printElementById('printable-smart-search-report', 'landscape')}
              disabled={matchedOrders.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير (A4)</span>
            </button>
          </div>
        </div>

        {/* Save Query Inline Form */}
        {showSaveInput && (
          <form
            onSubmit={handleSaveCurrentQuery}
            className="relative z-10 mb-5 p-3 rounded-2xl bg-slate-950/60 border border-amber-400/30 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={saveQueryName}
              onChange={(e) => setSaveQueryName(e.target.value)}
              placeholder="اكتب اسماً لهذا البحث المحفوظ (مثلاً: غرف شبابي مستحقة في نوفمبر)..."
              className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer hover:bg-amber-300"
            >
              تثبيت البحث
            </button>
            <button
              type="button"
              onClick={() => setShowSaveInput(false)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </form>
        )}

        {/* Main Search Input + Date Axis */}
        <div className="relative z-10 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6 relative">
              <Search className="w-4 h-4 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                aria-label="البحث الشامل باسم العميل أو رقم الأمر أو الإقرار أو الموديل"
                placeholder="ابحث باسم العميل، الهاتف، رقم الأمر JO-...، رقم الإقرار DR-...، الموديل، القماش أو المهندس..."
                className="w-full pr-10 pl-10 py-3.5 rounded-2xl bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-bold shadow-inner outline-none focus:ring-4 focus:ring-amber-400/30"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={() => updateFilter('query', '')}
                  aria-label="مسح نص البحث"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="lg:col-span-4">
              <select
                value={filters.dateAxis}
                onChange={(e) => updateFilter('dateAxis', e.target.value as DateAxisMode)}
                aria-label="مقياس التاريخ الزمني"
                className="w-full h-full px-3.5 py-3 rounded-2xl bg-slate-900/70 border border-white/20 text-white text-xs font-black outline-none cursor-pointer"
              >
                {DATE_AXIS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="text-slate-900 bg-white">
                    مقياس التاريخ: {opt.label} ({opt.hint})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={filters.weekStartsOn}
                onChange={(e) => updateFilter('weekStartsOn', e.target.value as 'saturday' | 'sunday')}
                aria-label="بداية الأسبوع المحاسبي"
                className="w-full h-full px-3 py-3 rounded-2xl bg-slate-900/70 border border-white/20 text-amber-200 text-xs font-black outline-none cursor-pointer"
              >
                <option value="saturday" className="text-slate-900 bg-white">الأسبوع: السبت–الجمعة</option>
                <option value="sunday" className="text-slate-900 bg-white">الأسبوع: الأحد–الخميس</option>
              </select>
            </div>
          </div>

          {/* Quick Time Presets Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-black text-blue-200 ml-1">الفترة الزمنية:</span>
            {QUICK_TIME_PRESETS.map((preset) => {
              const active = filters.timePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      timePreset: preset.id,
                      contractFrom: preset.id === 'all' ? '' : prev.contractFrom,
                      contractTo: preset.id === 'all' ? '' : prev.contractTo,
                      deliveryFrom: preset.id === 'all' ? '' : prev.deliveryFrom,
                      deliveryTo: preset.id === 'all' ? '' : prev.deliveryTo,
                    }));
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                      : 'bg-white/10 text-slate-100 border-white/15 hover:bg-white/20'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}

            {effectiveRanges.presetRange && (
              <span className="text-[11px] font-mono bg-slate-950/60 border border-white/15 px-3 py-1 rounded-xl text-emerald-300 mr-auto">
                {effectiveRanges.presetRange.startDate} ← {effectiveRanges.presetRange.endDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. ROLE SCENARIOS & SAVED QUERIES BAR */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">استعلامات إدارية جاهزة:</span>
            {ROLE_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                title={sc.description}
                onClick={() => setFilters({ ...DEFAULT_SMART_SEARCH_FILTERS, ...sc.patch })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-slate-800 dark:text-slate-200 text-xs font-black border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                {sc.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedPanel((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 text-xs font-black border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showAdvancedPanel ? 'إخفاء الفلاتر المتقدمة' : 'إظهار الفلاتر المتقدمة'}</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-black border border-rose-200 dark:border-rose-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </button>
            )}
          </div>
        </div>

        {savedQueries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-black text-amber-700 dark:text-amber-400">استعلاماتك المحفوظة:</span>
            {savedQueries.map((sq) => (
              <div
                key={sq.id}
                className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl px-2.5 py-1"
              >
                <button
                  type="button"
                  onClick={() => setFilters(sq.filters)}
                  className="text-xs font-black text-amber-950 dark:text-amber-200 hover:underline cursor-pointer"
                >
                  {sq.label}
                </button>
                <button
                  type="button"
                  aria-label={`حذف البحث المحفوظ ${sq.label}`}
                  onClick={() => setSavedQueries((prev) => prev.filter((item) => item.id !== sq.id))}
                  className="text-amber-700 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. COLLAPSIBLE MULTI-FACETED FILTER MATRIX */}
      {showAdvancedPanel && (
        <div className="no-print bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Contract Date From */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>تاريخ التعاقد (من):</span>
              </label>
              <input
                type="date"
                aria-label="تاريخ التعاقد من"
                value={filters.contractFrom}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    timePreset: 'custom',
                    dateAxis:
                      prev.deliveryFrom || prev.deliveryTo
                        ? 'both'
                        : 'contract_date',
                    contractFrom: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>

            {/* Contract Date To */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>تاريخ التعاقد (إلى):</span>
              </label>
              <input
                type="date"
                aria-label="تاريخ التعاقد إلى"
                value={filters.contractTo}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    timePreset: 'custom',
                    dateAxis:
                      prev.deliveryFrom || prev.deliveryTo
                        ? 'both'
                        : 'contract_date',
                    contractTo: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>

            {/* Delivery Date From */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تاريخ التسليم (من):</span>
              </label>
              <input
                type="date"
                aria-label="تاريخ التسليم من"
                value={filters.deliveryFrom}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    timePreset: 'custom',
                    dateAxis:
                      prev.contractFrom || prev.contractTo
                        ? 'both'
                        : prev.dateAxis === 'scheduled_delivery'
                        ? 'scheduled_delivery'
                        : 'actual_delivery',
                    deliveryFrom: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Delivery Date To */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تاريخ التسليم (إلى):</span>
              </label>
              <input
                type="date"
                aria-label="تاريخ التسليم إلى"
                value={filters.deliveryTo}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    timePreset: 'custom',
                    dateAxis:
                      prev.contractFrom || prev.contractTo
                        ? 'both'
                        : prev.dateAxis === 'scheduled_delivery'
                        ? 'scheduled_delivery'
                        : 'actual_delivery',
                    deliveryTo: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Room Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">تصنيف الغرفة / القطعة:</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value as FurnitureCategory)}
                aria-label="تصنيف الغرفة"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">جميع الغرف والأصناف</option>
                {FURNITURE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="other">أخرى</option>
              </select>
            </div>

            {/* Order Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">حالة الأمر:</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value as 'all' | OrderStatus)}
                aria-label="حالة الأمر"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">كافة الحالات</option>
                <option value="تسليم">تم التسليم (تسليم)</option>
                <option value="تم التنفيذ">جاهز للتسليم (تم التنفيذ)</option>
                <option value="قيد التشغيل">قيد التشغيل بالورشة</option>
                <option value="Draft">مسودة غير معتمدة</option>
              </select>
            </div>

            {/* Workshop Stage */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">مرحلة الورشة:</label>
              <select
                value={filters.stage}
                onChange={(e) => updateFilter('stage', e.target.value as 'all' | ProductionStage)}
                aria-label="مرحلة الورشة"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">كل مراحل الإنتاج</option>
                {PRODUCTION_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Approver / Engineer */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">المهندس / المعتمد:</label>
              <select
                value={filters.approver}
                onChange={(e) => updateFilter('approver', e.target.value)}
                aria-label="المهندس أو المعتمد"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">جميع المهندسين والمعتمدين</option>
                {availableApprovers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 items-end">
            {/* Audit / Control Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">فلتر الرقابة والفجوات:</label>
              <select
                value={filters.auditMode}
                onChange={(e) => updateFilter('auditMode', e.target.value as AuditFilterMode)}
                aria-label="فلتر الرقابة والفجوات"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">بدون قيد رقابي إضافي</option>
                <option value="missing_receipt">اتسلمت بدون إقرار استلام ({analytics.missingReceiptCount})</option>
                <option value="delivered_with_balance">اتسلمت/شُحنت وعليها متبقي مالي</option>
                <option value="ready_unshipped">جاهزة ولم تدرج بحمولة عربية</option>
                <option value="overdue_now">متأخرة عن موعد العقد الآن</option>
                <option value="on_time_only">التزمت بموعد التسليم فقط</option>
                <option value="delayed_delivered">اتسلمت متأخرة عن موعد العقد</option>
              </select>
            </div>

            {/* Branch Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">فرع التسليم (بالإقرار):</label>
              <select
                value={filters.branch}
                onChange={(e) => updateFilter('branch', e.target.value)}
                aria-label="فرع التسليم"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">كل الفروع ونقاط التسليم</option>
                {availableBranches.map((br) => (
                  <option key={br} value={br}>
                    {br}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">ترتيب النتائج:</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value as SmartSortBy)}
                aria-label="ترتيب النتائج"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="delivery_desc">تاريخ التسليم (الأحدث أولاً)</option>
                <option value="delivery_asc">تاريخ التسليم (الأقرب أولاً)</option>
                <option value="contract_desc">تاريخ التعاقد (الأحدث أولاً)</option>
                <option value="price_desc">الأعلى قيمة تعاقدية</option>
                <option value="remaining_desc">الأعلى متبقي للتحصيل</option>
                <option value="delay_desc">الأكثر تأخيراً</option>
              </select>
            </div>

            {/* Archived Toggle + View Mode */}
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeArchived}
                  onChange={(e) => updateFilter('includeArchived', e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
                <span>شمل المؤرشف</span>
              </label>

              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  جدول
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  كروت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. LIVE EXECUTIVE KPI & ROOM BREAKDOWN STRIP */}
      <div id="printable-smart-search-report" className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Rooms / Orders + Period Delta */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>إجمالي الغرف / الأوامر المطابقة</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {analytics.totalCount}
              </span>
              <span className="text-xs font-bold text-slate-500">غرفة / أمر</span>
              {analytics.deltaCount !== null && (
                <span
                  className={`mr-auto inline-flex items-center gap-0.5 text-[11px] font-black px-2 py-0.5 rounded-full ${
                    analytics.deltaCount >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {analytics.deltaCount >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {analytics.deltaCount > 0 ? `+${analytics.deltaCount}` : analytics.deltaCount} عن الفترة السابقة
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold">
              <span className="text-emerald-700 dark:text-emerald-400">
                سُلّم: {analytics.deliveredCount} (بإقرار: {analytics.deliveredWithReceiptCount})
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-700 dark:text-blue-400">جاهز: {analytics.readyCount}</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700 dark:text-amber-400">تشغيل: {analytics.inProgressCount}</span>
            </div>
          </div>

          {/* Card 2: Compliance & Lead Time */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>الالتزام بالمواعيد ودورة التصنيع</span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                {analytics.onTimePercent !== null ? `${analytics.onTimePercent}%` : '---'}
              </span>
              <span className="text-xs font-bold text-slate-500">التزام بالموعد</span>
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-2 space-y-0.5">
              <div>
                في الموعد: <strong>{analytics.onTimeCount}</strong> • متأخر عند التسليم:{' '}
                <strong>{analytics.lateDeliveredCount}</strong>
                {analytics.avgDelayDays !== null && ` (متوسط ${analytics.avgDelayDays} يوم)`}
              </div>
              <div>
                متوسط دورة التنفيذ:{' '}
                <strong>
                  {analytics.avgLeadTimeDays !== null ? `${analytics.avgLeadTimeDays} يوم` : 'غير متاح'}
                </strong>
              </div>
            </div>
          </div>

          {/* Card 3: Financials */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>الملخص المالي للنتائج</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {analytics.totalValue.toLocaleString()} <span className="text-xs font-bold">ج.م</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold mt-2">
              <span className="text-emerald-700 dark:text-emerald-400">
                محصل: {analytics.totalDeposit.toLocaleString()} ({analytics.collectionPercent}%)
              </span>
              <span className={analytics.remainingBalance > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}>
                متبقي: {analytics.remainingBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 4: Audit & Returns Alerts */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>مؤشرات الرقابة والمرتجعات</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold mt-1">
              <button
                type="button"
                onClick={() => updateFilter('auditMode', 'missing_receipt')}
                className="text-right px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 cursor-pointer"
              >
                بدون إقرار: <strong>{analytics.missingReceiptCount}</strong>
              </button>
              <button
                type="button"
                onClick={() => updateFilter('auditMode', 'delivered_with_balance')}
                className="text-right px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 hover:bg-rose-100 cursor-pointer"
              >
                سُلّم بمتبقي: <strong>{analytics.deliveredWithBalanceCount}</strong>
              </button>
              <button
                type="button"
                onClick={() => updateFilter('auditMode', 'ready_unshipped')}
                className="text-right px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 hover:bg-blue-100 cursor-pointer"
              >
                جاهز للشحن: <strong>{analytics.readyUnshippedCount}</strong>
              </button>
              <div className="text-right px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                مرتجع/نواقص: <strong>{analytics.returnsInPeriod.length}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Interactive Chips */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5 ml-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>توزيع الغرف المطابقة (انقر للتصفية):</span>
            </span>
            <button
              type="button"
              onClick={() => updateFilter('category', 'all')}
              className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer border ${
                filters.category === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-400 dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              الكل ({analytics.totalCount})
            </button>
            {analytics.categoryBreakdown.map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() =>
                  updateFilter('category', filters.category === cat.category ? 'all' : cat.category)
                }
                className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer border transition-colors ${
                  filters.category === cat.category
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                {cat.label}: <strong>{cat.count}</strong>
                <span className="text-[10px] opacity-75 mr-1">({cat.deliveredCount} مسلّم)</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. CUSTOMER 360 CONSOLIDATED BANNER (when results belong to 1 customer) */}
        {analytics.customer360 && (
          <div className="bg-gradient-to-l from-emerald-50 to-indigo-50 dark:from-emerald-950/30 dark:to-indigo-950/30 rounded-2xl p-4 sm:p-5 border border-emerald-300 dark:border-emerald-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    ملف العميل المجمع 360°
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {analytics.customer360.customerName}
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                    {analytics.customer360.customerPhone}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">
                  إجمالي الغرف: <strong>{analytics.customer360.totalOrders}</strong> • سُلّم:{' '}
                  <strong>{analytics.customer360.deliveredCount}</strong> • جاهز:{' '}
                  <strong>{analytics.customer360.readyCount}</strong> • تشغيل:{' '}
                  <strong>{analytics.customer360.inProgressCount}</strong> • إقرارات مرتبطة:{' '}
                  <strong>{analytics.customer360.receiptCount}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-slate-400 font-sans">إجمالي العقود</span>
                <strong className="text-slate-900 dark:text-white">
                  {analytics.customer360.totalValue.toLocaleString()} ج.م
                </strong>
              </div>
              <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-slate-400 font-sans">المدفوع</span>
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {analytics.customer360.totalDeposit.toLocaleString()} ج.م
                </strong>
              </div>
              <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-slate-400 font-sans">المتبقي</span>
                <strong className={analytics.customer360.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {analytics.customer360.remainingBalance.toLocaleString()} ج.م
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* 6. RESULTS TABLE OR CARDS */}
        {matchedOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              لا توجد نتائج مطابقة لشروط البحث الحالية
            </h3>
            <p className="text-xs font-bold text-slate-500">
              جرب توسيع الفترة الزمنية أو تغيير مقياس التاريخ (التسليم الفعلي / موعد العقد / تاريخ التعاقد) أو إعادة ضبط الفلاتر.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3">رقم الأمر</th>
                    <th className="py-3 px-3">العميل</th>
                    <th className="py-3 px-3">التصنيف والموديل</th>
                    <th className="py-3 px-3">تاريخ التعاقد</th>
                    <th className="py-3 px-3">موعد العقد</th>
                    <th className="py-3 px-3">التسليم الفعلي / المصدر</th>
                    <th className="py-3 px-3">الحالة والورشة</th>
                    <th className="py-3 px-3">الإقرار والشحن</th>
                    <th className="py-3 px-3">المالية (المتبقي)</th>
                    <th className="py-3 px-3 no-print">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {matchedOrders.map((item) => {
                    const { order } = item;
                    const receiptNum = order.delivery_receipt_number || item.linkedReceipt?.receipt_number;
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors align-top"
                      >
                        <td className="py-3 px-3 font-mono font-black text-amber-900 dark:text-amber-300 whitespace-nowrap">
                          <div>{order.order_number}</div>
                          {item.leadTimeDays !== null && (
                            <span className="text-[10px] font-sans text-slate-400">
                              مدة التنفيذ: {item.leadTimeDays} يوم
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-black text-slate-900 dark:text-white">
                            {order.customer?.name || 'غير مسجل'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {order.customer?.phone || ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-200">
                              {item.categoryLabel}
                            </span>
                            {item.approver !== 'غير محدد' && (
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                {item.approver}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {order.room_model_code}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.contractDate || '---'}
                        </td>
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.scheduledDeliveryDate || '---'}
                          </div>
                          {item.isOverdueNow && (
                            <span className="text-[10px] font-sans font-black text-rose-600">
                              متأخر {item.deliveryDelayDays} يوم
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          {order.status === 'تسليم' ? (
                            <div>
                              <span className="font-black text-emerald-700 dark:text-emerald-400">
                                {item.effectiveDeliveryDate || '---'}
                              </span>
                              <div className="text-[10px] font-sans text-slate-500">
                                {item.deliveryDateSource === 'receipt'
                                  ? 'بإقرار استلام'
                                  : item.deliveryDateSource === 'manifest'
                                  ? 'بحمولة عربية'
                                  : 'تقدير موعد العقد'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-sans">لم يُسلّم بعد</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                              order.status === 'تسليم'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'تم التنفيذ'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'Draft'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {order.status === 'Draft' ? 'مسودة' : order.status}
                          </span>
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                            {order.current_stage || 'لم يبدأ'}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="space-y-1">
                            {receiptNum ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono text-[10px] font-black">
                                <CheckCircle2 className="w-3 h-3" />
                                {receiptNum}
                              </span>
                            ) : item.hasMissingReceiptAudit ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                                بدون إقرار!
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">---</span>
                            )}
                            {item.linkedManifest && (
                              <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                عربية {item.linkedManifest.truckNumber} ({item.linkedManifest.driverName})
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {(order.total_price || 0).toLocaleString()}
                          </div>
                          <div
                            className={`text-[10px] font-black ${
                              item.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {item.remainingBalance > 0
                              ? `متبقي: ${item.remainingBalance.toLocaleString()}`
                              : 'خالص السداد'}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap no-print">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectOrder(order)}
                              aria-label={`معاينة كارت الورشة للأمر ${order.order_number}`}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 cursor-pointer"
                              title="كارت الورشة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenDeliveryReceipt(order)}
                              aria-label={`إقرار استلام للأمر ${order.order_number}`}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                              title={receiptNum ? `عرض الإقرار (${receiptNum})` : 'إصدار إقرار استلام'}
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                            {onEditOrder && (
                              <button
                                type="button"
                                onClick={() => onEditOrder(order)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black cursor-pointer"
                              >
                                تعديل
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchedOrders.map((item) => {
              const { order } = item;
              const receiptNum = order.delivery_receipt_number || item.linkedReceipt?.receipt_number;
              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs text-amber-900 dark:text-amber-300">
                        {order.order_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {receiptNum && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-black">
                            {receiptNum}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-800 dark:text-slate-200">
                          {order.status === 'Draft' ? 'مسودة' : order.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {order.customer?.name || 'غير مسجل'}
                    </div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      [{item.categoryLabel}] {order.room_model_code}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <div>تعاقد: {item.contractDate || '---'}</div>
                      <div>تسليم: {item.effectiveDeliveryDate || '---'}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-mono font-black ${
                        item.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {item.remainingBalance > 0
                        ? `متبقي: ${item.remainingBalance.toLocaleString()} ج.م`
                        : 'خالص السداد'}
                    </span>

                    <div className="flex items-center gap-2 no-print">
                      <button
                        type="button"
                        onClick={() => onSelectOrder(order)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 text-xs font-black cursor-pointer"
                      >
                        الكارت
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDeliveryReceipt(order)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer"
                      >
                        {receiptNum ? 'الإقرار' : 'إقرار استلام'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 7. RETURNS / MAINTENANCE IN PERIOD (IF ANY) */}
        {analytics.returnsInPeriod.length > 0 && (
          <div className="bg-rose-50/70 dark:bg-rose-950/20 rounded-2xl p-4 border border-rose-200 dark:border-rose-900 space-y-2">
            <h4 className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-600" />
              <span>سجل المرتجعات والصيانة والنواقص في الفترة ({analytics.returnsInPeriod.length}):</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {analytics.returnsInPeriod.map((ret, idx) => (
                <div
                  key={`${ret.manifestId}-${idx}`}
                  className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-xs"
                >
                  <div className="flex items-center justify-between font-black text-slate-900 dark:text-white">
                    <span>{ret.customerName}</span>
                    <span className="font-mono text-[10px] text-rose-700">{ret.tripDate}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    {ret.qty}× {ret.itemName} • عربية {ret.truckNumber} ({ret.driverName})
                  </div>
                  {ret.returnReason && (
                    <div className="text-[10px] font-bold text-rose-700 mt-0.5">
                      السبب: {ret.returnReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
