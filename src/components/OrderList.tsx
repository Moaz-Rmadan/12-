import React, { useState, useMemo } from 'react';
import { JobOrderPopulated, OrderStatus, ProductionStage, CreateJobOrderPayload, Customer } from '../types';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  User,
  Phone,
  Ruler,
  Scissors,
  Edit3,
  FileSpreadsheet,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Bed,
  BedDouble,
  Armchair,
  Sofa,
  RotateCcw,
  Boxes,
  Utensils,
  Layers,
  CalendarDays,
  CheckCircle2,
  Archive,
  Activity,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { BatchOrderImportModal } from './BatchOrderImportModal';
import {
  FURNITURE_CATEGORIES,
  getOrderCategory,
  getCategoryCounts,
  getCategoryBadge,
  FurnitureCategory,
} from '../utils/furnitureClassifier';

interface OrderListProps {
  orders: JobOrderPopulated[];
  customers?: Customer[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  onEditOrder: (order: JobOrderPopulated) => void;
  onOpenDeliveryReceipt?: (order: JobOrderPopulated) => void;
  onUpdateStatus: (id: string, newStatus: OrderStatus) => void;
  onUpdateStage?: (id: string, newStage: ProductionStage) => void;
  onUpdateArchiveStatus?: (id: string, isArchived: boolean) => void;
  onDeleteOrder: (id: string) => void;
  onAddBatchOrders?: (ordersList: CreateJobOrderPayload[]) => Promise<number>;
  activeFilter: string;
  setActiveFilter: (status: string) => void;
  onNavigateToDashboard?: () => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  customers = [],
  onSelectOrder,
  onEditOrder,
  onOpenDeliveryReceipt,
  onUpdateStatus,
  onUpdateStage,
  onUpdateArchiveStatus,
  onDeleteOrder,
  onAddBatchOrders,
  activeFilter,
  setActiveFilter,
  onNavigateToDashboard,
}) => {
  // General text query (Order number, Specs, Model code)
  const [generalSearch, setGeneralSearch] = useState('');
  
  // Dedicated Customer Name Search
  const [customerNameSearch, setCustomerNameSearch] = useState('');
  
  // Dedicated Delivery Date Filter
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  
  // Quick delivery date preset
  const [quickDatePreset, setQuickDatePreset] = useState<string>('all');

  // Dedicated Furniture Category Filter (غرفة نوم كبيرة، انتريه، غرفة شبابي، ركنة، ليزي بوي، جزامة، سفرة)
  const [selectedCategory, setSelectedCategory] = useState<FurnitureCategory>('all');

  // Dedicated Production Stage Filter ('all' | ProductionStage)
  const [selectedStage, setSelectedStage] = useState<string>('all');

  // Dedicated Month Filter ('all', '2026-11', '2026-12', etc.)
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  // Sort order by delivery date or created
  const [sortBy, setSortBy] = useState<'delivery_asc' | 'delivery_desc' | 'contract_desc' | 'order_number'>('delivery_asc');

  // Modal states
  const [orderToDelete, setOrderToDelete] = useState<JobOrderPopulated | null>(null);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // Extract unique customer names with order counts for quick dropdown
  const customerOptions = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const name = o.customer?.name?.trim();
      if (name) {
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  // Extract unique delivery dates present in orders
  const availableDeliveryDates = useMemo(() => {
    const dates = new Set<string>();
    orders.forEach((o) => {
      if (o.delivery_date) dates.add(o.delivery_date.trim());
    });
    return Array.from(dates).sort();
  }, [orders]);

  // Base orders for category counts (filtered by month/date and status)
  const baseOrdersForCounts = useMemo(() => {
    return orders.filter((ord) => {
      if (ord.is_archived) return false;
      // 1. Status Filter
      if (activeFilter !== 'الكل' && activeFilter !== 'الأرشيف' && ord.status !== activeFilter) {
        return false;
      }
      // 2. Month / Date Filter
      if (selectedMonth !== 'all') {
        const ordDelivery = (ord.delivery_date || '').trim();
        if (!ordDelivery.startsWith(selectedMonth)) {
          return false;
        }
      } else if (deliveryDateFilter.trim()) {
        const dateQ = deliveryDateFilter.trim();
        const ordDelivery = (ord.delivery_date || '').trim();
        if (!ordDelivery.startsWith(dateQ)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, activeFilter, selectedMonth, deliveryDateFilter]);

  // Compute Live Furniture Category Counts across baseOrdersForCounts
  const categoryCounts = useMemo(() => {
    return getCategoryCounts(baseOrdersForCounts);
  }, [baseOrdersForCounts]);

  // Compute Orders count per month
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if (!o.is_archived) {
        const d = o.delivery_date?.trim();
        if (d && d.length >= 7) {
          const monthKey = d.substring(0, 7);
          counts[monthKey] = (counts[monthKey] || 0) + 1;
        }
      }
    });
    return counts;
  }, [orders]);

  // Helper to render Category Icon safely
  const renderCategoryIcon = (iconType: string, className: string = 'w-3.5 h-3.5') => {
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

  // Handle Quick Date Preset clicks
  const handleSelectQuickDate = (preset: string) => {
    setQuickDatePreset(preset);
    if (preset === 'all') {
      setDeliveryDateFilter('');
      setSelectedMonth('all');
    } else if (preset === 'november-2026') {
      setDeliveryDateFilter('2026-11');
      setSelectedMonth('2026-11');
    } else if (preset === 'december-2026') {
      setDeliveryDateFilter('2026-12');
      setSelectedMonth('2026-12');
    } else {
      setDeliveryDateFilter(preset);
      if (preset.length >= 7) {
        setSelectedMonth(preset.substring(0, 7));
      }
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setGeneralSearch('');
    setCustomerNameSearch('');
    setDeliveryDateFilter('');
    setQuickDatePreset('all');
    setSelectedCategory('all');
    setSelectedStage('all');
    setSelectedMonth('all');
    setActiveFilter('الكل');
    setSortBy('delivery_asc');
  };

  const hasActiveFilters =
    generalSearch.trim() !== '' ||
    customerNameSearch.trim() !== '' ||
    deliveryDateFilter.trim() !== '' ||
    activeFilter !== 'الكل' ||
    quickDatePreset !== 'all' ||
    selectedCategory !== 'all' ||
    selectedStage !== 'all' ||
    selectedMonth !== 'all';

  // Filter & Sort Pipeline
  const filteredAndSortedOrders = useMemo(() => {
    return orders
      .filter((ord) => {
        // 0. Archive filter check
        if (activeFilter === 'الأرشيف') {
          if (!ord.is_archived) return false;
        } else {
          if (ord.is_archived) return false; // Hide archived orders from active lists
          // 1. Status Filter
          if (activeFilter !== 'الكل') {
            if (activeFilter === 'مسودة') {
              if (ord.status !== 'Draft') return false;
            } else if (ord.status !== activeFilter) {
              return false;
            }
          }
        }

        // 2. Production Stage Filter
        if (selectedStage !== 'all') {
          const ordStage = ord.current_stage || 'لم يبدأ';
          if (ordStage !== selectedStage) {
            return false;
          }
        }

        // 2. Customer Name Filter (Exact or partial substring)
        if (customerNameSearch.trim()) {
          const custQ = customerNameSearch.toLowerCase().trim();
          const custName = (ord.customer?.name || '').toLowerCase();
          if (!custName.includes(custQ)) {
            return false;
          }
        }

        // 3. Furniture Category Filter
        if (selectedCategory !== 'all') {
          const ordCat = getOrderCategory(ord);
          if (ordCat !== selectedCategory) {
            return false;
          }
        }

        // 4. Delivery Date / Month Filter
        if (deliveryDateFilter.trim()) {
          const dateQ = deliveryDateFilter.trim();
          const ordDelivery = (ord.delivery_date || '').trim();
          if (!ordDelivery.startsWith(dateQ)) {
            return false;
          }
        }

        // 5. General Search
        if (generalSearch.trim()) {
          const q = generalSearch.toLowerCase().trim();
          const matches =
            ord.order_number.toLowerCase().includes(q) ||
            ord.room_model_code.toLowerCase().includes(q) ||
            ord.general_specs.toLowerCase().includes(q) ||
            (ord.customer?.phone && ord.customer.phone.includes(q)) ||
            (ord.job_details?.dimensions_cm && ord.job_details.dimensions_cm.toLowerCase().includes(q)) ||
            (ord.job_details?.paint_details && ord.job_details.paint_details.toLowerCase().includes(q)) ||
            (ord.job_details?.wood_type && ord.job_details.wood_type.toLowerCase().includes(q));

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'delivery_asc') {
          return (a.delivery_date || '').localeCompare(b.delivery_date || '');
        }
        if (sortBy === 'delivery_desc') {
          return (b.delivery_date || '').localeCompare(a.delivery_date || '');
        }
        if (sortBy === 'contract_desc') {
          return (b.contract_date || '').localeCompare(a.contract_date || '');
        }
        if (sortBy === 'order_number') {
          return a.order_number.localeCompare(b.order_number);
        }
        return 0;
      });
  }, [orders, activeFilter, customerNameSearch, selectedCategory, deliveryDateFilter, generalSearch, sortBy]);

  // Remove duplicate IDs if any
  const uniqueFilteredOrders = Array.from(
    new Map(filteredAndSortedOrders.map((o) => [o.id, o])).values()
  );

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'قيد التشغيل':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'تم التنفيذ':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'تسليم':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Helper to format days remaining or delivery date alert
  const getDeliveryBadge = (deliveryDateStr: string) => {
    if (!deliveryDateStr) return null;
    const parts = deliveryDateStr.split('-');
    if (parts.length === 3) {
      const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return (
          <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-300">
            مستحق التسليم
          </span>
        );
      }
      if (diffDays <= 7) {
        return (
          <span className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-300">
            تسليم خلال {diffDays} أيام
          </span>
        );
      }
      return (
        <span className="text-[10px] bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
          متبقي {diffDays} يوم
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* PROFESSIONAL MULTI-CRITERIA SEARCH & FILTER SUITE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* ROW 1: PRIMARY SEARCH CONTROLS (CUSTOMER, MONTH, DATE, GENERAL) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
            
            {/* 1. Dedicated Search by Customer Name */}
            <div className="sm:col-span-6 lg:col-span-3 relative">
              <label className="block text-[10px] sm:text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>بحث باسم العميل:</span>
                </span>
                {customerNameSearch && (
                  <button
                    onClick={() => setCustomerNameSearch('')}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="سلمى، طلعت، مايكل، عصام..."
                  value={customerNameSearch}
                  onChange={(e) => setCustomerNameSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500 shadow-2xs"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Dedicated Filter by Month (بشهر معين) */}
            <div className="sm:col-span-6 lg:col-span-3 relative">
              <label className="block text-[10px] sm:text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>تصفية بشهر معين:</span>
                </span>
                {selectedMonth !== 'all' && (
                  <button
                    onClick={() => {
                      setSelectedMonth('all');
                      setDeliveryDateFilter('');
                      setQuickDatePreset('all');
                    }}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </label>

              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const m = e.target.value;
                    setSelectedMonth(m);
                    if (m === 'all') {
                      setDeliveryDateFilter('');
                      setQuickDatePreset('all');
                    } else {
                      setDeliveryDateFilter(m);
                      setQuickDatePreset(m === '2026-11' ? 'november-2026' : m === '2026-12' ? 'december-2026' : m);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">جميع الشهور ({orders.length} أمر)</option>
                  <option value="2026-11">نوفمبر 2026 ({monthCounts['2026-11'] || 0})</option>
                  <option value="2026-12">ديسمبر 2026 ({monthCounts['2026-12'] || 0})</option>
                  {Object.keys(monthCounts)
                    .filter((k) => k !== '2026-11' && k !== '2026-12')
                    .map((mk) => (
                      <option key={mk} value={mk}>
                        {mk} ({monthCounts[mk]})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* 3. Specific Date Picker */}
            <div className="sm:col-span-6 lg:col-span-3 relative">
              <label className="block text-[10px] sm:text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>تاريخ تسليم محدد:</span>
                </span>
                {deliveryDateFilter && (
                  <button
                    onClick={() => {
                      setDeliveryDateFilter('');
                      setQuickDatePreset('all');
                      setSelectedMonth('all');
                    }}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </label>

              <div className="relative">
                <input
                  type="date"
                  value={deliveryDateFilter}
                  onChange={(e) => {
                    setDeliveryDateFilter(e.target.value);
                    setQuickDatePreset('all');
                    if (e.target.value.length >= 7) {
                      setSelectedMonth(e.target.value.substring(0, 7));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500 shadow-2xs tabular-nums"
                />
              </div>
            </div>

            {/* 4. General Search (Order # / Specs / Room Code) */}
            <div className="sm:col-span-6 lg:col-span-3 relative">
              <label className="block text-[10px] sm:text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>رقم الأمر أو الموديل:</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="JO-2026، روما، زان..."
                  value={generalSearch}
                  onChange={(e) => setGeneralSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500 shadow-2xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* MASTER ROOM & FURNITURE CLASSIFICATION TRANSFERRED TO EXECUTIVE DASHBOARD */}
          <div className="pt-2.5 pb-1 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#EBF3FA]/60 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-xl border border-[#4B83B8]/30">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#233B5D]/10 text-[#233B5D] dark:text-[#4B83B8]">
                <Layers className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>حصر وتصنيف غرف وعفش الورشة</span>
                  <span className="text-[10px] bg-[#233B5D] text-white px-2 py-0.5 rounded-full font-bold">
                    مركز الاستعلام والداشبورد
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  تم نقل شاشات الحصر الكمي والمالي وتوزيع مسار مراحل الغرف إلى الداشبورد للاستعلام الشامل.
                </p>
              </div>
            </div>

            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#233B5D] hover:bg-[#1E3352] text-white text-xs font-bold transition-all hover:shadow-xs active:scale-95 cursor-pointer shrink-0"
              >
                <span>عرض حصر الغرف في الداشبورد</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            )}
          </div>

          {/* QUICK CUSTOMER NAME SELECTOR CHIPS */}
          {customerOptions.length > 0 && (
            <div className="pt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">عملاء الورشة:</span>
              {customerOptions.map(([cName, count]) => {
                const isSelected = customerNameSearch.trim() === cName.trim();
                return (
                  <button
                    key={cName}
                    onClick={() => setCustomerNameSearch(isSelected ? '' : cName)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#233B5D] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-[#EBF3FA] hover:text-[#233B5D] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{cName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-amber-950 text-amber-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* QUICK DELIVERY DATE PRESETS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>مواعيد التسليم السريعة:</span>
              </span>

              <button
                onClick={() => handleSelectQuickDate('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  quickDatePreset === 'all' && !deliveryDateFilter
                    ? 'bg-amber-950 text-amber-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                الكل
              </button>

              <button
                onClick={() => handleSelectQuickDate('november-2026')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-11'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                شهر نوفمبر 2026
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-11-05')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-11-05'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                05-11 (فوري)
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-11-08')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-11-08'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                08-11 (فاصوليا)
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-11-10')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-11-10'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                10-11 (السودان)
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-11-15')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-11-15'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                15-11 (انتريه وركنة)
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-11-22')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-11-22'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                22-11 (جاجور ومارفيل)
              </button>

              <button
                onClick={() => handleSelectQuickDate('december-2026')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-12'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                شهر ديسمبر 2026
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-12-01')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-12-01'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                01-12
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-12-05')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-12-05'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                05-12
              </button>

              <button
                onClick={() => handleSelectQuickDate('2026-12-10')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                  deliveryDateFilter === '2026-12-10'
                    ? 'bg-amber-800 text-amber-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                10-12
              </button>
            </div>

            {/* Sorting Control */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400 font-bold">ترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="ترتيب أوامر الشغل"
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 font-bold cursor-pointer text-slate-700 dark:text-slate-200"
              >
                <option value="delivery_asc">الأقرب موعد تسليم أولاً</option>
                <option value="delivery_desc">الأبعد موعد تسليم</option>
                <option value="contract_desc">الأحدث تاريخ تعاقد</option>
                <option value="order_number">رقم أمر الشغل</option>
              </select>
            </div>

          </div>

          {/* PRODUCTION STAGE FILTERS BAR */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 pb-1 px-1 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-black text-purple-900 dark:text-purple-300 shrink-0 flex items-center gap-1 ml-1">
              <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>مرحلة الورشة:</span>
            </span>

            <button
              onClick={() => setSelectedStage('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0 ${
                selectedStage === 'all'
                  ? 'bg-purple-950 text-purple-200 font-black shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              كل المراحل
            </button>

            {[
              { id: 'لم يبدأ', label: '⏳ لم يبدأ' },
              { id: 'نجارة عفش', label: '🪚 نجارة عفش' },
              { id: 'نجارة انتريهات', label: '🪵 نجارة انتريهات' },
              { id: 'خدمة وتجهيز', label: '⏱️ خدمة وتجهيز' },
              { id: 'كابينة أستر', label: '🎨 كابينة أستر' },
              { id: 'كابينة دوكو', label: '🖌️ كابينة دوكو' },
              { id: 'تنجيد', label: '🛋️ تنجيد' },
              { id: 'تشطيب وتغليف', label: '📦 تشطيب وتغليف' },
              { id: 'جاهز للتسليم', label: '🚀 جاهز للتسليم' },
            ].map((stg) => (
              <button
                key={stg.id}
                onClick={() => setSelectedStage(stg.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0 whitespace-nowrap ${
                  selectedStage === stg.id
                    ? 'bg-purple-800 text-purple-100 shadow-2xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {stg.label}
              </button>
            ))}
          </div>

        </div>

        {/* ROW 2: STATUS TABS & ACTIONS */}
        <div className="p-2 sm:p-3 bg-slate-50/80 dark:bg-slate-850 px-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Status Filters */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-none max-w-full snap-x">
            {['الكل', 'مسودة', 'قيد التشغيل', 'تم التنفيذ', 'تسليم', 'الأرشيف'].map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0 min-h-[32px] snap-start ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-amber-950 dark:text-amber-200 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Results Summary & Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 sm:gap-3 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
              عرض <strong className="text-amber-800 dark:text-amber-400 font-mono text-sm tabular-nums">{uniqueFilteredOrders.length}</strong> من أصل <span className="font-mono tabular-nums">{orders.length}</span> أمر
            </span>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إلغاء الفلاتر</span>
                </button>
              )}

              {onAddBatchOrders && (
                <button
                  onClick={() => setIsBatchImportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer shrink-0"
                  title="استيراد وتوزيع أوامر الشغل والعملاء تلقائياً"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span className="hidden xs:inline">استيراد وفرز</span>
                  <span className="xs:hidden">استيراد</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ACTIVE FILTER BADGES ROW (When filters applied) */}
        {hasActiveFilters && (
          <div className="px-4 py-2 bg-amber-50/60 dark:bg-amber-950/20 border-t border-amber-200/40 dark:border-amber-900/30 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-amber-950 dark:text-amber-300 text-[11px]">الفلاتر النشطة:</span>

            {customerNameSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-bold">
                العميل: {customerNameSearch}
                <button onClick={() => setCustomerNameSearch('')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-400 text-amber-950 dark:text-amber-200 font-black">
                {renderCategoryIcon(FURNITURE_CATEGORIES.find((c) => c.id === selectedCategory)?.iconType || '', 'w-3.5 h-3.5 text-amber-700')}
                <span>النوع: {FURNITURE_CATEGORIES.find((c) => c.id === selectedCategory)?.name}</span>
                <button onClick={() => setSelectedCategory('all')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedMonth !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-bold font-mono">
                الشهر: {selectedMonth === '2026-11' ? 'نوفمبر 2026' : selectedMonth === '2026-12' ? 'ديسمبر 2026' : selectedMonth}
                <button onClick={() => { setSelectedMonth('all'); setDeliveryDateFilter(''); setQuickDatePreset('all'); }} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {deliveryDateFilter && selectedMonth === 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-bold font-mono">
                تاريخ التسليم: {deliveryDateFilter}
                <button onClick={() => { setDeliveryDateFilter(''); setQuickDatePreset('all'); }} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {generalSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-bold">
                كلمة البحث: {generalSearch}
                <button onClick={() => setGeneralSearch('')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeFilter !== 'الكل' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-bold">
                الحالة: {activeFilter}
                <button onClick={() => setActiveFilter('الكل')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

      </div>

      {/* Orders Grid / Cards List */}
      {uniqueFilteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Filter className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
            لا توجد أوامر شغل تطابق معايير البحث والفلترة
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            تأكد من كتابة اسم العميل بشكل صحيح أو جرب اختيار نوع عفش أو شهر آخر أو الضغط على إلغاء الفلاتر.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-bold bg-amber-800 text-white rounded-xl hover:bg-amber-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>إعادة عرض جميع الأوامر</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueFilteredOrders.map((ord) => {
            const ordCategory = getOrderCategory(ord);
            const catInfo = getCategoryBadge(ordCategory);
            
            // Status-driven accent gradient
            const statusGradient =
              ord.status === 'قيد التشغيل'
                ? 'from-amber-600 via-amber-400 to-yellow-600'
                : ord.status === 'تم التنفيذ'
                ? 'from-emerald-600 via-teal-400 to-emerald-500'
                : 'from-blue-600 via-indigo-500 to-indigo-700';

            return (
            <div
              key={ord.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl hover:shadow-amber-950/5 hover:border-amber-400/80 dark:hover:border-amber-600/70 card-motion flex flex-col justify-between overflow-hidden group relative"
            >
              {/* Dynamic Top Gradient Accent Strip with Glow */}
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${statusGradient} opacity-90 transition-opacity duration-300 group-hover:opacity-100`} />

              <div>
                {/* Order Top Banner */}
                <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-amber-950 text-amber-200 shadow-2xs border border-amber-800/40 tracking-wider tabular-nums">
                      {ord.order_number}
                    </span>
                    <span className="text-[11px] font-extrabold font-mono text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300/60 dark:border-slate-700 tabular-nums">
                      {ord.room_model_code}
                    </span>
                    {catInfo && (
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${catInfo.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${catInfo.dotColor}`} />
                        <span>{catInfo.shortName}</span>
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800 flex items-center gap-1 shadow-2xs">
                      <span>📍</span>
                      <span>{ord.current_stage || 'لم يبدأ'}</span>
                    </span>
                    {ord.delivery_receipt_number && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full font-black border border-emerald-300 dark:border-emerald-700 font-mono"
                        title={`مرتبط بإقرار استلام العميل رقم ${ord.delivery_receipt_number}`}
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>{ord.delivery_receipt_number}</span>
                      </span>
                    )}
                    {ord.updated_at && ord.created_at && ord.updated_at !== ord.created_at && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/40">
                        معدّل
                      </span>
                    )}
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-2xs ${getStatusStyle(ord.status)} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                    {ord.status === 'Draft' ? 'مسودة' : ord.status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* General Specs Title */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-900 dark:group-hover:text-amber-300 transition-colors line-clamp-2 leading-relaxed">
                      {ord.general_specs}
                    </h3>
                  </div>

                  {/* Customer Info Card */}
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-amber-50/60 dark:bg-slate-800/50 border border-amber-200/50 dark:border-slate-800 transition-colors group-hover:border-amber-300/70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-800/15 text-amber-900 dark:text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-inner">
                          {ord.customer?.name ? ord.customer.name.slice(0, 1) : <User className="w-3.5 h-3.5" />}
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                          {ord.customer?.name || 'عميل غير مسجل'}
                        </span>
                      </div>
                      <span className="text-xs text-amber-900 dark:text-amber-300 font-bold font-mono bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-amber-200/80 dark:border-slate-700 shadow-2xs tabular-nums">
                        {ord.customer?.phone || 'بدون هاتف'}
                      </span>
                    </div>
                  </div>

                  {/* Specs Snapshot with Elegant Icon Grid */}
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-850/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                        <Ruler className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">
                        المقاسات: <strong className="font-mono text-slate-900 dark:text-slate-100 font-bold">{ord.job_details?.dimensions_cm || 'حسب الكارت المعتمد'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                        <Scissors className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">
                        التنجيد: <strong className="text-slate-900 dark:text-slate-100 font-bold">{ord.job_details?.fabric_source || ord.job_details?.color_code || 'كما بالمعرض'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Delivery Date Highlight & Due Countdown */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 shadow-2xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block leading-none">موعد التسليم:</span>
                        <strong className="font-mono text-xs font-black text-amber-950 dark:text-amber-200 tabular-nums">
                          {ord.delivery_date}
                        </strong>
                      </div>
                    </div>

                    <div className="tabular-nums">
                      {getDeliveryBadge(ord.delivery_date)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50/95 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectOrder(ord)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 hover:from-amber-800 hover:to-slate-900 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 group/btn"
                >
                  <Eye className="w-4 h-4 text-amber-200 transition-transform duration-200 group-hover/btn:scale-110" />
                  <span>كارت الورشة المطابق</span>
                </button>

                <button
                  onClick={() => onEditOrder(ord)}
                  className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="تعديل بيانات ومواصفات الأمر"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>تعديل</span>
                </button>

                {onOpenDeliveryReceipt && (
                  <button
                    onClick={() => onOpenDeliveryReceipt(ord)}
                    aria-label={`إقرار استلام العميل لأمر ${ord.order_number}`}
                    className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-2xs border ${
                      ord.delivery_receipt_number
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700'
                        : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                    title={
                      ord.delivery_receipt_number
                        ? `عرض إقرار الاستلام المرتبط (${ord.delivery_receipt_number})`
                        : 'إصدار وربط إقرار استلام العميل لهذا الأمر'
                    }
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{ord.delivery_receipt_number ? 'الإقرار' : 'إقرار استلام'}</span>
                  </button>
                )}

                <div className="flex items-center gap-1 flex-wrap">
                  <select
                    value={ord.status}
                    onChange={(e) => onUpdateStatus(ord.id, e.target.value as OrderStatus)}
                    aria-label="تغيير حالة الأمر"
                    className="text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 font-black cursor-pointer text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/50 shadow-2xs hover:border-amber-400 transition-colors"
                    title="تغيير حالة الأمر"
                  >
                    <option value="قيد التشغيل">تشغيل</option>
                    <option value="تم التنفيذ">تنفيذ</option>
                    <option value="تسليم">تسليم</option>
                  </select>

                  {onUpdateStage && (
                    <select
                      value={ord.current_stage || 'لم يبدأ'}
                      onChange={(e) => onUpdateStage(ord.id, e.target.value as ProductionStage)}
                      aria-label="تغيير مرحلة الورشة والإنتاج"
                      className="text-[11px] bg-purple-50 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 rounded-xl px-2 py-2 font-black cursor-pointer text-purple-950 dark:text-purple-200 focus:ring-2 focus:ring-purple-500/50 shadow-2xs hover:border-purple-400 transition-colors"
                      title="تغيير مرحلة الورشة والإنتاج الحالية"
                    >
                      <option value="لم يبدأ">⏳ لم يبدأ</option>
                      <option value="نجارة عفش">🪚 نجارة عفش</option>
                      <option value="نجارة انتريهات">🪵 نجارة انتريهات</option>
                      <option value="خدمة وتجهيز">⏱️ خدمة وتجهيز</option>
                      <option value="كابينة أستر">🎨 كابينة أستر</option>
                      <option value="كابينة دوكو">🖌️ كابينة دوكو</option>
                      <option value="تنجيد">🛋️ تنجيد</option>
                      <option value="تشطيب وتغليف">📦 تشطيب وتغليف</option>
                      <option value="جاهز للتسليم">🚀 جاهز للتسليم</option>
                    </select>
                  )}

                  <button
                    onClick={() => setOrderToDelete(ord)}
                    aria-label="حذف أمر الشغل"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-90"
                    title="حذف الأمر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {onUpdateArchiveStatus && (
                    <button
                      onClick={() => onUpdateArchiveStatus(ord.id, !ord.is_archived)}
                      className={`p-2 rounded-xl transition-all cursor-pointer active:scale-90 ${
                        ord.is_archived
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                      title={ord.is_archived ? 'استعادة من الأرشيف' : 'أرشفة أمر الشغل'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  تأكيد حذف أمر الشغل
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  رقم الأمر: <strong className="font-mono text-amber-700">{orderToDelete.order_number}</strong>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 border border-slate-200 dark:border-slate-700">
              <p><strong>العميل:</strong> {orderToDelete.customer?.name || 'غير مسجل'}</p>
              <p><strong>المواصفات:</strong> {orderToDelete.general_specs}</p>
              <p className="text-rose-600 dark:text-rose-400 font-bold text-[11px] pt-1">
                * هل أنت متأكد من الحذف النهائي؟ سينمسح الأمر من قاعدة البيانات.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onDeleteOrder(orderToDelete.id);
                  setOrderToDelete(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                تأكيد الحذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Orders Modal */}
      {isBatchImportOpen && onAddBatchOrders && (
        <BatchOrderImportModal
          isOpen={isBatchImportOpen}
          onClose={() => setIsBatchImportOpen(false)}
          onImport={onAddBatchOrders}
          existingCustomers={customers}
        />
      )}

    </div>
  );
};
