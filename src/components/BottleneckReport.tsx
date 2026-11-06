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
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Section Production Audit & Advanced Stage Flow Tracker</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-serif">
              تقرير مراحل الإنتاج والورش مع محرك البحث المتقدم
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تصفح الأوامر المتواجدة في كل ورشة وقسم بشكل منفصل، ابحث بالمشرفين أو الموديل أو المقاسات، وحدث المراحل لحظياً.
            </p>
          </div>
        </div>

        {/* PRINT BUTTONS */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {selectedStageTab !== 'all' && (
            <button
              type="button"
              onClick={() => printElementById('printable-isolated-stage-report', 'portrait')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-black rounded-xl transition-all shadow-md cursor-pointer text-xs"
              title={`طباعة كشف تشغيل ورشة (${selectedStageTab}) فقط`}
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة كشف ورشة ({selectedStageTab})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => printElementById('printable-bottleneck-report', 'portrait')}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition-all shadow-md cursor-pointer text-xs"
            title="طباعة التقرير الشامل لجميع ورش المصنع"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الشامل للورش (A4)</span>
          </button>
        </div>
      </div>

      {/* 2. PRODUCTION STAGE ISOLATION TABS */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>عزل وتصفية تقرير ورشة / قسم محدد:</span>
          </span>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة عرض جميع المراحل</span>
            </button>
          )}
        </div>

        {/* Stage Pills Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setSelectedStageTab('all')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedStageTab === 'all'
                ? 'bg-purple-950 text-purple-100 shadow-md ring-2 ring-purple-500/50'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>🌐 جميع ورش المصنع</span>
            <span className="bg-purple-800/60 px-2 py-0.5 rounded-full text-[10px] font-mono">
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
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-750'
                }`}
              >
                <span>{stg}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-purple-950 text-purple-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SECTION ISOLATION KPI HIGHLIGHT CARD (WHEN STAGE IS ISOLATED) */}
      {selectedStageTab !== 'all' && (
        <div className="no-print bg-gradient-to-r from-purple-950 via-purple-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-purple-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-widest">
                Isolated Section Breakdown
              </div>
              <h3 className="text-lg font-black font-serif text-white flex items-center gap-2">
                <span>تقرير قسم وورشة:</span>
                <span className="text-amber-300 bg-amber-950/60 px-3 py-0.5 rounded-lg border border-amber-500/40">
                  {selectedStageTab}
                </span>
              </h3>
            </div>
          </div>

          {/* Section Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto shrink-0">
            <div className="bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/60 text-center">
              <span className="text-[10px] text-purple-300 font-bold block">غرف بالورشة</span>
              <strong className="text-lg font-black font-mono text-amber-200">
                {currentIsolatedStageOrders.length}
              </strong>
            </div>

            <div className="bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/60 text-center">
              <span className="text-[10px] text-purple-300 font-bold block">القيمة المادية</span>
              <strong className="text-sm font-black font-mono text-emerald-300">
                {currentIsolatedStageValue.toLocaleString()} ج.م
              </strong>
            </div>

            <div className="bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/60 text-center">
              <span className="text-[10px] text-purple-300 font-bold block">متوسط مدة البقاء</span>
              <strong className="text-sm font-black font-mono text-purple-200">
                {currentIsolatedStageAvgDays} أيام
              </strong>
            </div>

            <div className="bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/60 text-center">
              <span className="text-[10px] text-purple-300 font-bold block">أوامر متأخرة (7+)</span>
              <strong className={`text-lg font-black font-mono ${currentIsolatedStageOverdueCount > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                {currentIsolatedStageOverdueCount} {currentIsolatedStageOverdueCount > 0 && '⚠️'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADVANCED SEARCH & MULTI-FILTER SUITE */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>محرك البحث المتقدم والفلترة الدقيقة بالورش:</span>
          </h4>

          <span className="text-xs font-bold text-slate-500 font-mono">
            عدد الأوامر المعروضة: {processedOrders.length} غرفة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* A. Search Input */}
          <div className="sm:col-span-2 relative">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-purple-600" />
              <span>البحث الشامل (رقم الأمر / العميل / كود الغرفة / القماش / الخشب):</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بـ JO-2026، اسم العميل، زان أحمر، قطيفة فاخرة..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* B. Supervisor Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>المشرف / المهندس المعتمد:</span>
            </label>
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
            >
              <option value="all">جميع المشرفين والمهندسين</option>
              {availableSupervisors.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          {/* C. Stay Duration Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>مدة البقاء بالورشة:</span>
            </label>
            <select
              value={stayDurationFilter}
              onChange={(e) => setStayDurationFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
            >
              <option value="all">جميع أوقات البقاء</option>
              <option value="today">جديد بالورشة (اليوم 0 يوم)</option>
              <option value="1_3_days">حديث (1 - 3 أيام)</option>
              <option value="4_6_days">مستقر بالورشة (4 - 6 أيام)</option>
              <option value="overdue_7">⚠️ متأخر بالورشة (7 أيام أو أكثر)</option>
            </select>
          </div>

        </div>
      </div>

      {/* 5. ALL STAGES GRID BREAKDOWN CARDS */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
        {productionStagesList.map((stageName) => {
          const count = categorizedStages[stageName]?.length || 0;
          const isSelected = selectedStageTab === stageName;
          return (
            <button
              key={stageName}
              onClick={() => setSelectedStageTab(isSelected ? 'all' : stageName)}
              className={`p-3 rounded-xl border text-center space-y-1 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-900 text-white border-purple-500 shadow-md ring-2 ring-purple-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
              }`}
            >
              <Hammer className={`w-4 h-4 mx-auto ${isSelected ? 'text-amber-300' : 'text-purple-600'}`} />
              <span className="text-[11px] font-bold block truncate">
                {stageName}
              </span>
              <span className={`text-lg font-black font-mono block ${isSelected ? 'text-amber-200' : 'text-purple-950 dark:text-purple-300'}`}>
                {count}
              </span>
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
                  <div className="p-2 text-center text-slate-400 border border-slate-200 text-[11px] italic bg-slate-50">
                    (لا توجد غرف في هذه المرحلة حالياً)
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-slate-900 text-[11px]">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 font-black">
                        <th className="border border-slate-900 p-1.5 text-right w-16">رقم الأوردر</th>
                        <th className="border border-slate-900 p-1.5 text-right">اسم العميل</th>
                        <th className="border border-slate-900 p-1.5 text-right">موديل الغرفة والمواصفات</th>
                        <th className="border border-slate-900 p-1.5 text-right w-28">المشرف المعتمد</th>
                        <th className="border border-slate-900 p-1.5 text-center w-28 no-print">تغيير المرحلة فوراً</th>
                        <th className="border border-slate-900 p-1.5 text-center w-24">مدة البقاء بالورشة</th>
                        <th className="border border-slate-900 p-1.5 text-center w-24">موعد التسليم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="border border-slate-900 p-1.5 font-mono font-bold text-right">
                            #{ord.order_number}
                          </td>
                          <td className="border border-slate-900 p-1.5 font-bold">
                            {ord.customer?.name || 'عميل'}
                          </td>
                          <td className="border border-slate-900 p-1.5 font-semibold">
                            {ord.room_model_code}
                            {ord.general_specs && (
                              <span className="text-[10px] text-slate-600 block truncate max-w-[200px]">
                                {ord.general_specs}
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-900 p-1.5 text-xs font-bold text-slate-800">
                            {ord.supervisor}
                          </td>
                          <td className="border border-slate-900 p-1.5 text-center no-print">
                            <select
                              value={ord.current_stage || stageName}
                              onChange={(e) => handleStageChange(ord.id, e.target.value as ProductionStage)}
                              className="w-full text-[10px] font-bold p-1 rounded border border-purple-300 bg-purple-50 text-purple-950 cursor-pointer"
                            >
                              {productionStagesList.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            className={`border border-slate-900 p-1.5 text-center font-bold text-xs ${
                              ord.stageDays >= 7 ? 'bg-rose-100 text-rose-900' : 'text-slate-800'
                            }`}
                            title={ord.stage_updated_at ? `تاريخ الانضمام للمرحلة الحالية: ${new Date(ord.stage_updated_at).toLocaleString('ar-EG')}` : 'تاريخ الانضمام للمرحلة'}
                          >
                            {ord.stageDays === 0
                              ? 'اليوم (جديد)'
                              : ord.stageDays === 1
                              ? 'يوم واحد'
                              : ord.stageDays === 2
                              ? 'يومان'
                              : `${ord.stageDays} أيام`}
                            {ord.stageDays >= 7 && ' ⚠️'}
                          </td>
                          <td className="border border-slate-900 p-1.5 text-center font-mono">
                            {ord.delivery_date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
