import React, { useMemo } from 'react';
import { JobOrderPopulated } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  Printer,
  Award,
  TrendingUp,
  PackageCheck,
  DollarSign,
  Sparkles,
  BarChart2,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface TopSellingModelsReportProps {
  orders: JobOrderPopulated[];
}

interface ModelStats {
  modelName: string;
  totalCount: number;
  totalRevenue: number;
  inProgressCount: number;
  completedCount: number;
  deliveredCount: number;
  averagePrice: number;
  percentage: number;
}

export const TopSellingModelsReport: React.FC<TopSellingModelsReportProps> = ({ orders }) => {
  const modelStatsData = useMemo(() => {
    const statsMap: Record<string, { count: number; revenue: number; inProgress: number; completed: number; delivered: number }> = {};

    orders.forEach((ord) => {
      // Normalize model name or room code
      let modelKey = ord.room_model_code?.trim() || 'غرفة مخصصة';
      if (ord.general_specs) {
        const specs = ord.general_specs.toLowerCase();
        if (specs.includes('سفرة') || modelKey.toLowerCase().includes('سفرة')) {
          modelKey = 'سفرة فرجينيا / سفرة مودرن';
        } else if (specs.includes('نوم') || modelKey.toLowerCase().includes('bed')) {
          modelKey = 'غرفة نوم ماستر مودرن';
        } else if (specs.includes('صالون') || modelKey.toLowerCase().includes('saloon')) {
          modelKey = 'صالون كلاسيك مذهب';
        } else if (specs.includes('ركنة') || modelKey.toLowerCase().includes('corner')) {
          modelKey = 'ركنة ليفينج (L-Shape)';
        } else if (specs.includes('انتريه') || modelKey.toLowerCase().includes('sofa')) {
          modelKey = 'انتريه صالون حديث';
        } else if (specs.includes('أطفال') || specs.includes('اطفال')) {
          modelKey = 'غرفة نوم أطفال';
        }
      }

      if (!statsMap[modelKey]) {
        statsMap[modelKey] = { count: 0, revenue: 0, inProgress: 0, completed: 0, delivered: 0 };
      }

      statsMap[modelKey].count += 1;
      statsMap[modelKey].revenue += ord.total_price || 0;

      if (ord.status === 'قيد التشغيل') {
        statsMap[modelKey].inProgress += 1;
      } else if (ord.status === 'تم التنفيذ') {
        statsMap[modelKey].completed += 1;
      } else if (ord.status === 'تسليم') {
        statsMap[modelKey].delivered += 1;
      }
    });

    const totalOrdersCount = orders.length || 1;

    const list: ModelStats[] = Object.entries(statsMap).map(([modelName, data]) => ({
      modelName,
      totalCount: data.count,
      totalRevenue: data.revenue,
      inProgressCount: data.inProgress,
      completedCount: data.completed,
      deliveredCount: data.delivered,
      averagePrice: Math.round(data.revenue / (data.count || 1)),
      percentage: Number(((data.count / totalOrdersCount) * 100).toFixed(1)),
    }));

    // Sort descending by totalCount and revenue
    list.sort((a, b) => b.totalCount - a.totalCount || b.totalRevenue - a.totalRevenue);

    return list;
  }, [orders]);

  const summary = useMemo(() => {
    let totalCount = 0;
    let totalRevenue = 0;
    modelStatsData.forEach((m) => {
      totalCount += m.totalCount;
      totalRevenue += m.totalRevenue;
    });
    return { totalCount, totalRevenue };
  }, [modelStatsData]);

  return (
    <div className="space-y-6">
      
      {/* HEADER & CONTROLS */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Top-Selling Room Models & Production Analytics</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-serif">
              تقرير أكثر الموديلات والغرف مبيعاً وطلباً
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ترتيب تنازلي للموديلات الأكثر إقبالاً وإيراداً لتوجيه سياسات الشراء والإنتاج في المصنع بدقة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => printElementById('printable-top-models-report', 'portrait')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black rounded-xl transition-all shadow-md cursor-pointer text-xs"
            title="طباعة التقرير التحليلي الرسمي"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة تقرير الموديلات (A4)</span>
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 font-black text-lg">
            🏆
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">إجمالي الطرازات والموديلات</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {modelStatsData.length} موديلات
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 font-black text-lg">
            📊
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">إجمالي الغرف المسجلة</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {summary.totalCount} غرفة
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0 font-black text-lg">
            💰
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">إجمالي عوائد الموديلات</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {summary.totalRevenue.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL REPORT SHEET */}
      <div
        id="printable-top-models-report"
        className="bg-white p-6 sm:p-8 border-2 border-slate-900 shadow-2xl text-slate-900 font-serif max-w-[210mm] mx-auto space-y-6"
        style={{ direction: 'rtl', backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 text-amber-950 font-black text-2xl rounded-lg flex items-center justify-center border-2 border-amber-600 shrink-0 font-serif">
              A
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-amber-950 tracking-wide">
                النجار فيرنتشر للأثاث
              </h3>
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest font-bold">
                El-Naggar Furniture - Top-Selling Models Analytics
              </p>
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-lg sm:text-xl font-black text-slate-900">
              تقرير الغرف والموديلات الأكثر مبيعاً
            </h4>
            <p className="text-xs font-bold text-slate-700 font-mono mt-0.5">
              تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-900">
            <table className="w-full border-collapse border border-slate-900 text-xs min-w-[700px]">
              <thead>
                <tr className="bg-amber-300 text-black font-black">
                  <th className="border border-slate-900 p-2 text-center w-10">المركز</th>
                  <th className="border border-slate-900 p-2 text-right">اسم الموديل / الطراز</th>
                  <th className="border border-slate-900 p-2 text-center">عدد الغرف</th>
                  <th className="border border-slate-900 p-2 text-center">نسبة الإقبال</th>
                  <th className="border border-slate-900 p-2 text-right">إجمالي المبيعات</th>
                  <th className="border border-slate-900 p-2 text-center">قيد التشغيل / منتهى</th>
                </tr>
              </thead>
              <tbody>
                {modelStatsData.map((item, idx) => (
                  <tr key={item.modelName} className="hover:bg-slate-50 font-bold transition-colors">
                    <td className="border border-slate-900 p-2 text-center font-mono bg-slate-100">
                      {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                    </td>
                    <td className="border border-slate-900 p-2 text-right text-slate-900">
                      {item.modelName}
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono tabular-nums">
                      {item.totalCount} غرفة
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono text-emerald-800 tabular-nums">
                      {item.percentage}%
                    </td>
                    <td className="border border-slate-900 p-2 text-right font-mono tabular-nums">
                      {item.totalRevenue.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono text-[11px] tabular-nums">
                      <span className="text-amber-700">{item.inProgressCount} قيد الورشة</span> /{' '}
                      <span className="text-emerald-700">{item.completedCount + item.deliveredCount} منجز</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black">
                <tr>
                  <td colSpan={2} className="border border-slate-900 p-3 text-left">
                    الإجمالي العام للموديلات:
                  </td>
                  <td className="border border-slate-900 p-3 text-center font-mono tabular-nums">
                    {summary.totalCount} غرفة
                  </td>
                  <td className="border border-slate-900 p-3 text-center font-mono">100%</td>
                  <td colSpan={2} className="border border-slate-900 p-3 text-right font-mono text-amber-300 tabular-nums">
                    {summary.totalRevenue.toLocaleString('ar-EG')} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="no-print text-[10px] text-slate-400 font-bold text-center sm:hidden">
             💡 اسحب الجدول لليمين لمشاهدة كافة التفاصيل المالية والنسب
          </p>
        </div>

        {/* Recommendations / Insights for Management */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs font-semibold text-amber-950">
          <div className="flex items-center gap-2 font-black text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>رؤية وتوصيات الإدارة التنفيذية بناءً على الأرقام:</span>
          </div>
          <p className="leading-relaxed">
            - الموديل الأكثر طلباً حالياً هو <strong className="text-amber-900">{modelStatsData[0]?.modelName || 'سفرة فرجينيا'}</strong> بنسبة إقبال <strong className="text-emerald-800">{modelStatsData[0]?.percentage || 0}%</strong> من إجمالي إنتاج المصنع.
            يُوصى بتوفير رصيد كافٍ من الخامات والأخشاب الخاصة بهذا الموديل مسبقاً لضمان سرعة التسليم دون أي تأخير في الورش.
          </p>
        </div>

        {/* Footer Signatures */}
        <div className="pt-8 border-t-2 border-slate-900 mt-6 grid grid-cols-3 gap-4 text-xs font-bold">
          <div className="space-y-4">
            <p className="text-slate-800">إعداد / مدير الإنتاج:</p>
            <p className="font-mono text-slate-500">............................................</p>
          </div>
          <div className="space-y-4 text-center">
            <p className="text-slate-800">اعتماد صاحب المصنع:</p>
            <p className="font-mono text-slate-500">............................................</p>
          </div>
          <div className="space-y-4 text-left pl-2">
            <p className="text-slate-800">تاريخ الاعتماد:</p>
            <p className="font-mono text-slate-500">{new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </div>

      </div>

    </div>
  );
};
