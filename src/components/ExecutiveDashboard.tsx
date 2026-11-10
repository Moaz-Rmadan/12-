import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  SlidersHorizontal,
  X,
  Filter,
  ClipboardList,
  Users,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PackageCheck,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  Edit,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Wallet,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  Check,
  Copy,
  Building,
  Navigation,
  Eye,
  Activity,
  ShieldCheck,
  MapPin,
  Box,
  CornerDownLeft,
  BedDouble,
  Bed,
  Armchair,
  Sofa,
  Boxes,
  Utensils,
  BarChart3,
  PieChart,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  JobOrderPopulated,
  Customer,
  TruckManifest,
  TruckManifestItem,
  OrderStatus,
  ProductionStage,
} from '../types';
import {
  FURNITURE_CATEGORIES,
  getOrderCategory,
  getCategoryCounts,
  getCategoryBadge,
  FurnitureCategory,
} from '../utils/furnitureClassifier';

export const ARABIC_MONTH_NAMES: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

export const formatMonthYearArabic = (monthKey: string): string => {
  if (!monthKey || monthKey === 'all') return 'كافة الشهور';
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const year = parts[0];
  const monthNum = parts[1];
  const monthName = ARABIC_MONTH_NAMES[monthNum] || `شهر ${monthNum}`;
  return `${monthName} ${year}`;
};

