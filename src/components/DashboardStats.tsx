import React from 'react';
import { JobOrderPopulated } from '../types';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  PackageCheck,
  Coins,
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
  const totalOrders = orders.length;
  const inProgress = orders.filter((o) => o.status === 'قيد التشغيل').length;
  const completed = orders.filter((o) => o.status === 'تم التنفيذ').length;
  const delivered = orders.filter((o) => o.status === 'تسليم').length;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalDeposits = orders.reduce((sum, o) => sum + (o.deposit_paid || 0), 0);

  const stats = [
    {
      id: 'الكل',
      title: 'إجمالي الأوامر',
      value: totalOrders,
      subtext: `${totalOrders} أمر شغل مسجل`,
      icon: ClipboardList,
      color: 'from-amber-600 to-amber-800 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      id: 'قيد التشغيل',
      title: 'قيد التشغيل بالورشة',
      value: inProgress,
      subtext: 'مرحلة النجار والدهان والتنجيد',
      icon: Clock,
      color: 'from-amber-500 to-yellow-600 text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isSelected = activeFilter === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => onFilterByStatus && onFilterByStatus(stat.id)}
              className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-amber-600 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white/90 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-400 truncate max-w-[100px] sm:max-w-none">
                  {stat.title}
                </span>
                <div className={`p-1.5 sm:p-2 rounded-xl ${stat.color} shrink-0`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {stat.value}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-bold">أمر</span>
              </div>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {stat.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Revenue summary banner */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 text-amber-50 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-[11px] sm:text-xs font-bold text-amber-200">إجمالي القيمة التعاقدية للمصنع</h4>
            <p className="text-base sm:text-lg font-black font-mono tabular-nums tracking-tight text-white">
              {totalRevenue.toLocaleString('ar-EG')} ج.م
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-xs text-amber-200/90 font-mono tabular-nums pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-800/50">
          <div>
            <span className="text-amber-400/80 block text-[9px] sm:text-[10px]">المحَصَّل (المقدمات):</span>
            <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">{totalDeposits.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div className="w-px h-7 bg-amber-800/80" />
          <div>
            <span className="text-amber-400/80 block text-[9px] sm:text-[10px]">المتبقي عند التسليم:</span>
            <span className="font-extrabold text-amber-300 text-xs sm:text-sm">{(totalRevenue - totalDeposits).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  );
};
