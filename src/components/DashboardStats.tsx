import React, { useState } from 'react';
import { JobOrderPopulated } from '../types';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  PackageCheck,
  Coins,
  TrendingUp,
  PieChart,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface DashboardStatsProps {
  orders: JobOrderPopulated[];
  onFilterByStatus?: (status: string) => void;
  activeFilter?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  orders,
  onFilterByStatus,
  activeFilter = 'الكل',
}) => {
  const [showDetailedKpis, setShowDetailedKpis] = useState(false);

  // Key Totals
  const totalOrders = orders.length;
  const inProgress = orders.filter((o) => o.status === 'قيد التشغيل').length;
  const completed = orders.filter((o) => o.status === 'تم التنفيذ').length;
  const delivered = orders.filter((o) => o.status === 'تسليم').length;

  // Financial KPIs
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalDeposits = orders.reduce((sum, o) => sum + (o.deposit_paid || 0), 0);
  const remainingBalance = totalRevenue - totalDeposits;

  const collectionRate = totalRevenue > 0 ? Math.round((totalDeposits / totalRevenue) * 100) : 0;
  const completionRate = totalOrders > 0 ? Math.round(((completed + delivered) / totalOrders) * 100) : 0;

  // Urgent Orders Count (due within 48 hours or past due, not delivered)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const urgentCount = orders.filter((o) => {
    if (o.is_archived || o.status === 'تسليم' || !o.delivery_date) return false;
    const parts = o.delivery_date.split('-');
    if (parts.length !== 3) return false;
    const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    target.setHours(0, 0, 0, 0);
    const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 48;
  }).length;

  const stats = [
    {
      id: 'الكل',
      title: 'إجمالي الأوامر',
      value: totalOrders,
      subtext: `${totalOrders} أمر شغل مسجل`,
      icon: ClipboardList,
      color: 'from-[#233B5D] to-[#1E3352] text-[#233B5D] bg-[#EBF3FA] dark:bg-slate-800 dark:text-[#4B83B8]',
    },
    {
      id: 'قيد التشغيل',
      title: 'قيد التشغيل بالورشة',
      value: inProgress,
      subtext: 'مرحلة النجار والدهان والتنجيد',
      icon: Clock,
      color: 'from-[#4B83B8] to-[#3A6E9F] text-[#4B83B8] bg-[#EBF3FA] dark:bg-slate-800 dark:text-[#4B83B8]',
    },
    {
      id: 'تم التنفيذ',
      title: 'تم التنفيذ والمطابقة',
      value: completed,
      subtext: 'جاهز للتسليم والتركيب',
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-700 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      id: 'تسليم',
      title: 'تم التسليم والتركيب',
      value: delivered,
      subtext: 'تم التسليم في موقع العميل',
      icon: PackageCheck,
      color: 'from-blue-600 to-indigo-700 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400',
    },
  ];

  return (
    <div className="space-y-4 mb-6 sm:mb-8">
      
      {/* TOP SUMMARY STAT CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isSelected = activeFilter === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => onFilterByStatus && onFilterByStatus(stat.id)}
              className={`p-3.5 sm:p-4.5 rounded-2xl border card-motion cursor-pointer select-none relative overflow-hidden group ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-[#4B83B8] dark:border-[#4B83B8] shadow-md ring-2 ring-[#4B83B8]/20'
                  : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-[#4B83B8]/60 hover:shadow-lg'
              }`}
            >
              {/* Subtle Ambient Hover Glow on Top */}
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]} transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-xs font-black text-slate-600 dark:text-slate-400 truncate max-w-[110px] sm:max-w-none group-hover:text-[#233B5D] dark:group-hover:text-slate-200 transition-colors">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl ${stat.color} shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-2xs`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-2xl sm:text-3xl font-black text-[#233B5D] dark:text-slate-100 font-mono tabular-nums tracking-tight">
                  {stat.value}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 font-bold">أمر</span>
              </div>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {stat.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* REVENUE & FINANCIAL KPI BANNER */}
      <div className="card-motion bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3A61] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-[#233B5D]/80 space-y-3 relative overflow-hidden">
        {/* Subtle decorative blue sheen */}
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#4B83B8]/20 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#4B83B8]/20 text-[#4B83B8] border border-[#4B83B8]/40 shrink-0 shadow-inner">
              <Coins className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-200">إجمالي القيمة التعاقدية للمصنع</h4>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                  تحصيل {collectionRate}%
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono tabular-nums tracking-tight text-white mt-0.5">
                {totalRevenue.toLocaleString('ar-EG')} ج.م
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-3 xs:gap-5 text-xs text-slate-200 font-mono tabular-nums pt-2 sm:pt-0 border-t sm:border-t-0 border-[#233B5D]">
            <div>
              <span className="text-slate-300 block text-[9px] xs:text-[10px] font-sans font-bold">المحَصَّل (المقدمات):</span>
              <span className="font-black text-emerald-400 text-xs xs:text-sm sm:text-base">{totalDeposits.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="w-px h-8 bg-[#233B5D] shrink-0" />
            <div>
              <span className="text-slate-300 block text-[9px] xs:text-[10px] font-sans font-bold">المتبقي عند التسليم:</span>
              <span className="font-black text-[#4B83B8] text-xs xs:text-sm sm:text-base">{remainingBalance.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
        </div>

        {/* FINANCIAL COLLECTION PROGRESS METER */}
        <div className="pt-2 border-t border-[#233B5D] relative z-10">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 mb-1.5">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>نسبة السيولة والمقبوضات الفعلية:</span>
            </span>
            <span className="font-mono text-emerald-400 font-extrabold">{collectionRate}% تم تحصيله</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#121E30] overflow-hidden p-0.5 border border-[#233B5D] flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-xs"
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
        </div>

      </div>

      {/* TOGGLE BUTTON FOR DETAILED EXECUTIVE KPI METRICS */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowDetailedKpis(!showDetailedKpis)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-white dark:bg-slate-900 text-[#233B5D] dark:text-[#4B83B8] border border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-[#EBF3FA] dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-[#4B83B8]" />
          <span>{showDetailedKpis ? 'إخفاء مؤشرات الأداء المتقدمة' : 'عرض لوحة مؤشرات الأداء المتقدمة (Executive KPIs)'}</span>
          {showDetailedKpis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* DETAILED EXECUTIVE KPI INSIGHTS PANEL */}
      {showDetailedKpis && (
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#233B5D] dark:text-[#4B83B8]" />
              <h3 className="text-sm font-black text-[#233B5D] dark:text-slate-100">
                لوحة التحليلات ومؤشرات الأداء الإستراتيجية (Executive Analytics Dashboard)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              مصنع النجار فيرنتشر
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            
            {/* KPI CARD 1: WORKSHOP COMPLETION RATE */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 card-motion hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 tracking-tight">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>نسبة كفاءة الإنجاز والتسليم</span>
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
                  {completionRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                الأوامر الجاهزة والمنفذة مقارنة بإجمالي أوامر الورشة.
              </p>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* KPI CARD 2: URGENCY & OVERDUE SCHEDULE */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 card-motion hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 tracking-tight">
                  <AlertTriangle className={`w-4 h-4 ${urgentCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                  <span>التنبيهات الحرجة (خلال 48 س)</span>
                </span>
                <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-full tabular-nums ${
                  urgentCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {urgentCount} أمر حرج
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                أوامر شغل يستوجب تسليمها خلال الـ 48 ساعة القادمة أو متأخرة.
              </p>
            </div>

            {/* KPI CARD 3: AVERAGE CONTRACT VALUE */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 card-motion hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 tracking-tight">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>متوسط قيمة العقد الواحد</span>
                </span>
                <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-sm tabular-nums">
                  {totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString('ar-EG') : 0} ج.م
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                معدل القيمة التعاقدية المتوسطة لكل أمر شغل بالمصنع.
              </p>
            </div>

          </div>

          {/* STACKED WORKSHOP PRODUCTION PIPELINE BAR */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>توزيع أوامر الشغل حسب خطوط الإنتاج:</span>
              <span className="font-mono text-slate-500">
                {inProgress} تشغيل · {completed} تنفيذ · {delivered} تسليم
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              {totalOrders > 0 && (
                <>
                  <div
                    style={{ width: `${(inProgress / totalOrders) * 100}%` }}
                    className="h-full bg-amber-500 transition-all"
                    title={`قيد التشغيل: ${inProgress}`}
                  />
                  <div
                    style={{ width: `${(completed / totalOrders) * 100}%` }}
                    className="h-full bg-emerald-500 transition-all"
                    title={`تم التنفيذ: ${completed}`}
                  />
                  <div
                    style={{ width: `${(delivered / totalOrders) * 100}%` }}
                    className="h-full bg-indigo-600 transition-all"
                    title={`تم التسليم: ${delivered}`}
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 text-[11px] font-bold pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-700 dark:text-slate-300">قيد التشغيل ({inProgress})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300">تم التنفيذ والمطابقة ({completed})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-slate-700 dark:text-slate-300">تم التسليم ({delivered})</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