interface ExecutiveDashboardProps {
  orders: JobOrderPopulated[];
  customers: Customer[];
  truckManifests: TruckManifest[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  onEditOrder: (order: JobOrderPopulated) => void;
  onOpenNewOrderModal: () => void;
  onNavigateTab: (tab: string, contextId?: string) => void;
}

type SlaFilter = 'all' | 'critical' | 'week' | 'month' | 'delivered';
type SortOption = 'delivery_asc' | 'date_desc' | 'price_desc' | 'customer_name';
type EntityTypeFilter = 'all' | 'orders' | 'customers' | 'trucks';
type FinancialFilter = 'all' | 'paid' | 'pending' | 'low_deposit';

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  orders,
  customers,
  truckManifests,
  onSelectOrder,
  onEditOrder,
  onOpenNewOrderModal,
  onNavigateTab,
}) => {
  const { hasPerm } = useAuth();
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<EntityTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<FurnitureCategory>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [monthDateType, setMonthDateType] = useState<'both' | 'contract' | 'delivery'>('both');
  const [financialFilter, setFinancialFilter] = useState<FinancialFilter>('all');
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('delivery_asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Quick preset chips
  const quickSearchPresets = [
    { label: 'سبتمبر 2026', query: '', apply: () => { setSelectedMonth('2026-09'); setMonthDateType('both'); setEntityFilter('orders'); } },
    { label: 'أكتوبر 2026', query: '', apply: () => { setSelectedMonth('2026-10'); setMonthDateType('both'); setEntityFilter('orders'); } },
    { label: 'نوفمبر 2026', query: '', apply: () => { setSelectedMonth('2026-11'); setMonthDateType('both'); setEntityFilter('orders'); } },
    { label: 'أوامر حرجة ومتأخرة', query: '', apply: () => { setSlaFilter('critical'); setEntityFilter('orders'); setSearchQuery(''); } },
    { label: 'غرف نوم ماستر', query: '', apply: () => { setSelectedCategory('master_bedroom'); setEntityFilter('orders'); } },
    { label: 'انتريه وصالون', query: '', apply: () => { setSelectedCategory('living_room'); setEntityFilter('orders'); } },
    { label: 'ركنة مودرن', query: '', apply: () => { setSelectedCategory('corner_sofa'); setEntityFilter('orders'); } },
    { label: 'غرف شبابي', query: '', apply: () => { setSelectedCategory('youth_bedroom'); setEntityFilter('orders'); } },
    { label: 'كابينة أستر', query: 'أستر', apply: () => { setSearchQuery('أستر'); setEntityFilter('orders'); } },
    { label: 'كابينة دوكو', query: 'دوكو', apply: () => { setSearchQuery('دوكو'); setEntityFilter('orders'); } },
    { label: 'تنجيد شطا', query: 'شطا', apply: () => { setSearchQuery('شطا'); setEntityFilter('orders'); } },
    { label: 'خشب زان أحمر', query: 'زان أحمر', apply: () => { setSearchQuery('زان أحمر'); setEntityFilter('orders'); } },
    ...(hasPerm('finance:read') ? [
      { label: 'متبقي مبالغ تحصيل', query: '', apply: () => { setFinancialFilter('pending'); setEntityFilter('orders'); setSearchQuery(''); } }
    ] : []),
    { label: 'حمولة عروض المعرض', query: 'المعرض', apply: () => { setSearchQuery('المعرض'); setEntityFilter('trucks'); } },
    { label: 'مرتجع وصيانة', query: 'مرتجع', apply: () => { setSearchQuery('مرتجع'); setEntityFilter('trucks'); } },
  ];

  // Helper date parsing
  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // 1. High-level Executive Financials & Radar
  const radarMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const inProgress = orders.filter((o) => o.status === 'قيد التشغيل').length;
    const completed = orders.filter((o) => o.status === 'تم التنفيذ').length;
    const delivered = orders.filter((o) => o.status === 'تسليم').length;

    const totalRevenue = orders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    const totalDeposits = orders.reduce((acc, o) => acc + (o.deposit_paid || 0), 0);
    const pendingBalance = totalRevenue - totalDeposits;
    const collectionRate = totalRevenue > 0 ? Math.round((totalDeposits / totalRevenue) * 100) : 0;

    // SLA Overdue / Critical (less than 3 days or past due, not delivered)
    const criticalOrders = orders.filter((o) => {
      if (o.is_archived || o.status === 'تسليم') return false;
      const diff = getDaysDiff(o.delivery_date);
      return diff !== null && diff <= 3;
    });

    // Truck Stats
    const totalTrips = truckManifests.length;
    const totalCargoItems = truckManifests.reduce((sum, m) => sum + (m.items?.length || 0), 0);
    const returnItems = truckManifests.reduce(
      (sum, m) => sum + (m.items?.filter((it) => it.itemType === 'return')?.length || 0),
      0
    );

    // Workshop stage distribution
    const stageCounts: Record<string, number> = {};
    const stagesList: ProductionStage[] = [
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
    stagesList.forEach((st) => (stageCounts[st] = 0));
    orders.forEach((o) => {
      const st = o.current_stage || 'لم يبدأ';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    });

    return {
      totalOrders,
      inProgress,
      completed,
      delivered,
      totalRevenue,
      totalDeposits,
      pendingBalance,
      collectionRate,
      criticalCount: criticalOrders.length,
      totalTrips,
      totalCargoItems,
      returnItems,
      stageCounts,
      stagesList,
    };
  }, [orders, truckManifests]);

  // 2. Comprehensive Room & Furniture Classification Stats (حصر وتصنيف غرف وعفش الورشة)
  const categoryStats = useMemo(() => {
    const counts = getCategoryCounts(orders);
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

    orders.forEach((o) => {
      const cat = getOrderCategory(o);
      const val = o.total_price || 0;
      categoryValues[cat] = (categoryValues[cat] || 0) + val;
      categoryValues.all += val;
    });

    return { counts, categoryValues };
  }, [orders]);

  // Workshop stage distribution for currently selected category
  const selectedCategoryStageCounts = useMemo(() => {
    const list =
      selectedCategory === 'all'
        ? orders
        : orders.filter((o) => getOrderCategory(o) === selectedCategory);

    const stageCounts: Record<string, number> = {};
    radarMetrics.stagesList.forEach((st) => (stageCounts[st] = 0));
    list.forEach((o) => {
      const st = o.current_stage || 'لم يبدأ';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    });
    return stageCounts;
  }, [orders, selectedCategory, radarMetrics.stagesList]);

  // Helper to render Category Icon safely
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

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 2.7. Extract available unique months from contract_date and delivery_date
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.contract_date && o.contract_date.length >= 7) {
        set.add(o.contract_date.substring(0, 7));
      }
      if (o.delivery_date && o.delivery_date.length >= 7) {
        set.add(o.delivery_date.substring(0, 7));
      }
    });
    // Sort chronological descending (latest year-month first)
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Comprehensive Month Analytics Map for every available month (تعاقدات مقابل تسليمات)
  const monthsAnalyticsMap = useMemo(() => {
    const map: Record<
      string,
      {
        contractCount: number;
        contractTotalValue: number;
        contractTotalDeposits: number;
        deliveryCount: number;
        deliveredCount: number;
        deliveryPendingCount: number;
        deliveryTotalValue: number;
        deliveryRemainingBalance: number;
        totalUniqueOrders: number;
      }
    > = {};

    availableMonths.forEach((m) => {
      map[m] = {
        contractCount: 0,
        contractTotalValue: 0,
        contractTotalDeposits: 0,
        deliveryCount: 0,
        deliveredCount: 0,
        deliveryPendingCount: 0,
        deliveryTotalValue: 0,
        deliveryRemainingBalance: 0,
        totalUniqueOrders: 0,
      };
    });

    orders.forEach((o) => {
      const cMonth = o.contract_date?.substring(0, 7);
      const dMonth = o.delivery_date?.substring(0, 7);

      if (cMonth && map[cMonth]) {
        map[cMonth].contractCount += 1;
        map[cMonth].contractTotalValue += o.total_price || 0;
        map[cMonth].contractTotalDeposits += o.deposit_paid || 0;
      }

      if (dMonth && map[dMonth]) {
        map[dMonth].deliveryCount += 1;
        map[dMonth].deliveryTotalValue += o.total_price || 0;
        map[dMonth].deliveryRemainingBalance += Math.max(0, (o.total_price || 0) - (o.deposit_paid || 0));
        if (o.status === 'تسليم') {
          map[dMonth].deliveredCount += 1;
        } else {
          map[dMonth].deliveryPendingCount += 1;
        }
      }
    });

    availableMonths.forEach((m) => {
      const uniqueOrders = orders.filter(
        (o) => o.contract_date?.startsWith(m) || o.delivery_date?.startsWith(m)
      );
      map[m].totalUniqueOrders = uniqueOrders.length;
    });

    return map;
  }, [orders, availableMonths]);

  // Detected month query in the search input
  const detectedMonthQuery = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const normQ = q.replace(/[أإآ]/g, 'ا');

    for (const m of availableMonths) {
      const [year, monthNum] = m.split('-');
      const monthName = (ARABIC_MONTH_NAMES[monthNum] || '').toLowerCase();
      const normMonth = monthName.replace(/[أإآ]/g, 'ا');

      if (
        normQ.includes(normMonth) ||
        q.includes(m) ||
        q.includes(`شهر ${parseInt(monthNum, 10)}`) ||
        q.includes(`شهر ${monthNum}`) ||
        q.includes(`${monthNum}/${year}`) ||
        q.includes(`${year}-${monthNum}`)
      ) {
        return m;
      }
    }
    return null;
  }, [searchQuery, availableMonths]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setEntityFilter('all');
    setStatusFilter('all');
    setStageFilter('all');
    setSelectedCategory('all');
    setSelectedMonth('all');
    setMonthDateType('both');
    setFinancialFilter('all');
    setSlaFilter('all');
    setSortBy('delivery_asc');
  };

  // 3. Comprehensive Search & Filtering across Orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      // Status Filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Stage Filter
      if (stageFilter !== 'all') {
        const stage = order.current_stage || 'لم يبدأ';
        if (stage !== stageFilter) return false;
      }

      // Room & Furniture Category Filter (حصر وتصنيف غرف وعفش الورشة)
      if (selectedCategory !== 'all') {
        const cat = getOrderCategory(order);
        if (cat !== selectedCategory) return false;
      }

      // Month Search & Radar Filter (تعاقد / تسليم)
      if (selectedMonth !== 'all') {
        const matchContract = order.contract_date?.startsWith(selectedMonth);
        const matchDelivery = order.delivery_date?.startsWith(selectedMonth);

        if (monthDateType === 'contract' && !matchContract) return false;
        if (monthDateType === 'delivery' && !matchDelivery) return false;
        if (monthDateType === 'both' && !matchContract && !matchDelivery) return false;
      }

      // Financial Filter
      if (financialFilter !== 'all') {
        const remaining = (order.total_price || 0) - (order.deposit_paid || 0);
        if (financialFilter === 'paid' && remaining > 0) return false;
        if (financialFilter === 'pending' && remaining <= 0) return false;
        if (financialFilter === 'low_deposit') {
          const ratio = order.total_price > 0 ? (order.deposit_paid || 0) / order.total_price : 0;
          if (ratio >= 0.5) return false;
        }
      }

      // SLA Filter
      if (slaFilter !== 'all') {
        const diff = getDaysDiff(order.delivery_date);
        if (slaFilter === 'delivered' && order.status !== 'تسليم') return false;
        if (slaFilter === 'critical') {
          if (order.status === 'تسليم' || diff === null || diff > 3) return false;
        }
        if (slaFilter === 'week') {
          if (order.status === 'تسليم' || diff === null || diff < 0 || diff > 7) return false;
        }
        if (slaFilter === 'month') {
          if (order.status === 'تسليم' || diff === null || diff < 0 || diff > 30) return false;
        }
      }

      // Universal Text Search Query
      if (q) {
        const matchOrderNo = order.order_number?.toLowerCase().includes(q);
        const matchRoomCode = order.room_model_code?.toLowerCase().includes(q);
        const matchCustomerName = order.customer?.name?.toLowerCase().includes(q);
        const matchCustomerPhone = order.customer?.phone?.toLowerCase().includes(q);
        const matchCustomerAddress = order.customer?.address?.toLowerCase().includes(q);
        const matchSpecs = order.general_specs?.toLowerCase().includes(q);
        const matchWood = order.job_details?.wood_type?.toLowerCase().includes(q);
        const matchPaint = order.job_details?.paint_details?.toLowerCase().includes(q);
        const matchFabric = order.job_details?.fabric_source?.toLowerCase().includes(q);
        const matchColor = order.job_details?.color_code?.toLowerCase().includes(q);
        const matchBatch = order.job_details?.batch_number?.toLowerCase().includes(q);
        const matchInstall = order.job_details?.installation_notes?.toLowerCase().includes(q);
        const matchStage = order.current_stage?.toLowerCase().includes(q);
        const matchStatus = order.status?.toLowerCase().includes(q);
        const matchDates =
          order.delivery_date?.toLowerCase().includes(q) ||
          order.contract_date?.toLowerCase().includes(q);

        // Also check Arabic month matching in dates
        const contractMonthArabic = order.contract_date
          ? formatMonthYearArabic(order.contract_date.substring(0, 7)).toLowerCase()
          : '';
        const deliveryMonthArabic = order.delivery_date
          ? formatMonthYearArabic(order.delivery_date.substring(0, 7)).toLowerCase()
          : '';
        const matchArabicMonth =
          contractMonthArabic.includes(q) || deliveryMonthArabic.includes(q);

        if (
          !matchOrderNo &&
          !matchRoomCode &&
          !matchCustomerName &&
          !matchCustomerPhone &&
          !matchCustomerAddress &&
          !matchSpecs &&
          !matchWood &&
          !matchPaint &&
          !matchFabric &&
          !matchColor &&
          !matchBatch &&
          !matchInstall &&
          !matchStage &&
          !matchStatus &&
          !matchDates &&
          !matchArabicMonth
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'delivery_asc') {
        return (a.delivery_date || '').localeCompare(b.delivery_date || '');
      }
      if (sortBy === 'date_desc') {
        return (b.contract_date || '').localeCompare(a.contract_date || '');
      }
      if (sortBy === 'price_desc') {
        return (b.total_price || 0) - (a.total_price || 0);
      }
      if (sortBy === 'customer_name') {
        return (a.customer?.name || '').localeCompare(b.customer?.name || 'ar');
      }
      return 0;
    });
  }, [orders, searchQuery, statusFilter, stageFilter, selectedCategory, financialFilter, slaFilter, sortBy]);

  // 4. Comprehensive Search & Filtering across Customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((cust) => {
      if (!q) return true;
      const matchName = cust.name?.toLowerCase().includes(q);
      const matchPhone = cust.phone?.toLowerCase().includes(q);
      const matchAddress = cust.address?.toLowerCase().includes(q);
      return matchName || matchPhone || matchAddress;
    });
  }, [customers, searchQuery]);

  // 5. Comprehensive Search & Filtering across Truck Manifest Trips & Items
  const filteredTruckResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const results: Array<{
      manifest: TruckManifest;
      matchingItems: TruckManifestItem[];
    }> = [];

    truckManifests.forEach((manifest) => {
      const matchTripMeta =
        manifest.driverName?.toLowerCase().includes(q) ||
        manifest.truckNumber?.toLowerCase().includes(q) ||
        manifest.tripDate?.toLowerCase().includes(q) ||
        manifest.tripDay?.toLowerCase().includes(q);

      const matchingItems = (manifest.items || []).filter((item) => {
        if (!q) return true;
        if (matchTripMeta) return true;
        return (
          item.customerName?.toLowerCase().includes(q) ||
          item.itemName?.toLowerCase().includes(q) ||
          item.specsDetails?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q) ||
          item.salesperson?.toLowerCase().includes(q) ||
          item.returnReason?.toLowerCase().includes(q)
        );
      });

      if (matchingItems.length > 0 || (matchTripMeta && (manifest.items || []).length > 0)) {
        results.push({
          manifest,
          matchingItems: matchingItems.length > 0 ? matchingItems : manifest.items,
        });
      }
    });

    return results;
  }, [truckManifests, searchQuery]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (entityFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (stageFilter !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (financialFilter !== 'all') count++;
    if (slaFilter !== 'all') count++;
    return count;
  }, [searchQuery, entityFilter, statusFilter, stageFilter, selectedCategory, selectedMonth, financialFilter, slaFilter]);

  // Total results tally
  const totalResultsCount =
    (entityFilter === 'all' || entityFilter === 'orders' ? filteredOrders.length : 0) +
    (entityFilter === 'all' || entityFilter === 'customers' ? filteredCustomers.length : 0) +
    (entityFilter === 'all' || entityFilter === 'trucks'
      ? filteredTruckResults.reduce((sum, t) => sum + t.matchingItems.length, 0)
      : 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in" dir="rtl">
      
      {/* =========================================================================
          SECTION 1: DASHBOARD HEADER & QUICK COMMAND BAR
         ========================================================================= */}
      <div className="bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3352] rounded-3xl p-5 sm:p-8 text-white shadow-xl border border-[#4B83B8]/30 relative overflow-hidden">
        {/* Subtle decorative blue and brass glow */}
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-[#4B83B8]/15 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4B83B8]/20 border border-[#4B83B8]/40 text-blue-200 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>مركز الاستعلام الشامل والرقابة التنفيذية · El-Naggar Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-serif">
              لوحة التحكم والاستعلام الشامل
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl font-normal leading-relaxed">
              ابحث واستعلم فورياً في كامل سجلات أوامر الشغل، العملاء، خطوط إنتاج الورشة، وشحنات حمولة العربية من مكان واحد وبأعلى دقة رقمية.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة كشف الاستعلام</span>
            </button>

            <button
              onClick={onOpenNewOrderModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs sm:text-sm font-black transition-all active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
            >
              <FileText className="w-4 h-4" />
              <span>إنشاء أمر شغل جديد</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: EXECUTIVE PULSE & FINANCIAL RADAR
           ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#4B83B8]/30">
          
          {/* Metric 1: Financial Volume (Protected) */}
          {hasPerm('finance:read') ? (
            <div className="bg-[#16253B]/70 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-[#4B83B8]/30 shadow-inner">
              <div className="flex items-center justify-between text-blue-200 text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-300" />
                  حجم التعاقدات الكلي
                </span>
                <span className="font-mono text-[11px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-400/30">
                  {radarMetrics.collectionRate}% مسدد
                </span>
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-white tracking-tight">
                {radarMetrics.totalRevenue.toLocaleString('en-US')}{' '}
                <span className="text-xs sm:text-sm font-sans font-bold text-amber-300">ج.م</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between font-mono">
                <span>عربون: {radarMetrics.totalDeposits.toLocaleString('en-US')}</span>
                <span className="text-rose-300">متبقي: {radarMetrics.pendingBalance.toLocaleString('en-US')}</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#16253B]/70 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-700/50 flex flex-col justify-center items-center text-center opacity-60">
              <ShieldCheck className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-400">البيانات المالية محجوبة</span>
            </div>
          )}

          {/* Metric 2: Workshop Active Orders */}
          <div className="bg-[#16253B]/70 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-[#4B83B8]/30 shadow-inner">
            <div className="flex items-center justify-between text-blue-200 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#4B83B8]" />
                أوامر الشغل الإجمالية
              </span>
              <span className="text-[11px] text-emerald-300 font-bold">
                {radarMetrics.completed + radarMetrics.delivered} جاهز ومسلم
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono text-white tracking-tight">
              {radarMetrics.totalOrders}{' '}
              <span className="text-xs sm:text-sm font-sans font-bold text-blue-200">أمر</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{radarMetrics.inProgress} قيد التشغيل بالورشة</span>
            </div>
          </div>

          {/* Metric 3: Critical SLA Alert */}
          <div
            onClick={() => {
              setSlaFilter('critical');
              setEntityFilter('orders');
            }}
            className="bg-[#16253B]/70 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-[#4B83B8]/30 shadow-inner cursor-pointer hover:border-rose-400/50 transition-all"
          >
            <div className="flex items-center justify-between text-rose-300 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                حرج أو متأخر (SLA)
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold border border-rose-400/30">
                خلال 72 ساعة
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono text-rose-300 tracking-tight">
              {radarMetrics.criticalCount}{' '}
              <span className="text-xs sm:text-sm font-sans font-bold text-rose-200">أمر يحتاج تدخلاً</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
              <span className="text-amber-300 underline text-[10px]">اضغط للتصفية الفورية</span>
            </div>
          </div>

          {/* Metric 4: Logistics & Truck Trips */}
          <div
            onClick={() => {
              setEntityFilter('trucks');
            }}
            className="bg-[#16253B]/70 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-[#4B83B8]/30 shadow-inner cursor-pointer hover:border-blue-400/50 transition-all"
          >
            <div className="flex items-center justify-between text-blue-200 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#4B83B8]" />
                أسطول الشحن والحمولات
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold border border-blue-400/30">
                {radarMetrics.totalTrips} رحلات
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono text-white tracking-tight">
              {radarMetrics.totalCargoItems}{' '}
              <span className="text-xs sm:text-sm font-sans font-bold text-blue-200">قطعة مشحونة</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between font-mono">
              <span>مرتجع/صيانة: {radarMetrics.returnItems}</span>
              <span className="text-amber-300 underline text-[10px]">عرض البيان</span>
            </div>
          </div>

        </div>

        {/* WORKSHOP STAGE BOTTLENECK RADAR BAR */}
        <div className="mt-5 pt-4 border-t border-[#4B83B8]/30">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-2 font-bold">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              توزيع خطوط الإنتاج والورش (انقر على أي مرحلة للتصفية اللحظية):
            </span>
            {stageFilter !== 'all' && (
              <button
                onClick={() => setStageFilter('all')}
                className="text-[11px] text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                إلغاء فلتر المرحلة ({stageFilter})
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            {radarMetrics.stagesList.map((st) => {
              const count = radarMetrics.stageCounts[st] || 0;
              const isSelected = stageFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setStageFilter(isSelected ? 'all' : st);
                    setEntityFilter('orders');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-white scale-105 font-black'
                      : 'bg-white/10 hover:bg-white/20 text-blue-100 border border-white/10'
                  }`}
                >
                  <span>{st}</span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-slate-950 text-amber-300'
                        : count > 0
                        ? 'bg-amber-500/30 text-amber-200'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* =========================================================================
          SECTION 2.5: MASTER WORKSHOP ROOM & FURNITURE INVENTORY & CLASSIFICATION
          (حصر وتصنيف غرف وعفش الورشة المنقول من أوامر الشغل)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
        
        {/* Header & Subtitle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-amber-100 flex items-center justify-center shadow-xs border border-amber-600/30">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 font-serif">
                <span>حصر وتصنيف غرف وعفش الورشة</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                  {orders.length} أمر شغل بالورشة
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                حصر كمي ومالي لكافة غرف النوم الماستر، الانتريهات، الصالونات، الركنيات، غرف الشبابي، كراسي الليزي بوي، الجزامات، والسفرة (انقر على أي تصنيف لتصفيته فوراً):
              </p>
            </div>
          </div>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer hover:bg-amber-100"
            >
              <X className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>إلغاء تصنيف ({FURNITURE_CATEGORIES.find((c) => c.id === selectedCategory)?.shortName}) وعرض الكل</span>
            </button>
          )}
        </div>

        {/* 8 Category Tally Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
          
          {/* Card 0: All Items */}
          <button
            onClick={() => {
              setSelectedCategory('all');
              setEntityFilter('orders');
            }}
            className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between relative group ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-[1.02]'
                : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black">كافة العفش</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono">
                {orders.length}
                <span className="text-[10px] font-sans font-bold opacity-75 mr-1">أمر</span>
              </div>
              {hasPerm('finance:read') && (
                <div className="text-[10px] opacity-75 font-mono mt-0.5 truncate">
                  {categoryStats.categoryValues.all.toLocaleString('en-US')} ج.م
                </div>
              )}
            </div>
          </button>

          {/* Cards 1-7: The Furniture Categories */}
          {FURNITURE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryStats.counts[cat.id] || 0;
            const value = categoryStats.categoryValues[cat.id] || 0;
            const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(isSelected ? 'all' : cat.id);
                  setEntityFilter('orders');
                }}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? `${cat.activeClass} scale-[1.02]`
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  </span>
                )}
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black truncate">{cat.shortName}</span>
                  <div className={`p-1 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {renderCategoryIcon(cat.iconType, 'w-3.5 h-3.5')}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-black font-mono">
                      {count}
                      <span className="text-[10px] font-sans font-bold opacity-75 mr-1">أمر</span>
                    </span>
                    <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {pct}%
                    </span>
                  </div>

                  {hasPerm('finance:read') && (
                    <div className="text-[10px] opacity-75 font-mono mt-0.5 truncate">
                      {value.toLocaleString('en-US')} ج.م
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Category Deep Dive Panel */}
        {selectedCategory !== 'all' && (
          <div className="mt-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 animate-fade-in space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-950 dark:text-amber-200 text-sm">
                  تفصيل مسار إنتاج: {FURNITURE_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                  {categoryStats.counts[selectedCategory]} أوامر مسجلة
                </span>
              </div>
              {hasPerm('finance:read') && (
                <div className="font-mono text-xs text-amber-900 dark:text-amber-300 font-bold">
                  إجمالي قيمة العقود: {categoryStats.categoryValues[selectedCategory]?.toLocaleString('en-US')} ج.م
                </div>
              )}
            </div>

            {/* Stages distribution for this category */}
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 text-center text-xs">
              {radarMetrics.stagesList.map((st) => {
                const count = selectedCategoryStageCounts[st] || 0;
                return (
                  <div
                    key={st}
                    className={`p-2 rounded-xl border ${
                      count > 0
                        ? 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 shadow-2xs font-bold text-slate-900 dark:text-white'
                        : 'bg-white/40 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="text-[10px] truncate mb-0.5">{st}</div>
                    <div className="font-mono text-sm font-black">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* =========================================================================
          SECTION 2.8: MONTHLY CONTRACTS VS DELIVERIES RADAR & INTELLIGENT SEARCH
          (مركز استعلام وتحليل الشهور: تعاقدات مقابل تسليمات المصنع)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-5 transition-colors">
        
        {/* Header & Subtitle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 text-blue-100 flex items-center justify-center shadow-xs border border-blue-500/30">
              <CalendarDays className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 font-serif">
                <span>مركز استعلام الشهور (تعاقدات مقابل تسليمات)</span>
                {selectedMonth !== 'all' && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                    {formatMonthYearArabic(selectedMonth)}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                استعلم فورياً عن أي شهر لمعرفة حجم التعاقدات الجديدة والعربون المحصل، وحجم التسليمات المجدولة ومتبقي التحصيل:
              </p>
            </div>
          </div>

          {selectedMonth !== 'all' && (
            <button
              onClick={() => {
                setSelectedMonth('all');
                setMonthDateType('both');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إلغاء فلتر الشهر وعرض كافة الشهور</span>
            </button>
          )}
        </div>

        {/* Horizontal Month Timeline Ribbon */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>اختر الشهر للاستعلام الرقمي الفوري:</span>
            <span>{availableMonths.length} شهور مسجلة بالنظام</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
            {/* Chip 0: All Months */}
            <button
              onClick={() => {
                setSelectedMonth('all');
                setMonthDateType('both');
              }}
              className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[130px] ${
                selectedMonth === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-[1.02]'
                  : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="text-xs font-black mb-1 flex items-center justify-between">
                <span>كافة الشهور</span>
                <Calendar className="w-3.5 h-3.5 opacity-70" />
              </div>
              <div className="text-[10px] font-mono opacity-80">
                {orders.length} أمر شغل إجمالي
              </div>
            </button>

            {/* Chips for available months */}
            {availableMonths.map((m) => {
              const data = monthsAnalyticsMap[m];
              const isSelected = selectedMonth === m;
              const formattedName = formatMonthYearArabic(m);

              return (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMonth(isSelected ? 'all' : m);
                    setMonthDateType('both');
                    setEntityFilter('orders');
                  }}
                  className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[170px] relative group ${
                    isSelected
                      ? 'bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white border-blue-400 shadow-lg ring-2 ring-blue-500/50 scale-[1.03]'
                      : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black">{formattedName}</span>
                    <span className="font-mono text-[10px] opacity-60">{m}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                      }`}
                    >
                      <span>تعاقد:</span>
                      <span className="font-mono">{data.contractCount}</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      <span>تسليم:</span>
                      <span className="font-mono">{data.deliveryCount}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Month Deep-Dive Executive Comparative Radar */}
        {selectedMonth !== 'all' && monthsAnalyticsMap[selectedMonth] && (() => {
          const mData = monthsAnalyticsMap[selectedMonth];
          const deliveryPct = mData.deliveryCount > 0
            ? Math.round((mData.deliveredCount / mData.deliveryCount) * 100)
            : 0;
          const avgContract = mData.contractCount > 0
            ? Math.round(mData.contractTotalValue / mData.contractCount)
            : 0;

          return (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* WING 1: أوامر التعاقد في الشهر (Contracts Signed) */}
                <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                  monthDateType === 'contract'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                    : 'bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-slate-900 border-blue-200 dark:border-blue-900/60'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          أوامر تعاقد شهر {formatMonthYearArabic(selectedMonth)}
                        </h4>
                        <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">
                          حجم الصفقات والمبيعات المبرمة
                        </span>
                      </div>
                    </div>

                    <span className="text-xl sm:text-2xl font-black font-mono text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
                      {mData.contractCount}{' '}
                      <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">أمر تعاقد</span>
                    </span>
                  </div>

                  {/* Financial Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-blue-150 dark:border-blue-900/60">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-bold">إجمالي قيمة التعاقدات:</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {mData.contractTotalValue.toLocaleString('en-US')}{' '}
                        <span className="text-[10px] font-sans font-bold text-blue-600">ج.م</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-blue-150 dark:border-blue-900/60">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-bold">العربون المحصل عند التوقيع:</div>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {mData.contractTotalDeposits.toLocaleString('en-US')}{' '}
                        <span className="text-[10px] font-sans font-bold">ج.م</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-3 font-mono bg-white/60 dark:bg-slate-800/50 p-2 rounded-lg">
                    <span>متوسط قيمة العقد: {avgContract.toLocaleString('en-US')} ج.م</span>
                    <span>نسبة العربون: {mData.contractTotalValue > 0 ? Math.round((mData.contractTotalDeposits / mData.contractTotalValue) * 100) : 0}%</span>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      setMonthDateType(monthDateType === 'contract' ? 'both' : 'contract');
                      setEntityFilter('orders');
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      monthDateType === 'contract'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>
                      {monthDateType === 'contract'
                        ? `تم تصفية أوامر التعاقد (${mData.contractCount}) - انقر للعودة للكل`
                        : `عرض أوامر التعاقد فقط (${mData.contractCount} أمر)`}
                    </span>
                  </button>
                </div>

                {/* WING 2: أوامر التسليم والتوريد في الشهر (Delivery Commitments) */}
                <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                  monthDateType === 'delivery'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                    : 'bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-900/60'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          أوامر تسليم شهر {formatMonthYearArabic(selectedMonth)}
                        </h4>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                          التزامات التسليم وتوريد المعرض
                        </span>
                      </div>
                    </div>

                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      {mData.deliveryCount}{' '}
                      <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">أمر تسليم</span>
                    </span>
                  </div>

                  {/* Delivery Status & Progress */}
                  <div className="space-y-1.5 mb-3 bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-emerald-150 dark:border-emerald-900/60">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        تم التسليم: {mData.deliveredCount} أمر
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        جاري بالورشة: {mData.deliveryPendingCount} أمر
                      </span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                        {deliveryPct}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                        style={{ width: `${deliveryPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Collection at Delivery */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-150 dark:border-emerald-900/60">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-bold">قيمة أوامر التسليم:</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {mData.deliveryTotalValue.toLocaleString('en-US')}{' '}
                        <span className="text-[10px] font-sans font-bold text-emerald-600">ج.م</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-150 dark:border-emerald-900/60">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-bold">متبقي تحصيل عند التسليم:</div>
                      <div className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">
                        {mData.deliveryRemainingBalance.toLocaleString('en-US')}{' '}
                        <span className="text-[10px] font-sans font-bold">ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      setMonthDateType(monthDateType === 'delivery' ? 'both' : 'delivery');
                      setEntityFilter('orders');
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      monthDateType === 'delivery'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>
                      {monthDateType === 'delivery'
                        ? `تم تصفية أوامر التسليم (${mData.deliveryCount}) - انقر للعودة للكل`
                        : `عرض أوامر التسليم فقط (${mData.deliveryCount} أمر)`}
                    </span>
                  </button>
                </div>

              </div>

              {/* Sub-bar Filter Toggle Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-slate-500 dark:text-slate-400">طريقة عرض نتائج الشهر:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMonthDateType('both')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        monthDateType === 'both'
                          ? 'bg-amber-950 text-amber-200 dark:bg-amber-800 dark:text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      كافة أوامر الشهر ({mData.totalUniqueOrders})
                    </button>
                    <button
                      onClick={() => setMonthDateType('contract')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        monthDateType === 'contract'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      تعاقد فقط ({mData.contractCount})
                    </button>
                    <button
                      onClick={() => setMonthDateType('delivery')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        monthDateType === 'delivery'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      تسليم فقط ({mData.deliveryCount})
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {mData.totalUniqueOrders} أمر معني بشهر {formatMonthYearArabic(selectedMonth)}
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* =========================================================================
          SECTION 3: UNIVERSAL OMNI-SEARCH & ADVANCED FILTERS BAR
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
        
        {/* Search Input Box */}
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 dark:text-amber-500" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث فورياً باسم الشهر (سبتمبر، أكتوبر، نوفمبر...)، أو رقم أمر الشغل (JO-2026-...)، اسم العميل، الهاتف، كود الموديل..."
            className="w-full pr-12 sm:pr-14 pl-12 py-3.5 sm:py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-600 dark:focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm sm:text-base placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-inner"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Detected Month Query Intelligent Prompt */}
        {detectedMonthQuery && selectedMonth !== detectedMonthQuery && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/40 text-white flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-md">
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
                <div className="text-[11px] text-blue-300/80 mt-0.5">
                  يوجد <strong className="text-white font-mono">{monthsAnalyticsMap[detectedMonthQuery]?.contractCount || 0}</strong> أمر تعاقد جديد و <strong className="text-white font-mono">{monthsAnalyticsMap[detectedMonthQuery]?.deliveryCount || 0}</strong> أمر تسليم مجدول بهذا الشهر.
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedMonth(detectedMonthQuery);
                setMonthDateType('both');
                setEntityFilter('orders');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تفعيل رادار وتحليل {formatMonthYearArabic(detectedMonthQuery)}</span>
            </button>
          </div>
        )}

        {/* Quick Search Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0 ml-1">استعلامات سريعة:</span>
          {quickSearchPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={preset.apply}
              className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 hover:text-amber-900 dark:hover:text-amber-200 border border-slate-200 dark:border-slate-700/80 font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Primary Filter Bar: Entity Types & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Entity Type Segmented Control */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-x-auto max-w-full">
            <button
              onClick={() => setEntityFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                entityFilter === 'all'
                  ? 'bg-amber-950 dark:bg-amber-800 text-amber-200 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>الكل ({filteredOrders.length + filteredCustomers.length + filteredTruckResults.length})</span>
            </button>

            <button
              onClick={() => setEntityFilter('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                entityFilter === 'orders'
                  ? 'bg-amber-950 dark:bg-amber-800 text-amber-200 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>أوامر الشغل ({filteredOrders.length})</span>
            </button>

            <button
              onClick={() => setEntityFilter('customers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                entityFilter === 'customers'
                  ? 'bg-amber-950 dark:bg-amber-800 text-amber-200 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>العملاء ({filteredCustomers.length})</span>
            </button>

            <button
              onClick={() => setEntityFilter('trucks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                entityFilter === 'trucks'
                  ? 'bg-amber-950 dark:bg-amber-800 text-amber-200 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>حمولة العربية ({filteredTruckResults.length})</span>
            </button>
          </div>

          {/* Right Controls: Sort & Advanced Filter Drawer Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>فلاتر تفصيلية</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="إعادة تعيين كافة الفلاتر"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مسح الفلاتر</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                كروت
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                جدول
              </button>
            </div>
          </div>

        </div>

        {/* ADVANCED MULTI-DIMENSIONAL FILTERS DRAWER */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
            
            {/* Filter 1: Order Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                حالة أمر الشغل
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-600"
              >
                <option value="all">كافة الحالات</option>
                <option value="قيد التشغيل">قيد التشغيل بالورشة</option>
                <option value="تم التنفيذ">تم التنفيذ والمطابقة</option>
                <option value="تسليم">تم التسليم والتركيب</option>
              </select>
            </div>

            {/* Filter 2: Production Stage */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                مرحلة الإنتاج الحالية
              </label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-600"
              >
                <option value="all">كافة المراحل</option>
                <option value="لم يبدأ">لم يبدأ</option>
                <option value="نجارة عفش">نجارة عفش</option>
                <option value="نجارة انتريهات">نجارة انتريهات</option>
                <option value="خدمة وتجهيز">خدمة وتجهيز</option>
                <option value="كابينة أستر">كابينة أستر</option>
                <option value="كابينة دوكو">كابينة دوكو</option>
                <option value="تنجيد">تنجيد</option>
                <option value="تشطيب وتغليف">تشطيب وتغليف</option>
                <option value="جاهز للتسليم">جاهز للتسليم</option>
              </select>
            </div>

            {/* Filter 3: Room & Furniture Classification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تصنيف نوع الغرفة والعفش
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as FurnitureCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-600"
              >
                <option value="all">كافة أنواع العفش والغرف ({orders.length})</option>
                {FURNITURE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({categoryStats.counts[cat.id] || 0} أمر)
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 4: Financial Settlement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الموقف المالي والتحصيل
              </label>
              <select
                value={financialFilter}
                onChange={(e) => setFinancialFilter(e.target.value as FinancialFilter)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-600"
              >
                <option value="all">كافة الحسابات</option>
                <option value="pending">متبقي مبالغ تحصيل</option>
                <option value="paid">مسدد بالكامل (100%)</option>
                <option value="low_deposit">عربون أقل من 50%</option>
              </select>
            </div>

            {/* Filter 5: SLA & Delivery Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ميعاد التسليم والالتزام (SLA)
              </label>
              <select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value as SlaFilter)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-600"
              >
                <option value="all">كافة المواعيد</option>
                <option value="critical">متأخر أو حرج (خلال 3 أيام)</option>
                <option value="week">تسليم هذا الأسبوع</option>
                <option value="month">تسليم هذا الشهر</option>
                <option value="delivered">أوامر تم تسليمها بالفعل</option>
              </select>
            </div>

            {/* Filter 6: Month Target */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الشهر المستهدف
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
              >
                <option value="all">كافة الشهور ({orders.length} أمر)</option>
                {availableMonths.map((m) => {
                  const data = monthsAnalyticsMap[m];
                  return (
                    <option key={m} value={m}>
                      {formatMonthYearArabic(m)} ({data.contractCount} تعاقد | {data.deliveryCount} تسليم)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter 7: Month Match Dimension */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع مطابقة تاريخ الشهر
              </label>
              <select
                value={monthDateType}
                onChange={(e) => setMonthDateType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
              >
                <option value="both">أوامر التعاقد والتسليم معاً</option>
                <option value="contract">أوامر التعاقد في الشهر فقط</option>
                <option value="delivery">أوامر التسليم في الشهر فقط</option>
              </select>
            </div>

          </div>
        )}

      </div>

      {/* =========================================================================
          SECTION 4: SEARCH RESULTS PRESENTATION
         ========================================================================= */}
      
      {/* Result Counter Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">
            نتائج الاستعلام
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-xs font-black font-mono border border-amber-300 dark:border-amber-800">
            {totalResultsCount} نتيجة
          </span>
          {selectedMonth !== 'all' && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>شهر: {formatMonthYearArabic(selectedMonth)} ({monthDateType === 'contract' ? 'تعاقد فقط' : monthDateType === 'delivery' ? 'تسليم فقط' : 'تعاقد وتسليم'})</span>
              <button
                onClick={() => setSelectedMonth('all')}
                className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900 rounded cursor-pointer"
                title="إلغاء فلتر الشهر"
              >
                <X className="w-3 h-3 text-blue-700 dark:text-blue-300" />
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
              <span>مصنف حسب: {FURNITURE_CATEGORIES.find((c) => c.id === selectedCategory)?.name}</span>
            </span>
          )}
          {searchQuery && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              لكلمة البحث: <strong className="text-amber-800 dark:text-amber-400">"{searchQuery}"</strong>
            </span>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">الترتيب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent text-slate-800 dark:text-slate-200 font-bold border-none outline-none cursor-pointer"
          >
            <option value="delivery_asc" className="dark:bg-slate-800">موعد التسليم (الأقرب أولاً)</option>
            <option value="date_desc" className="dark:bg-slate-800">تاريخ التعاقد (الأحدث)</option>
            <option value="price_desc" className="dark:bg-slate-800">الأعلى سعراً</option>
            <option value="customer_name" className="dark:bg-slate-800">اسم العميل (أبجدياً)</option>
          </select>
        </div>
      </div>

      {/* ZERO RESULTS FALLBACK */}
      {totalResultsCount === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Search className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            لم يتم العثور على أية نتائج مطابقة
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            جرب تعديل كلمات البحث أو مسح الفلاتر المحددة للوصول لكافة البيانات المسجلة في مصنع النجار فيرنتشر.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مسح جميع الفلاتر والبحث</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          GROUP A: JOB ORDERS RESULTS
         ========================================================================= */}
      {(entityFilter === 'all' || entityFilter === 'orders') && filteredOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <span>أوامر الشغل ({filteredOrders.length})</span>
            </h2>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>عرض في جدول الأوامر الكامل</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          {/* Cards View */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const daysDiff = getDaysDiff(order.delivery_date);
                const remaining = (order.total_price || 0) - (order.deposit_paid || 0);
                const isPaid = remaining <= 0;
                const isCritical = order.status !== 'تسليم' && daysDiff !== null && daysDiff <= 3;
                const isCopied = copiedId === order.id;

                const category = getOrderCategory(order);
                const categoryBadge = getCategoryBadge(category);

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600 transition-all card-motion flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Order Number & Status Pill */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-black text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                            {order.order_number}
                          </span>
                          <button
                            onClick={() => handleCopyText(order.order_number, order.id)}
                            className="p-1 text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 rounded transition-colors cursor-pointer"
                            title="نسخ رقم أمر الشغل"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                            order.status === 'قيد التشغيل'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : order.status === 'تم التنفيذ'
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                          }`}
                        >
                          {order.status === 'قيد التشغيل' && <Clock className="w-3 h-3" />}
                          {order.status === 'تم التنفيذ' && <CheckCircle2 className="w-3 h-3" />}
                          {order.status === 'تسليم' && <PackageCheck className="w-3 h-3" />}
                          <span>{order.status}</span>
                        </span>
                      </div>

                      {/* Furniture Category Badge Tag */}
                      {categoryBadge && (
                        <div className="mb-2.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${categoryBadge.badgeClass}`}>
                            {renderCategoryIcon(categoryBadge.iconType, 'w-3 h-3')}
                            <span>{categoryBadge.name}</span>
                          </span>
                        </div>
                      )}

                      {/* Customer Info */}
                      <div className="mb-3">
                        <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                          {order.customer?.name || 'عميل غير مسجل'}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {order.customer?.phone && (
                            <span className="font-mono">{order.customer.phone}</span>
                          )}
                          {order.customer?.address && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[160px]">{order.customer.address}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Room Code & Specs Preview */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-150 dark:border-slate-750 space-y-1.5 mb-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">كود الموديل:</span>
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-300">
                            {order.room_model_code || '---'}
                          </span>
                        </div>

                        {order.general_specs && (
                          <div className="text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {order.general_specs}
                          </div>
                        )}

                        {order.job_details?.wood_type && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">الخشب:</span>
                            <span className="truncate">{order.job_details.wood_type}</span>
                          </div>
                        )}

                        {order.job_details?.paint_details && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">الدهان:</span>
                            <span className="truncate">{order.job_details.paint_details}</span>
                          </div>
                        )}
                      </div>

                      {/* Production Stage Badge & SLA */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">المرحلة:</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                            {order.current_stage || 'لم يبدأ'}
                          </span>
                        </div>

                        {/* Delivery Countdown */}
                        <div
                          className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                            order.status === 'تسليم'
                              ? 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                              : isCritical
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 animate-pulse'
                              : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {daysDiff !== null && order.status !== 'تسليم' ? (
                              daysDiff < 0 ? `متأخر ${Math.abs(daysDiff)} يوم` : daysDiff === 0 ? 'تسليم اليوم!' : `باقي ${daysDiff} يوم`
                            ) : order.status === 'تسليم' ? (
                              'تم الاستلام'
                            ) : (
                              'مجدول'
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Contract and Delivery Dates with Month Context */}
                      <div className="grid grid-cols-2 gap-1.5 mb-3 text-[11px] font-mono">
                        <div
                          className={`p-1.5 rounded-lg border flex items-center gap-1 truncate ${
                            selectedMonth !== 'all' && order.contract_date?.startsWith(selectedMonth)
                              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                          title={`تاريخ التعاقد: ${order.contract_date || 'غير محدد'}`}
                        >
                          <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate">تعاقد: {order.contract_date || '---'}</span>
                        </div>

                        <div
                          className={`p-1.5 rounded-lg border flex items-center gap-1 truncate ${
                            selectedMonth !== 'all' && order.delivery_date?.startsWith(selectedMonth)
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold shadow-2xs'
                              : isCritical
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                          title={`تاريخ التسليم: ${order.delivery_date || 'غير محدد'}`}
                        >
                          <Truck className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">تسليم: {order.delivery_date || '---'}</span>
                        </div>
                      </div>

                      {/* Financial Progress Pill (Protected) */}
                      {hasPerm('finance:read') && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-150 dark:border-slate-800 text-xs font-mono space-y-1 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans font-bold">القيمة:</span>
                            <span className="font-black text-slate-900 dark:text-white">
                              {order.total_price.toLocaleString('en-US')} ج.م
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-emerald-700 dark:text-emerald-400 font-sans">
                              عربون: {order.deposit_paid.toLocaleString('en-US')}
                            </span>
                            <span className={isPaid ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {isPaid ? 'خالص السداد' : `متبقي: ${remaining.toLocaleString('en-US')} ج.م`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 text-white text-xs font-bold hover:shadow transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>كارت الورشة</span>
                      </button>

                      <button
                        onClick={() => onEditOrder(order)}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        title="تعديل أمر الشغل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onNavigateTab('receipt', order.customer_id)}
                        className="p-2 rounded-xl text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800/60"
                        title="إقرار استلام العميل"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* Compact Executive Table View */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">رقم الأمر</th>
                      <th className="p-3">العميل</th>
                      <th className="p-3">نوع العفش / الغرفة</th>
                      <th className="p-3">كود الموديل</th>
                      <th className="p-3">المرحلة</th>
                      <th className="p-3">تاريخ التعاقد</th>
                      <th className="p-3">تاريخ التسليم</th>
                      {hasPerm('finance:read') && (
                        <>
                          <th className="p-3">المبلغ الإجمالي</th>
                          <th className="p-3">المتبقي</th>
                        </>
                      )}
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.map((order) => {
                      const daysDiff = getDaysDiff(order.delivery_date);
                      const remaining = (order.total_price || 0) - (order.deposit_paid || 0);
                      const cat = getOrderCategory(order);
                      const catBadge = getCategoryBadge(cat);
                      const isContractMatch = selectedMonth !== 'all' && order.contract_date?.startsWith(selectedMonth);
                      const isDeliveryMatch = selectedMonth !== 'all' && order.delivery_date?.startsWith(selectedMonth);

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
                        >
                          <td className="p-3 font-mono font-bold text-amber-900 dark:text-amber-300">
                            {order.order_number}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div>{order.customer?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{order.customer?.phone}</div>
                          </td>
                          <td className="p-3">
                            {catBadge && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${catBadge.badgeClass}`}>
                                {renderCategoryIcon(catBadge.iconType, 'w-3 h-3')}
                                <span>{catBadge.shortName}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                            {order.room_model_code}
                          </td>
                          <td className="p-3 font-bold text-amber-800 dark:text-amber-300">
                            {order.current_stage || 'لم يبدأ'}
                          </td>
                          <td className="p-3 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                isContractMatch
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-bold border border-blue-300 dark:border-blue-700'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {order.contract_date || '---'}
                            </span>
                          </td>
                          <td className="p-3 font-mono">
                            <div
                              className={`inline-block px-2 py-0.5 rounded ${
                                isDeliveryMatch
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-700'
                                  : 'text-slate-900 dark:text-white font-bold'
                              }`}
                            >
                              {order.delivery_date || '---'}
                            </div>
                            {daysDiff !== null && order.status !== 'تسليم' && (
                              <div className={`text-[10px] font-bold mt-0.5 ${daysDiff <= 3 ? 'text-rose-600' : 'text-slate-400'}`}>
                                {daysDiff < 0 ? `متأخر ${Math.abs(daysDiff)} يوم` : `باقي ${daysDiff} يوم`}
                              </div>
                            )}
                          </td>
                          {hasPerm('finance:read') && (
                            <>
                              <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                                {order.total_price.toLocaleString('en-US')} ج.م
                              </td>
                              <td className={`p-3 font-mono font-bold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {remaining > 0 ? `${remaining.toLocaleString('en-US')} ج.م` : 'خالص'}
                              </td>
                            </>
                          )}
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onSelectOrder(order)}
                                className="p-1.5 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:bg-amber-200 cursor-pointer"
                                title="عرض كارت الورشة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onEditOrder(order)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                                title="تعديل"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          GROUP B: CUSTOMERS RESULTS
         ========================================================================= */}
      {(entityFilter === 'all' || entityFilter === 'customers') && filteredCustomers.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <span>سجل العملاء ({filteredCustomers.length})</span>
            </h2>
            <button
              onClick={() => onNavigateTab('customers')}
              className="text-xs text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>إدارة كافة العملاء</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((cust) => {
              const custOrders = orders.filter((o) => o.customer_id === cust.id || o.customer?.phone === cust.phone);
              const totalSpent = custOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
              const totalPending = custOrders.reduce(
                (sum, o) => sum + ((o.total_price || 0) - (o.deposit_paid || 0)),
                0
              );

              return (
                <div
                  key={cust.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600 transition-all card-motion flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-black flex items-center justify-center font-serif text-base border border-amber-300 dark:border-amber-800">
                        {cust.name.slice(0, 1)}
                      </div>
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {custOrders.length} أوامر شغل
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {cust.name}
                    </h3>

                    <div className="space-y-1.5 mt-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>{cust.phone}</span>
                      </div>

                      {cust.address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Financial summary for customer */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 mt-3 border border-slate-150 dark:border-slate-800 text-xs font-mono flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-sans">إجمالي المعاملات:</div>
                        <div className="font-bold text-slate-900 dark:text-white">{totalSpent.toLocaleString('en-US')} ج.م</div>
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] text-slate-400 font-sans">متبقي للتحصيل:</div>
                        <div className={`font-bold ${totalPending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {totalPending.toLocaleString('en-US')} ج.م
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Quick Actions */}
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <a
                      href={`tel:${cust.phone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>اتصال</span>
                    </a>

                    <a
                      href={`https://wa.me/2${cust.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>

                    <button
                      onClick={() => onNavigateTab('receipt', cust.id)}
                      className="p-2 rounded-xl text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800/60"
                      title="إقرار استلام العميل"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          GROUP C: TRUCK MANIFEST & CARGO RESULTS
         ========================================================================= */}
      {(entityFilter === 'all' || entityFilter === 'trucks') && filteredTruckResults.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <span>حمولة العربية وبيانات الشحن ({filteredTruckResults.length} رحلات)</span>
            </h2>
            <button
              onClick={() => onNavigateTab('truck-manifest')}
              className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>فتح استوديو حمولة العربية</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTruckResults.map(({ manifest, matchingItems }) => (
              <div
                key={manifest.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                {/* Manifest Trip Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        عربية رقم {manifest.truckNumber} · السائق: {manifest.driverName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {manifest.tripDay} · {manifest.tripDate}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('truck-manifest')}
                    className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>عرض البيان</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Items in this manifest matching query */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    القطع المشحونة المطابقة ({matchingItems.length}):
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {matchingItems.map((item) => (
                      <div key={item.id} className="py-2 flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-[11px]">
                              {item.qty}×
                            </span>
                            <span>{item.itemName}</span>
                            {item.itemType === 'return' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                                مرتجع وصيانة
                              </span>
                            )}
                            {item.itemType === 'showroom' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                                المعرض
                              </span>
                            )}
                          </div>
                          {item.specsDetails && (
                            <div className="text-slate-500 text-[11px]">{item.specsDetails}</div>
                          )}
                          {item.notes && (
                            <div className="text-slate-400 text-[10px] italic">{item.notes}</div>
                          )}
                        </div>

                        <div className="text-left shrink-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{item.customerName}</div>
                          {item.salesperson && (
                            <div className="text-[10px] text-slate-400">مسؤول: {item.salesperson}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
