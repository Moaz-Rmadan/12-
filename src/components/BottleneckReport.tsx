import React, { useState, useMemo } from 'react';
import { JobOrderPopulated, ProductionStage } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  FURNITURE_CATEGORIES,
  getOrderCategory,
} from '../utils/furnitureClassifier';
import {
  Activity,
  Layers,
  Printer,
  Clock,
  Hammer,
  Search,
  CheckCircle2,
  Filter,
  User,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Building2,
  DollarSign,
  Calendar,
  X,
} from 'lucide-react';

interface BottleneckReportProps {
  orders: JobOrderPopulated[];
  onUpdateOrderStage?: (orderId: string, stage: ProductionStage) => void;
}

export const BottleneckReport: React.FC<BottleneckReportProps> = ({ orders, onUpdateOrderStage }) => {
  // Filter States
  const [selectedStageTab, setSelectedStageTab] = useState<string>('all'); // 'all' or specific ProductionStage
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('all');
  const [stayDurationFilter, setStayDurationFilter] = useState<string>('all'); // 'all', 'today', '1_3_days', '4_6_days', 'overdue_7'
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const productionStagesList: ProductionStage[] = [
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

  const handleStageChange = (orderId: string, newStage: ProductionStage) => {
    if (onUpdateOrderStage) {
      onUpdateOrderStage(orderId, newStage);
    }
  };

  // Extract unique approvers/supervisors dynamically
  const availableSupervisors = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((ord) => {
      const fullText = `${ord.general_specs} ${ord.job_details?.installation_notes || ''}`;
      if (fullText.includes('بشير')) set.add('م النجار: بشير');
      if (fullText.includes('مروان هلال') || fullText.includes('مروان')) set.add('م/ مروان هلال');
      if (fullText.includes('محمد عبد الله') || fullText.includes('محمد عبدالله')) set.add('م/ محمد عبد الله');
      if (fullText.includes('محمود زايد')) set.add('م/ محمود زايد');
      if (fullText.includes('الإدارة الفنية')) set.add('الإدارة الفنية');
    });
    return Array.from(set);
  }, [orders]);

  // Extract Supervisor for a specific order
  const getOrderSupervisor = (ord: JobOrderPopulated): string => {
    const fullText = `${ord.general_specs} ${ord.job_details?.installation_notes || ''}`;
    if (fullText.includes('بشير')) return 'م النجار: بشير';
    if (fullText.includes('مروان هلال') || fullText.includes('مروان')) return 'م/ مروان هلال';
    if (fullText.includes('محمد عبد الله') || fullText.includes('محمد عبدالله')) return 'م/ محمد عبد الله';
    if (fullText.includes('محمود زايد')) return 'م/ محمود زايد';
    if (fullText.includes('الإدارة الفنية')) return 'الإدارة الفنية';
    return 'م/ محمد عبد الله';
  };

  // Enriched & Filtered active orders pipeline
  const processedOrders = useMemo(() => {
    const now = new Date().getTime();

    return orders
      .filter((ord) => {
        if (ord.is_archived) return false;
        if (ord.status === 'تسليم') return false; // Completely delivered orders leave active production stages

        // 1. Stage Tab Isolation Filter
        let assignedStage: ProductionStage = ord.current_stage || 'لم يبدأ';
        if (!ord.current_stage) {
          if (ord.status === 'تم التنفيذ') {
            assignedStage = 'جاهز للتسليم';
          } else {
            const specs = (ord.general_specs || '').toLowerCase();
            if (specs.includes('انتريه') || specs.includes('صالون')) assignedStage = 'نجارة انتريهات';
            else if (specs.includes('أستر') || specs.includes('استر')) assignedStage = 'كابينة أستر';
            else if (specs.includes('دوكو')) assignedStage = 'كابينة دوكو';
            else if (specs.includes('تنجيد')) assignedStage = 'تنجيد';
            else assignedStage = 'نجارة عفش';
          }
        }

        if (selectedStageTab !== 'all' && assignedStage !== selectedStageTab) {
          return false;
        }

        // 2. Keyword Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const custName = (ord.customer?.name || '').toLowerCase();
          const custPhone = (ord.customer?.phone || '').toLowerCase();
          const orderNum = (ord.order_number || '').toLowerCase();
          const roomCode = (ord.room_model_code || '').toLowerCase();
          const specs = (ord.general_specs || '').toLowerCase();
          const wood = (ord.job_details?.wood_type || '').toLowerCase();
          const fabric = (ord.job_details?.fabric_source || ord.job_details?.color_code || '').toLowerCase();
          const notes = (ord.job_details?.installation_notes || '').toLowerCase();

          if (
            !custName.includes(term) &&
            !custPhone.includes(term) &&
            !orderNum.includes(term) &&
            !roomCode.includes(term) &&
            !specs.includes(term) &&
            !wood.includes(term) &&
            !fabric.includes(term) &&
            !notes.includes(term)
          ) {
            return false;
          }
        }

        // 3. Supervisor Filter
        if (supervisorFilter !== 'all') {
          const supervisor = getOrderSupervisor(ord);
          if (supervisor !== supervisorFilter) {
            return false;
          }
        }

        // 4. Furniture Category Filter
        if (categoryFilter !== 'all') {
          const cat = getOrderCategory(ord);
          if (cat !== categoryFilter) {
            return false;
          }
        }

        // 5. Stay Duration Filter
        const stageDateStr = ord.stage_updated_at || ord.updated_at || ord.created_at || ord.contract_date;
        const stageTime = stageDateStr ? new Date(stageDateStr).getTime() : now;
        const diffMs = Math.max(0, now - stageTime);
        const stageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (stayDurationFilter === 'today' && stageDays !== 0) return false;
        if (stayDurationFilter === '1_3_days' && (stageDays < 1 || stageDays > 3)) return false;
        if (stayDurationFilter === '4_6_days' && (stageDays < 4 || stageDays > 6)) return false;
        if (stayDurationFilter === 'overdue_7' && stageDays < 7) return false;

        return true;
      })
      .map((ord) => {
        const stageDateStr = ord.stage_updated_at || ord.updated_at || ord.created_at || ord.contract_date;
        const stageTime = stageDateStr ? new Date(stageDateStr).getTime() : now;
        const diffMs = Math.max(0, now - stageTime);
        const stageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let assignedStage: ProductionStage = ord.current_stage || 'لم يبدأ';
        if (!ord.current_stage) {
          if (ord.status === 'تم التنفيذ') {
            assignedStage = 'جاهز للتسليم';
          } else {
            const specs = (ord.general_specs || '').toLowerCase();
            if (specs.includes('انتريه') || specs.includes('صالون')) assignedStage = 'نجارة انتريهات';
            else if (specs.includes('أستر') || specs.includes('استر')) assignedStage = 'كابينة أستر';
            else if (specs.includes('دوكو')) assignedStage = 'كابينة دوكو';
            else if (specs.includes('تنجيد')) assignedStage = 'تنجيد';
            else assignedStage = 'نجارة عفش';
          }
        }

        return {
          ...ord,
          assignedStage,
          stageDays,
          supervisor: getOrderSupervisor(ord),
        };
      });
  }, [orders, selectedStageTab, searchTerm, supervisorFilter, stayDurationFilter, categoryFilter]);

  // Group processed active orders by Production Stage
  const categorizedStages = useMemo(() => {
    const stages: Record<ProductionStage, Array<JobOrderPopulated & { assignedStage: ProductionStage; stageDays: number; supervisor: string }>> = {
      'لم يبدأ': [],
      'نجارة عفش': [],
      'نجارة انتريهات': [],
      'خدمة وتجهيز': [],
      'كابينة أستر': [],
      'كابينة دوكو': [],
      'تنجيد': [],
      'تشطيب وتغليف': [],
      'جاهز للتسليم': [],
    };

    processedOrders.forEach((ord) => {
      if (stages[ord.assignedStage]) {
        stages[ord.assignedStage].push(ord);
      } else {
        stages['لم يبدأ'].push(ord);
      }
    });

    return stages;
  }, [processedOrders]);

  const totalActiveCount = processedOrders.length;

  // Selected Section KPIs (if a specific stage tab is isolated)
  const currentIsolatedStageOrders = selectedStageTab !== 'all' ? categorizedStages[selectedStageTab as ProductionStage] || [] : processedOrders;
  const currentIsolatedStageValue = currentIsolatedStageOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const currentIsolatedStageOverdueCount = currentIsolatedStageOrders.filter((o) => o.stageDays >= 7).length;
  const currentIsolatedStageAvgDays = currentIsolatedStageOrders.length > 0
    ? Math.round(currentIsolatedStageOrders.reduce((sum, o) => sum + o.stageDays, 0) / currentIsolatedStageOrders.length)
    : 0;

  const hasActiveFilters =
    selectedStageTab !== 'all' ||
    searchTerm.trim() !== '' ||
    supervisorFilter !== 'all' ||
    stayDurationFilter !== 'all' ||
    categoryFilter !== 'all';

  const handleResetFilters = () => {
    setSelectedStageTab('all');
    setSearchTerm('');
    setSupervisorFilter('all');
    setStayDurationFilter('all');
    setCategoryFilter('all');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER & ACTION CONTROLS */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 shadow-inner">
            <Activity className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-[9px] xs:text-[10px] font-mono font-black uppercase tracking-[0.15em]">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="truncate">Factory Intelligence System • Workshop Flow</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-serif leading-tight">
              تقرير مراحل الإنتاج وحركة الورش
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-md">
              تتبع لحظي لمسار الغرف داخل أقسام المصنع مع أدوات تحليل الزجاجات (Bottlenecks) والإشراف الفني.
            </p>
          </div>
        </div>

        {/* PRINT & GLOBAL ACTIONS */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {selectedStageTab !== 'all' && (
            <button
              type="button"
              onClick={() => printElementById('printable-isolated-stage-report', 'portrait')}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-black rounded-xl transition-all shadow-md active:scale-95 text-[10px] sm:text-xs border-b-4 border-amber-950"
              title={`طباعة كشف تشغيل ورشة (${selectedStageTab}) فقط`}
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة كشف ({selectedStageTab})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => printElementById('printable-bottleneck-report', 'portrait')}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition-all shadow-md active:scale-95 text-[10px] sm:text-xs border-b-4 border-purple-800"
            title="طباعة التقرير الشامل لجميع ورش المصنع"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الشامل (A4)</span>
          </button>
        </div>
      </div>

      {/* 2. PRODUCTION STAGE ISOLATION TABS */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>فلترة ورشة / قسم محدد:</span>
          </span>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-black hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 group"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
              <span>إعادة الضبط</span>
            </button>
          )}
        </div>

        {/* Stage Pills Navigation with Scroll Fade */}
        <div className="relative group">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 px-1 snap-x snap-mandatory">
            <button
              onClick={() => setSelectedStageTab('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 snap-start border ${
                selectedStageTab === 'all'
                  ? 'bg-purple-950 text-white border-purple-500 shadow-lg ring-2 ring-purple-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>جميع ورش المصنع</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                selectedStageTab === 'all' ? 'bg-purple-800/60' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {orders.filter((o) => !o.is_archived && o.status !== 'تسليم').length}
              </span>
            </button>

            {productionStagesList.map((stg) => {
              const count = categorizedStages[stg]?.length || 0;
              const isSelected = selectedStageTab === stg;
              return (
                <button
                  key={stg}
                  onClick={() => setSelectedStageTab(stg)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 snap-start border ${
                    isSelected
                      ? 'bg-purple-700 text-white border-purple-500 shadow-lg ring-2 ring-purple-400/20 scale-105 mx-1'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200'
                  }`}
                >
                  <span className={isSelected ? 'text-amber-300' : 'text-purple-500'}>●</span>
                  <span>{stg}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                    isSelected ? 'bg-purple-900/60 text-purple-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Scroll Hint Gradient */}
          <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white dark:from-slate-900 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* 3. SECTION ISOLATION KPI HIGHLIGHT CARD (WHEN STAGE IS ISOLATED) */}
      {selectedStageTab !== 'all' && (
        <div className="no-print bg-gradient-to-br from-purple-950 via-slate-900 to-purple-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-purple-800/50 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
          {/* Decorative Background Element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
          
          <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-purple-200 flex items-center justify-center shrink-0 shadow-2xl">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-purple-300 opacity-80" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-mono text-purple-300 font-black uppercase tracking-[0.2em] mb-1">
                Isolated Workflow Audit
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-serif text-white flex flex-wrap items-center gap-2">
                <span>تقرير قسم:</span>
                <span className="text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  {selectedStageTab}
                </span>
              </h3>
            </div>
          </div>

          {/* Section Metrics Cards */}
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 w-full lg:w-auto shrink-0 relative z-10">
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center card-motion group">
              <span className="text-[10px] text-purple-300 font-bold block mb-1 opacity-70 group-hover:opacity-100 transition-opacity">غرف القسم</span>
              <strong className="text-xl sm:text-2xl font-black font-mono text-amber-200 tabular-nums leading-none">
                {currentIsolatedStageOrders.length}
              </strong>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center card-motion group">
              <span className="text-[10px] text-purple-300 font-bold block mb-1 opacity-70 group-hover:opacity-100 transition-opacity">إجمالي القيمة</span>
              <strong className="text-sm sm:text-base font-black font-mono text-emerald-400 tabular-nums leading-none block mt-1">
                {currentIsolatedStageValue.toLocaleString()} <span className="text-[10px] font-sans">ج.م</span>
              </strong>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center card-motion group">
              <span className="text-[10px] text-purple-300 font-bold block mb-1 opacity-70 group-hover:opacity-100 transition-opacity">متوسط البقاء</span>
              <strong className="text-xl sm:text-2xl font-black font-mono text-purple-200 tabular-nums leading-none">
                {currentIsolatedStageAvgDays} <span className="text-[11px] font-sans opacity-60">يوم</span>
              </strong>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center card-motion group">
              <span className="text-[10px] text-purple-300 font-bold block mb-1 opacity-70 group-hover:opacity-100 transition-opacity">تأخير (7+)</span>
              <strong className={`text-xl sm:text-2xl font-black font-mono tabular-nums leading-none flex items-center justify-center gap-1 ${currentIsolatedStageOverdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currentIsolatedStageOverdueCount}
                {currentIsolatedStageOverdueCount > 0 && <AlertTriangle className="w-4 h-4 animate-bounce" />}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADVANCED SEARCH & MULTI-FILTER SUITE */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>محرك البحث والفلترة المتقدم:</span>
          </h4>

          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            <Activity className="w-3 h-3" />
            <span>المعروض حالياً: {processedOrders.length} غرفة</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
          
          {/* A. Search Input */}
          <div className="md:col-span-12 lg:col-span-6 relative">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 px-1 uppercase tracking-tighter">
              البحث الشامل بالبيانات:
            </label>
            <div className="relative group">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث برقم الأوردر، اسم العميل، الموديل، نوع الخشب، القماش..."
                className="w-full pl-10 pr-4 py-3 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all shadow-inner group-hover:border-purple-300 dark:group-hover:border-purple-700"
              />
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-purple-500 transition-colors" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>
          </div>

          {/* B. Supervisor Filter */}
          <div className="md:col-span-6 lg:col-span-3">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 px-1 uppercase tracking-tighter">
              المشرف الفني:
            </label>
            <div className="relative">
              <select
                value={supervisorFilter}
                onChange={(e) => setSupervisorFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-3 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                <option value="all">جميع المشرفين</option>
                {availableSupervisors.map((sup) => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* C. Stay Duration Filter */}
          <div className="md:col-span-6 lg:col-span-3">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 px-1 uppercase tracking-tighter">
              كفاءة الإنتاج (البقاء):
            </label>
            <div className="relative">
              <select
                value={stayDurationFilter}
                onChange={(e) => setStayDurationFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-3 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                <option value="all">جميع مستويات البقاء</option>
                <option value="today">✨ غرف جديدة (اليوم)</option>
                <option value="1_3_days">⚡ سريعة (1 - 3 أيام)</option>
                <option value="4_6_days">⚖️ مستقرة (4 - 6 أيام)</option>
                <option value="overdue_7">⚠️ متأخرة (7+ أيام)</option>
              </select>
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>

      {/* 5. ALL STAGES GRID BREAKDOWN CARDS */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3">
        {productionStagesList.map((stageName) => {
          const count = categorizedStages[stageName]?.length || 0;
          const isSelected = selectedStageTab === stageName;
          return (
            <button
              key={stageName}
              onClick={() => setSelectedStageTab(isSelected ? 'all' : stageName)}
              className={`group p-3.5 rounded-2xl border text-center space-y-2 card-motion cursor-pointer relative overflow-hidden select-none transition-all duration-300 ${
                isSelected
                  ? 'bg-gradient-to-b from-purple-800 to-purple-950 text-white border-purple-500 shadow-xl ring-4 ring-purple-500/10 scale-[1.02] z-10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-900/5 hover:shadow-lg'
              }`}
            >
              {/* Active Indicator */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
              
              <div className={`p-2 rounded-xl mx-auto w-fit transition-all duration-300 group-hover:rotate-12 ${
                isSelected 
                  ? 'bg-purple-700/80 text-amber-300 border border-purple-500/50' 
                  : 'bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 border border-transparent group-hover:border-purple-200'
              }`}>
                <Hammer className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              
              <div className="space-y-0.5">
                <span className={`text-[11px] font-black block truncate px-1 transition-colors ${isSelected ? 'text-purple-100' : 'text-slate-700 dark:text-slate-300'}`}>
                  {stageName}
                </span>
                <span className={`text-xl sm:text-2xl font-black font-mono block tabular-nums tracking-tighter drop-shadow-sm ${
                  isSelected ? 'text-amber-300' : 'text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition-colors'
                }`}>
                  {count}
                </span>
              </div>
              
              {/* Hover/Selected Glow */}
              <div className={`absolute -bottom-6 -left-6 w-12 h-12 rounded-full blur-2xl transition-opacity duration-500 ${isSelected ? 'bg-amber-400/20 opacity-100' : 'bg-purple-400/10 opacity-0 group-hover:opacity-100'}`} />
            </button>
          );
        })}
      </div>

      {/* 6. PRINTABLE OFFICIAL FULL FACTORY REPORT SHEET (A4) */}
      <div
        id="printable-bottleneck-report"
        className="bg-white p-6 sm:p-8 border-2 border-slate-900 shadow-2xl text-slate-900 font-serif max-w-[210mm] mx-auto space-y-6"
        style={{ direction: 'rtl', backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-700 text-white font-black text-2xl rounded-lg flex items-center justify-center border-2 border-purple-800 shrink-0 font-serif">
              A
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-purple-950 tracking-wide">
                النجار فيرنتشر للأثاث
              </h3>
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest font-bold">
                Workshop Flow & Production Stages Audit Report
              </p>
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-lg sm:text-xl font-black text-slate-900">
              تقرير مراحـل الإنتاج وتتبع حركة الورش
            </h4>
            <p className="text-xs font-bold text-slate-700 font-mono mt-0.5">
              تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')} | إجمالي النشط بالورش: {totalActiveCount} غرفة
            </p>
          </div>
        </div>

        {/* Stages Detailed Tables */}
        <div className="space-y-5">
          {productionStagesList.map((stageName) => {
            const items = categorizedStages[stageName] || [];
            if (selectedStageTab !== 'all' && selectedStageTab !== stageName) {
              return null; // Skip non-selected stages if isolated
            }

            return (
              <div key={stageName} className="space-y-1.5">
                <div className="bg-slate-100 border-r-4 border-purple-700 text-slate-900 px-3 py-1 font-black text-xs flex items-center justify-between">
                  <span>📍 ورشة وقسم: {stageName}</span>
                  <span className="font-mono text-[11px] font-bold">({items.length} غرفة متواجدة)</span>
                </div>

                {items.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] italic bg-slate-50 dark:bg-slate-900/50">
                    (لا توجد غرف في هذه المرحلة حالياً)
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 scrollbar-thin">
                    <table className="w-full border-collapse text-[10px] sm:text-[11px] min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2 sm:p-2.5 text-right w-20">رقم الأوردر</th>
                          <th className="p-2 sm:p-2.5 text-right">اسم العميل</th>
                          <th className="p-2 sm:p-2.5 text-right">موديل الغرفة والمواصفات</th>
                          <th className="p-2 sm:p-2.5 text-right w-32">المشرف المعتمد</th>
                          <th className="p-2 sm:p-2.5 text-center w-32 no-print">تغيير المرحلة فوراً</th>
                          <th className="p-2 sm:p-2.5 text-center w-28">مدة البقاء بالورشة</th>
                          <th className="p-2 sm:p-2.5 text-center w-28">موعد التسليم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-2 sm:p-2.5 font-mono font-black text-right tabular-nums text-amber-950 dark:text-amber-300">
                              #{ord.order_number}
                            </td>
                            <td className="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-slate-100">
                              {ord.customer?.name || 'عميل'}
                            </td>
                            <td className="p-2 sm:p-2.5 font-semibold">
                              <span className="text-slate-900 dark:text-slate-100">{ord.room_model_code}</span>
                              {ord.general_specs && (
                                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[200px] font-normal mt-0.5">
                                  {ord.general_specs}
                                </span>
                              )}
                            </td>
                            <td className="p-2 sm:p-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                              {ord.supervisor}
                            </td>
                            <td className="p-2 sm:p-2.5 text-center no-print">
                              <select
                                value={ord.current_stage || stageName}
                                onChange={(e) => handleStageChange(ord.id, e.target.value as ProductionStage)}
                                className="w-full text-[10px] font-black p-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 cursor-pointer focus:ring-2 focus:ring-purple-500"
                              >
                                {productionStagesList.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td
                              className={`p-2 sm:p-2.5 text-center font-black text-[10px] sm:text-xs tabular-nums ${
                                ord.stageDays >= 7 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                              }`}
                              title={ord.stage_updated_at ? `تاريخ الانضمام للمرحلة الحالية: ${new Date(ord.stage_updated_at).toLocaleString('ar-EG')}` : 'تاريخ الانضمام للمرحلة'}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>
                                  {ord.stageDays === 0
                                    ? 'اليوم (جديد)'
                                    : ord.stageDays === 1
                                    ? 'يوم واحد'
                                    : ord.stageDays === 2
                                    ? 'يومان'
                                    : `${ord.stageDays} أيام`}
                                </span>
                                {ord.stageDays >= 7 && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                              </div>
                            </td>
                            <td className="p-2 sm:p-2.5 text-center font-mono font-bold tabular-nums text-slate-600 dark:text-slate-400">
                              {ord.delivery_date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Signatures */}
        <div className="pt-8 border-t-2 border-slate-900 mt-6 grid grid-cols-3 gap-4 text-xs font-bold">
          <div className="space-y-4">
            <p className="text-slate-800">إعداد / مسؤول الورش:</p>
            <p className="font-mono text-slate-500">............................................</p>
          </div>
          <div className="space-y-4 text-center">
            <p className="text-slate-800">اعتماد مدير المصنع:</p>
            <p className="font-mono text-slate-500">............................................</p>
          </div>
          <div className="space-y-4 text-left pl-2">
            <p className="text-slate-800">تاريخ المراجعة:</p>
            <p className="font-mono text-slate-500">{new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </div>

      </div>

      {/* 7. PRINTABLE ISOLATED SECTION WORKSHOP SHEET (A4 - ISOLATED ONLY) */}
      {selectedStageTab !== 'all' && (
        <div className="hidden">
          <div
            id="printable-isolated-stage-report"
            className="bg-white p-6 sm:p-8 border-2 border-slate-900 text-slate-900 font-serif max-w-[210mm] mx-auto space-y-6"
            style={{ direction: 'rtl', backgroundColor: '#ffffff', color: '#000000' }}
          >
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-purple-950">
                  النجار فيرنتشر للأثاث - كشف تشغيل الورش
                </h3>
                <p className="text-sm font-bold text-amber-900 mt-1">
                  قسم ورشة: ({selectedStageTab})
                </p>
              </div>

              <div className="text-left font-mono text-xs font-bold">
                <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                <p>إجمالي الغرف بالقسم: {currentIsolatedStageOrders.length} غرفة</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-xs">
              <thead>
                <tr className="bg-slate-200 font-black">
                  <th className="border border-slate-900 p-2">رقم الأمر</th>
                  <th className="border border-slate-900 p-2">اسم العميل</th>
                  <th className="border border-slate-900 p-2">موديل الغرفة والمواصفات</th>
                  <th className="border border-slate-900 p-2">المشرف</th>
                  <th className="border border-slate-900 p-2">مدة البقاء</th>
                  <th className="border border-slate-900 p-2">موعد التسليم</th>
                </tr>
              </thead>
              <tbody>
                {currentIsolatedStageOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="border border-slate-900 p-2 font-mono font-bold">#{ord.order_number}</td>
                    <td className="border border-slate-900 p-2 font-bold">{ord.customer?.name || 'عميل'}</td>
                    <td className="border border-slate-900 p-2 font-semibold">
                      {ord.room_model_code} - {ord.general_specs}
                    </td>
                    <td className="border border-slate-900 p-2 font-bold">{ord.supervisor}</td>
                    <td className="border border-slate-900 p-2 font-mono text-center">{ord.stageDays} أيام</td>
                    <td className="border border-slate-900 p-2 font-mono text-center">{ord.delivery_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-4 text-xs font-bold">
              <div>
                <p>مستلم كشف الورشة / رئيس قسم ({selectedStageTab}):</p>
                <p className="mt-4 font-mono">............................................</p>
              </div>
              <div className="text-left">
                <p>اعتماد إدارة الإنتاج والمصنع:</p>
                <p className="mt-4 font-mono">............................................</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
