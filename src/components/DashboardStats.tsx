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
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isSelected = activeFilter === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => onFilterByStatus && onFilterByStatus(stat.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-amber-600 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {stat.value}
                </span>
                <span className="text-xs text-slate-400">أمر</span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {stat.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Revenue summary banner */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 text-amber-50 p-4 rounded-xl shadow-xs border border-amber-800/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Coins className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-amber-200">إجمالي القيمة التعاقدية للمصنع</h4>
            <p className="text-lg font-black font-mono tabular-nums tracking-tight">
              {totalRevenue.toLocaleString('ar-EG')} ج.م
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-amber-200/90 font-mono tabular-nums">
          <div>
            <span className="text-amber-400/80 block text-[10px]">المحَصَّل (المقدمات):</span>
            <span className="font-bold text-emerald-400">{totalDeposits.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div className="w-px h-8 bg-amber-800/60" />
          <div>
            <span className="text-amber-400/80 block text-[10px]">المتبقي عند التسليم:</span>
            <span className="font-bold text-amber-300">{(totalRevenue - totalDeposits).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  );
};
