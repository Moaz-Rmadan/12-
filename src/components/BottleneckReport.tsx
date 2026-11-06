import React, { useState, useMemo } from 'react';
import { JobOrderPopulated, ProductionStage } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  Activity,
  Layers,
  Printer,
  Clock,
  Hammer,
  Palette,
  Scissors,
  PackageCheck,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface BottleneckReportProps {
  orders: JobOrderPopulated[];
  onUpdateOrderStage?: (orderId: string, stage: ProductionStage) => void;
}

export const BottleneckReport: React.FC<BottleneckReportProps> = ({ orders, onUpdateOrderStage }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  // Categorize orders into production stages based on current_stage or smart fallback
  const categorizedStages = useMemo(() => {
    const activeOrders = orders.filter((ord) => {
      if (ord.is_archived) return false;
      if (ord.status === 'تسليم') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const custName = (ord.customer?.name || '').toLowerCase();
        const orderNum = (ord.order_number || '').toLowerCase();
        const roomCode = (ord.room_model_code || '').toLowerCase();
        const specs = (ord.general_specs || '').toLowerCase();
        if (
          !custName.includes(term) &&
          !orderNum.includes(term) &&
          !roomCode.includes(term) &&
          !specs.includes(term)
        ) {
          return false;
        }
      }
      return true;
    });

    const stages: Record<ProductionStage, Array<JobOrderPopulated & { stageDays: number }>> = {
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

    const now = new Date().getTime();

    activeOrders.forEach((ord) => {
      const stageDateStr = ord.stage_updated_at || ord.updated_at || ord.created_at || ord.contract_date;
      const stageTime = stageDateStr ? new Date(stageDateStr).getTime() : now;
      const diffMs = Math.max(0, now - stageTime);
      const stageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const enriched = { ...ord, stageDays };

      // Determine stage: 100% explicit current_stage if set, otherwise fallback
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

      if (stages[assignedStage]) {
        stages[assignedStage].push(enriched);
      } else {
        stages['لم يبدأ'].push(enriched);
      }
    });

    return stages;
  }, [orders, searchTerm]);

  const totalActiveCount = Object.values(categorizedStages).reduce(
    (acc, list) => acc + list.length,
    0
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER & CONTROLS */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Production Stage & Workshop Flow Tracker</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-serif">
              تقرير مراحـل الإنتاج وتتبع حركة الورش (مزامنة فورية 100%)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مربوط تلقائياً مع مراحل التشغيل المحددة داخل كروت الأوامر. يمكنك تغيير المرحلة لأي أمر من الجداول أدناه ليحدث فوراً عبر النظام بالكامل.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => printElementById('printable-bottleneck-report', 'portrait')}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition-all shadow-md cursor-pointer text-xs"
            title="طباعة تقرير مراحـل الإنتاج والورش"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة تقرير مراحل الإنتاج (A4)</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث سريع في الورش ومراحل التشغيل..."
          className="w-full bg-transparent border-0 text-xs font-bold focus:outline-none text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* STAGE SUMMARY CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
        {productionStagesList.map((stageName) => {
          const count = categorizedStages[stageName]?.length || 0;
          return (
            <div
              key={stageName}
              className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 text-center"
            >
              <Hammer className="w-5 h-5 text-purple-700 mx-auto" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block truncate">
                {stageName}
              </span>
              <span className="text-lg font-black font-mono text-purple-950 dark:text-purple-300">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* PRINTABLE OFFICIAL REPORT SHEET */}
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
              تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')} | إجمالي النشط: {totalActiveCount} غرفة
            </p>
          </div>
        </div>

        {/* Stages Detailed Tables */}
        <div className="space-y-4">
          {productionStagesList.map((stageName) => {
            const items = categorizedStages[stageName] || [];
            return (
              <div key={stageName} className="space-y-1.5">
                <div className="bg-slate-100 border-r-4 border-purple-700 text-slate-900 px-3 py-1 font-black text-xs flex items-center justify-between">
                  <span>📍 مرحلة: {stageName}</span>
                  <span className="font-mono text-[11px] font-bold">({items.length} غرفة)</span>
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
                        <th className="border border-slate-900 p-1.5 text-center w-28 no-print">تغيير المرحلة فوراً</th>
                        <th className="border border-slate-900 p-1.5 text-center w-24">مدة البقاء</th>
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
                              <span className="text-[10px] text-slate-600 block truncate max-w-[180px]">
                                {ord.general_specs}
                              </span>
                            )}
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

    </div>
  );
};
