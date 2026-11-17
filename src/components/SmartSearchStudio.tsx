import React, { useEffect, useMemo, useState } from 'react';
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
  getCategoryCounts,
  getOrderCategory,
} from '../utils/furnitureClassifier';
import {
  AuditFilterMode,
  buildEnrichedSearchOrders,
  buildSmartSearchCsv,
  computeMonthlySummaryMap,
  computeSmartSearchAnalytics,
  DateAxisMode,
  DEFAULT_SMART_SEARCH_FILTERS,
  detectMonthQueryFromText,
  filterAndSortSmartSearchOrders,
  formatMonthYearArabic,
  resolveEffectiveDateRanges,
  SmartSearchFilters,
  SmartSortBy,
  TimePresetId,
} from '../utils/smartSearchEngine';
import { printElementById } from '../utils/printHelper';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertTriangle,
  Armchair,
  Bed,
  BedDouble,
  Bookmark,
  Boxes,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Package,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sofa,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';

interface SavedSmartQuery {
  id: string;
  label: string;
  filters: SmartSearchFilters;
}

export interface SmartSearchSeed {
  filters: Partial<SmartSearchFilters>;
  nonce: number;
}

interface SmartSearchStudioProps {
  orders: JobOrderPopulated[];
  customers: Customer[];
  receipts: DeliveryReceiptRecord[];
  truckManifests: TruckManifest[];
  initialSeed?: SmartSearchSeed | null;
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
  initialSeed,
  onSelectOrder,
  onOpenDeliveryReceipt,
  onEditOrder,
}) => {
  const { hasPerm } = useAuth();
  const canReadFinance = hasPerm('finance:read');
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
    if (initialSeed) {
      setFilters({
        ...DEFAULT_SMART_SEARCH_FILTERS,
        ...initialSeed.filters,
      });
    }
  }, [initialSeed]);

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

  // Orders scoped respecting includeArchived toggle for monthly center
  const ordersForMonthlyScope = useMemo(
    () => (filters.includeArchived ? orders : orders.filter((o) => !o.is_archived)),
    [orders, filters.includeArchived]
  );

  const { availableMonths, monthsMap: monthsAnalyticsMap } = useMemo(
    () => computeMonthlySummaryMap(ordersForMonthlyScope),
    [ordersForMonthlyScope]
  );

  const detectedMonthQuery = useMemo(
    () => detectMonthQueryFromText(filters.query, availableMonths),
    [filters.query, availableMonths]
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

  // Matched orders BEFORE category filter so all 8 room classification cards stay visible with accurate counts
  const matchedOrdersBeforeCategory = useMemo(
    () =>
      filterAndSortSmartSearchOrders({
        enrichedOrders,
        filters: { ...filters, category: 'all' },
      }),
    [enrichedOrders, filters]
  );

  const categoryInventoryStats = useMemo(() => {
    const baseOrders = matchedOrdersBeforeCategory.map((item) => item.order);
    const counts = getCategoryCounts(baseOrders);
    const categoryValues: Record<FurnitureCategory, number> = {
      all: 0,
      master_bedroom: 0,
      living_room: 0,
      youth_bedroom: 0,
      corner_sofa: 0,
      lazy_boy: 0,
      shoe_cabinet: 0,
      dining_room: 0,
      other: 0,
    };

    baseOrders.forEach((o) => {
      const cat = getOrderCategory(o);
      const val = Number(o.total_price) || 0;
      categoryValues[cat] = (categoryValues[cat] || 0) + val;
      categoryValues.all += val;
    });

    return {
      totalBaseCount: baseOrders.length,
      counts,
      categoryValues,
    };
  }, [matchedOrdersBeforeCategory]);

  const selectedCategoryStageCounts = useMemo(() => {
    const list =
      filters.category === 'all'
        ? matchedOrdersBeforeCategory
        : matchedOrdersBeforeCategory.filter((item) => item.category === filters.category);

    const stageCounts: Record<string, number> = {};
    PRODUCTION_STAGES.forEach((st) => (stageCounts[st] = 0));
    list.forEach((item) => {
      const st = item.order.current_stage || 'لم يبدأ';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    });
    return stageCounts;
  }, [matchedOrdersBeforeCategory, filters.category]);

  const renderCategoryIcon = (iconType: string, className: string = 'w-4 h-4') => {
    switch (iconType) {
      case 'bed-double':
        return <BedDouble className={className} />;
      case 'armchair':
        return <Armchair className={className} />;
      case 'bed':
        return <Bed className={className} />;
      case 'sofa':
        return <Sofa className={className} />;
      case 'rotate':
        return <RotateCcw className={className} />;
      case 'boxes':
        return <Boxes className={className} />;
      case 'utensils':
        return <Utensils className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

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

  const selectMonthCenter = (monthKey: string, mode: 'both' | 'contract' | 'delivery' = 'both') => {
    setFilters((prev) => ({
      ...prev,
      selectedMonth: monthKey,
      monthMode: monthKey === 'all' ? 'both' : mode,
      timePreset: monthKey === 'all' ? prev.timePreset : 'all',
      contractFrom: monthKey === 'all' ? prev.contractFrom : '',
      contractTo: monthKey === 'all' ? prev.contractTo : '',
      deliveryFrom: monthKey === 'all' ? prev.deliveryFrom : '',
      deliveryTo: monthKey === 'all' ? prev.deliveryTo : '',
    }));
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
    Boolean(filters.selectedMonth && filters.selectedMonth !== 'all') ||
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

          {/* Detected Month Query Intelligent Prompt */}
          {detectedMonthQuery && filters.selectedMonth !== detectedMonthQuery && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-blue-400/40 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-blue-100 flex items-center gap-2">
                    <span>تم رصد استعلام شهر: {formatMonthYearArabic(detectedMonthQuery)}</span>
                    <span className="font-mono text-[10px] bg-blue-500/30 px-2 py-0.5 rounded text-blue-200">
                      {detectedMonthQuery}
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-200/80 mt-0.5 tabular-nums">
                    يوجد <strong className="text-white font-mono">{monthsAnalyticsMap[detectedMonthQuery]?.contractCount || 0}</strong> أمر تعاقد جديد و{' '}
                    <strong className="text-white font-mono">{monthsAnalyticsMap[detectedMonthQuery]?.deliveryCount || 0}</strong> أمر تسليم مجدول بهذا الشهر.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    query: '',
                    selectedMonth: detectedMonthQuery,
                    monthMode: 'both',
                    timePreset: 'all',
                    contractFrom: '',
                    contractTo: '',
                    deliveryFrom: '',
                    deliveryTo: '',
                  }));
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>تفعيل رادار وتحليل {formatMonthYearArabic(detectedMonthQuery)}</span>
              </button>
            </div>
          )}

          {/* Quick Time Presets Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-black text-blue-200 ml-1">الفترة الزمنية:</span>
            {QUICK_TIME_PRESETS.map((preset) => {
              const active = filters.timePreset === preset.id && (!filters.selectedMonth || filters.selectedMonth === 'all');
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      timePreset: preset.id,
                      selectedMonth: 'all',
                      monthMode: 'both',
                      contractFrom: preset.id === 'all' ? '' : prev.contractFrom,
                      contractTo: preset.id === 'all' ? '' : prev.contractTo,
                      deliveryFrom: preset.id === 'all' ? '' : prev.deliveryFrom,
                      deliveryTo: preset.id === 'all' ? '' : prev.deliveryTo,
                    }));
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
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
              <span className="text-[11px] font-mono bg-slate-950/60 border border-white/15 px-3 py-1 rounded-xl text-emerald-300 mr-auto tabular-nums">
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

      {/* 2B. MONTHLY QUERY & CONTRACTS VS DELIVERIES CENTER */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#16253B] text-[#C6A355] flex items-center justify-center border border-[#4B83B8]/30 shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>مركز استعلام الشهور (تعاقدات مقابل تسليمات)</span>
                {filters.selectedMonth && filters.selectedMonth !== 'all' && (
                  <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
                    · {formatMonthYearArabic(filters.selectedMonth)}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر أي شهر للاستعلام الفوري عن حجم التعاقدات الجديدة والتسليمات المجدولة وتصفية التقرير والطباعة على أساسه.
              </p>
            </div>
          </div>

          {filters.selectedMonth && filters.selectedMonth !== 'all' && (
            <button
              type="button"
              onClick={() => selectMonthCenter('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إلغاء فلتر الشهر</span>
            </button>
          )}
        </div>

        {/* Month Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
          <button
            type="button"
            onClick={() => selectMonthCenter('all')}
            className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[130px] ${
              !filters.selectedMonth || filters.selectedMonth === 'all'
                ? 'bg-[#16253B] text-white border-[#16253B] shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="text-xs font-black mb-1 flex items-center justify-between gap-2">
              <span>كافة الشهور</span>
              <Calendar className="w-3.5 h-3.5 opacity-75" />
            </div>
            <div className="text-[11px] font-mono tabular-nums opacity-80">
              {ordersForMonthlyScope.length} أمر
            </div>
          </button>

          {availableMonths.map((m) => {
            const data = monthsAnalyticsMap[m];
            const isSelected = filters.selectedMonth === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => selectMonthCenter(isSelected ? 'all' : m)}
                className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[172px] ${
                  isSelected
                    ? 'bg-[#233B5D] text-white border-[#C6A355] shadow-md ring-2 ring-[#C6A355]/40'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-black">{formatMonthYearArabic(m)}</span>
                  <span className="font-mono text-[10px] opacity-65">{m}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold tabular-nums">
                  <span className={isSelected ? 'text-sky-200' : 'text-blue-700 dark:text-blue-300'}>
                    تعاقد: <strong className="font-mono">{data.contractCount}</strong>
                  </span>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className={isSelected ? 'text-emerald-200' : 'text-emerald-700 dark:text-emerald-300'}>
                    تسليم: <strong className="font-mono">{data.deliveryCount}</strong>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Month Comparative Radar Wings */}
        {filters.selectedMonth && filters.selectedMonth !== 'all' && monthsAnalyticsMap[filters.selectedMonth] && (() => {
          const mData = monthsAnalyticsMap[filters.selectedMonth!];
          const deliveryPct = mData.deliveryCount > 0
            ? Math.round((mData.deliveredCount / mData.deliveryCount) * 100)
            : 0;
          const avgContract = mData.contractCount > 0
            ? Math.round(mData.contractTotalValue / mData.contractCount)
            : 0;
          const currentMode = filters.monthMode || 'both';

          return (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contracts Wing */}
                <div className={`p-4 rounded-2xl border transition-colors ${
                  currentMode === 'contract'
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          تعاقدات {formatMonthYearArabic(filters.selectedMonth!)}
                        </h4>
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                          العقود المبرمة خلال الشهر
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-black font-mono tabular-nums text-blue-700 dark:text-blue-300">
                      {mData.contractCount} <span className="text-xs font-sans">عقد</span>
                    </div>
                  </div>

                  {canReadFinance ? (
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums mb-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] font-sans font-bold text-slate-500">القيمة</span>
                        <strong className="text-slate-900 dark:text-white">{mData.contractTotalValue.toLocaleString('en-US')}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] font-sans font-bold text-slate-500">العربون</span>
                        <strong className="text-emerald-700 dark:text-emerald-400">{mData.contractTotalDeposits.toLocaleString('en-US')}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] font-sans font-bold text-slate-500">متوسط العقد</span>
                        <strong className="text-slate-900 dark:text-white">{avgContract.toLocaleString('en-US')}</strong>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => selectMonthCenter(filters.selectedMonth!, currentMode === 'contract' ? 'both' : 'contract')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                      currentMode === 'contract'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-50'
                    }`}
                  >
                    {currentMode === 'contract' ? 'عرض كل أوامر الشهر' : `تصفية التعاقدات فقط (${mData.contractCount})`}
                  </button>
                </div>

                {/* Deliveries Wing */}
                <div className={`p-4 rounded-2xl border transition-colors ${
                  currentMode === 'delivery'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          تسليمات {formatMonthYearArabic(filters.selectedMonth!)}
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          الالتزامات المجدولة والمسلمة
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                      {mData.deliveryCount} <span className="text-xs font-sans">أمر</span>
                    </div>
                  </div>

                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                      <span className="text-emerald-700 dark:text-emerald-400">سُلّم: {mData.deliveredCount}</span>
                      <span className="text-amber-700 dark:text-amber-400">جاري: {mData.deliveryPendingCount}</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300">{deliveryPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${deliveryPct}%` }} />
                    </div>
                  </div>

                  {canReadFinance ? (
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums mb-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] font-sans font-bold text-slate-500">قيمة التسليمات</span>
                        <strong className="text-slate-900 dark:text-white">{mData.deliveryTotalValue.toLocaleString('en-US')}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] font-sans font-bold text-slate-500">متبقي عند التسليم</span>
                        <strong className="text-rose-600 dark:text-rose-400">{mData.deliveryRemainingBalance.toLocaleString('en-US')}</strong>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => selectMonthCenter(filters.selectedMonth!, currentMode === 'delivery' ? 'both' : 'delivery')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                      currentMode === 'delivery'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    {currentMode === 'delivery' ? 'عرض كل أوامر الشهر' : `تصفية التسليمات فقط (${mData.deliveryCount})`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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

          {/* Card 3: Financials (Protected by finance:read) */}
          {canReadFinance ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>الملخص المالي للنتائج</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {analytics.totalValue.toLocaleString()} <span className="text-xs font-bold">ج.م</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold mt-2 tabular-nums">
                <span className="text-emerald-700 dark:text-emerald-400">
                  محصل: {analytics.totalDeposit.toLocaleString()} ({analytics.collectionPercent}%)
                </span>
                <span className={analytics.remainingBalance > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}>
                  متبقي: {analytics.remainingBalance.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col justify-center items-center text-center">
              <ShieldCheck className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-500">الملخص المالي مخصص للإدارة والحسابات</span>
            </div>
          )}

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

        {/* 4B. MASTER WORKSHOP ROOM & FURNITURE INVENTORY & CLASSIFICATION */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#16253B] text-[#C6A355] flex items-center justify-center border border-[#4B83B8]/30 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>حصر وتصنيف غرف وعفش الورشة</span>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    · {categoryInventoryStats.totalBaseCount} أمر في النطاق
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  انقر على أي تصنيف لتصفية نتائج البحث والتصدير والطباعة ومراجعة توزيع مراحل الورشة لهذا النوع فوراً.
                </p>
              </div>
            </div>

            {filters.category !== 'all' && (
              <button
                type="button"
                onClick={() => updateFilter('category', 'all')}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold cursor-pointer hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>إلغاء تصنيف ({FURNITURE_CATEGORIES.find((c) => c.id === filters.category)?.shortName})</span>
              </button>
            )}
          </div>

          {/* 8 Category Tally Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <button
              type="button"
              onClick={() => updateFilter('category', 'all')}
              className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                filters.category === 'all'
                  ? 'bg-[#16253B] text-white border-[#16253B] shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black">كافة العفش</span>
                <Sparkles className="w-4 h-4 text-[#C6A355]" />
              </div>
              <div>
                <div className="text-xl font-black font-mono tabular-nums">
                  {categoryInventoryStats.totalBaseCount}
                  <span className="text-[10px] font-sans font-bold opacity-75 mr-1">أمر</span>
                </div>
                {canReadFinance && (
                  <div className="text-[10px] opacity-80 font-mono tabular-nums mt-0.5 truncate">
                    {categoryInventoryStats.categoryValues.all.toLocaleString('en-US')} ج.م
                  </div>
                )}
              </div>
            </button>

            {FURNITURE_CATEGORIES.map((cat) => {
              const isSelected = filters.category === cat.id;
              const count = categoryInventoryStats.counts[cat.id] || 0;
              const value = categoryInventoryStats.categoryValues[cat.id] || 0;
              const pct =
                categoryInventoryStats.totalBaseCount > 0
                  ? Math.round((count / categoryInventoryStats.totalBaseCount) * 100)
                  : 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateFilter('category', isSelected ? 'all' : cat.id)}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? `${cat.activeClass}`
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 gap-1">
                    <span className="text-[11px] font-black truncate">{cat.shortName}</span>
                    <div
                      className={`p-1 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {renderCategoryIcon(cat.iconType, 'w-3.5 h-3.5')}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black font-mono tabular-nums">
                        {count}
                        <span className="text-[10px] font-sans font-bold opacity-75 mr-1">أمر</span>
                      </span>
                      <span className="text-[10px] font-mono tabular-nums opacity-80">{pct}%</span>
                    </div>
                    {canReadFinance && (
                      <div className="text-[10px] opacity-80 font-mono tabular-nums mt-0.5 truncate">
                        {value.toLocaleString('en-US')} ج.م
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Category Stage Distribution Deep-Dive */}
          {filters.category !== 'all' && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-950 dark:text-amber-200 text-sm">
                    توزيع مراحل التصنيع: {FURNITURE_CATEGORIES.find((c) => c.id === filters.category)?.name}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-200 tabular-nums">
                    ({categoryInventoryStats.counts[filters.category] || 0} أمر)
                  </span>
                </div>
                {canReadFinance && (
                  <div className="font-mono text-xs text-amber-900 dark:text-amber-300 font-bold tabular-nums">
                    القيمة التعاقدية: {(categoryInventoryStats.categoryValues[filters.category] || 0).toLocaleString('en-US')} ج.م
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 text-center text-xs">
                {PRODUCTION_STAGES.map((st) => {
                  const stageCount = selectedCategoryStageCounts[st] || 0;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateFilter('stage', filters.stage === st ? 'all' : st)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        filters.stage === st
                          ? 'bg-[#16253B] text-amber-300 border-[#16253B]'
                          : stageCount > 0
                          ? 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 font-bold text-slate-900 dark:text-white'
                          : 'bg-white/50 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 opacity-65'
                      }`}
                    >
                      <div className="text-[10px] truncate mb-0.5">{st}</div>
                      <div className="font-mono text-sm font-black tabular-nums">{stageCount}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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

            {canReadFinance && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
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
            )}
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
                    {canReadFinance && <th className="py-3 px-3">المالية (المتبقي)</th>}
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
                        {canReadFinance && (
                          <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
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
                        )}
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
                    {canReadFinance ? (
                      <span
                        className={`text-xs font-mono font-black tabular-nums ${
                          item.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {item.remainingBalance > 0
                          ? `متبقي: ${item.remainingBalance.toLocaleString()} ج.م`
                          : 'خالص السداد'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500">
                        {order.current_stage || 'لم يبدأ'}
                      </span>
                    )}

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
