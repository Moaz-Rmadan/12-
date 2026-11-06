import React, { useState, useMemo } from 'react';
import { JobOrderPopulated } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  AlertTriangle,
  Clock,
  Printer,
  ShieldAlert,
  User,
  Calendar,
  Sparkles,
  CheckCircle,
  FileText,
  Search,
} from 'lucide-react';

interface CriticalOverdueReportProps {
  orders: JobOrderPopulated[];
  onUpdateOrderDelayReason?: (orderId: string, reason: string) => void;
}

export const CriticalOverdueReport: React.FC<CriticalOverdueReportProps> = ({
  orders,
  onUpdateOrderDelayReason,
}) => {
  const [delayReasons, setDelayReasons] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('all');

  // Common delay reasons list for factory management
  const commonDelayReasons = [
    'تأخير استلام الخامات والأقمشة من المورد',
    'مرحلة الدهان والأستر (تجفيف وتظبيط اللون)',
    'مرحلة النجارة والهيكل الخشبي',
    'طلب العميل تعديل مقاسات أو إضافات خاصة',
    'إعادة فحص الجودة ومعالجة عيوب تشطيب',
    'ضغط العمل في الورشة وازدحام جدول التشغيل',
  ];

  const handleReasonChange = (orderId: string, reason: string) => {
    setDelayReasons((prev) => ({ ...prev, [orderId]: reason }));
    if (onUpdateOrderDelayReason) {
      onUpdateOrderDelayReason(orderId, reason);
    }
  };

  // Helper to parse date string YYYY-MM-DD or DD/MM/YYYY
  const parseDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
    return isNaN(d.getTime()) ? null : d;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Categorize orders into Overdue, Critical (1-3 days), Upcoming (4-7 days)
  const analyzedOrders = useMemo(() => {
    const list = orders.filter((ord) => {
      // Ignore finished/delivered orders
      if (['تم التنفيذ', 'تسليم'].includes(ord.status)) return false;

      const deliveryDate = parseDate(ord.delivery_date);
      if (!deliveryDate) return false;

      deliveryDate.setHours(0, 0, 0, 0);
      const diffTime = deliveryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // We care about overdue (diffDays < 0) or upcoming within 7 days (diffDays >= 0 && diffDays <= 7)
      if (diffDays > 7) return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const custName = (ord.customer?.name || '').toLowerCase();
        const orderNum = (ord.order_number || '').toLowerCase();
        const roomCode = (ord.room_model_code || '').toLowerCase();
        if (!custName.includes(term) && !orderNum.includes(term) && !roomCode.includes(term)) {
          return false;
        }
      }

      // Supervisor filter
      // Determine engineer / supervisor based on specs or salesperson or default
      const supervisor = ord.general_specs?.includes('مروان')
        ? 'م/ مروان هلال'
        : ord.general_specs?.includes('بشير')
        ? 'م/ بشير النجار'
        : 'م/ محمد عبد الله';

      if (supervisorFilter !== 'all' && supervisor !== supervisorFilter) {
        return false;
      }

      return true;
    });

    // Classify into groups
    const overdue: Array<JobOrderPopulated & { diffDays: number; supervisor: string }> = [];
    const critical: Array<JobOrderPopulated & { diffDays: number; supervisor: string }> = [];
    const upcoming: Array<JobOrderPopulated & { diffDays: number; supervisor: string }> = [];

    list.forEach((ord) => {
      const deliveryDate = parseDate(ord.delivery_date)!;
      deliveryDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const supervisor = ord.general_specs?.includes('مروان')
        ? 'م/ مروان هلال'
        : ord.general_specs?.includes('بشير')
        ? 'م/ بشير النجار'
        : 'م/ محمد عبد الله';

      const enriched = { ...ord, diffDays, supervisor };

      if (diffDays < 0) {
        overdue.push(enriched);
      } else if (diffDays >= 0 && diffDays <= 3) {
        critical.push(enriched);
      } else {
        upcoming.push(enriched);
      }
    });

    // Sort overdue by most delayed (lowest diffDays)
    overdue.sort((a, b) => a.diffDays - b.diffDays);
    // Sort critical by nearest delivery
    critical.sort((a, b) => a.diffDays - b.diffDays);
    upcoming.sort((a, b) => a.diffDays - b.diffDays);

    return { overdue, critical, upcoming };
  }, [orders, today, searchTerm, supervisorFilter]);

  const totalAlertsCount =
    analyzedOrders.overdue.length + analyzedOrders.critical.length + analyzedOrders.upcoming.length;

  return (
    <div className="space-y-6">
      
      {/* HEADER & CONTROLS */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Critical SLA & Overdue Executive Tracker</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-serif">
                تقرير الأوامر الحرجة والمتأخرة (جهاز الإنذار المبكر)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                متابعة الأوامر المتجاوزة لموعد التسليم والأوامر الحرجة خلال 3 إلى 7 أيام، مصنفة حسب المهندس المشرف وسبب التأخير.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => printElementById('printable-overdue-report', 'portrait')}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-md cursor-pointer text-xs"
              title="طباعة ورقة ورشة العمل الصباحية للأولويات"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقة الأولويات والإنذارات (A4)</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">تصفية حسب المهندس المشرف:</label>
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">كافة المهندسين المشرفين</option>
              <option value="م/ محمد عبد الله">م/ محمد عبد الله</option>
              <option value="م/ بشير النجار">م/ بشير النجار</option>
              <option value="م/ مروان هلال">م/ مروان هلال</option>
            </select>
          </div>

          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">بحث سريع بالعميل أو الأوردر:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="اسم العميل، رقم الأوردر..."
                className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* KPI Alert Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl">
            <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs font-black">
              <span>🔴 أوامر متأخرة بالفعل</span>
              <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900 rounded-full font-mono font-bold text-rose-950 dark:text-rose-200">
                {analyzedOrders.overdue.length}
              </span>
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">تجاوزت الموعد التعاقدي للعميل</p>
          </div>

          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-black">
              <span>🟠 أوامر حرجة (خلال 3 أيام)</span>
              <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900 rounded-full font-mono font-bold text-amber-950 dark:text-amber-200">
                {analyzedOrders.critical.length}
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">تتطلب أولوية قصوى بالورشة اليوم</p>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-black">
              <span>🟡 تحت المتابعة (خلال أسبوع)</span>
              <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900 rounded-full font-mono font-bold text-emerald-950 dark:text-emerald-200">
                {analyzedOrders.upcoming.length}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">تسليمات الأسبوع الحالي</p>
          </div>
        </div>

      </div>

      {/* PRINTABLE OFFICIAL REPORT SHEET */}
      <div
        id="printable-overdue-report"
        className="bg-white p-6 sm:p-8 border-2 border-slate-900 shadow-2xl text-slate-900 font-serif max-w-[210mm] mx-auto space-y-6"
        style={{ direction: 'rtl', backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-600 text-white font-black text-2xl rounded-lg flex items-center justify-center border-2 border-rose-700 shrink-0 font-serif">
              A
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-rose-950 tracking-wide">
                النجار فيرنتشر للأثاث
              </h3>
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest font-bold">
                Critical SLA & Overdue Executive Audit Report
              </p>
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-lg sm:text-xl font-black text-slate-900">
              تقرير الأوامر الحرجة والمتأخرة
            </h4>
            <p className="text-xs font-bold text-slate-700 font-mono mt-0.5">
              تاريخ المراجعة: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>

        {/* Section 1: Overdue Orders 🔴 */}
        <div className="space-y-3">
          <div className="bg-rose-100 border-r-4 border-rose-600 text-rose-950 px-3.5 py-1.5 font-black text-sm flex items-center justify-between">
            <span>🔴 الأوامر المتجاوزة لموعد التسليم (Overdue Orders)</span>
            <span className="font-mono text-xs">({analyzedOrders.overdue.length} أوردر)</span>
          </div>

          {analyzedOrders.overdue.length === 0 ? (
            <div className="p-4 text-center text-slate-500 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50">
              لا توجد أوامر متأخرة حالياً - ممتاز! 🎉
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-900 text-xs">
              <thead>
                <tr className="bg-rose-200 text-rose-950 font-black">
                  <th className="border border-slate-900 p-2 text-right">العميل والأوردر</th>
                  <th className="border border-slate-900 p-2 text-right">الموديل والمواصفات</th>
                  <th className="border border-slate-900 p-2 text-center">تاريخ التسليم</th>
                  <th className="border border-slate-900 p-2 text-center">التأخير</th>
                  <th className="border border-slate-900 p-2 text-right">المهندس وسبب التأخير</th>
                </tr>
              </thead>
              <tbody>
                {analyzedOrders.overdue.map((ord) => (
                  <tr key={ord.id} className="hover:bg-rose-50/50">
                    <td className="border border-slate-900 p-2 font-bold">
                      <div className="text-slate-900 font-black">{ord.customer?.name || 'عميل'}</div>
                      <div className="font-mono text-[10px] text-slate-600">#{ord.order_number}</div>
                    </td>
                    <td className="border border-slate-900 p-2 font-semibold">
                      {ord.room_model_code}
                      <span className="block text-[10px] text-slate-500 truncate max-w-[150px]">
                        {ord.general_specs}
                      </span>
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono text-rose-700 font-bold">
                      {ord.delivery_date}
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono font-black text-rose-800 bg-rose-50">
                      متأخر {Math.abs(ord.diffDays)} يوم
                    </td>
                    <td className="border border-slate-900 p-2 space-y-1">
                      <div className="font-bold text-amber-900 text-[11px]">{ord.supervisor}</div>
                      <select
                        value={delayReasons[ord.id] || 'تأخير استلام الخامات والأقمشة من المورد'}
                        onChange={(e) => handleReasonChange(ord.id, e.target.value)}
                        className="w-full text-[10px] font-bold p-1 rounded border border-slate-300 bg-white cursor-pointer no-print"
                      >
                        {commonDelayReasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <div className="hidden print:block text-[10px] text-slate-700 font-bold">
                        {delayReasons[ord.id] || 'تأخير استلام الخامات والأقمشة من المورد'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Critical Orders 🟠 */}
        <div className="space-y-3 pt-2">
          <div className="bg-amber-100 border-r-4 border-amber-600 text-amber-950 px-3.5 py-1.5 font-black text-sm flex items-center justify-between">
            <span>🟠 الأوامر الحرجة (التسليم خلال 3 أيام القادمة)</span>
            <span className="font-mono text-xs">({analyzedOrders.critical.length} أوردر)</span>
          </div>

          {analyzedOrders.critical.length === 0 ? (
            <div className="p-4 text-center text-slate-500 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50">
              لا توجد أوامر حرجة خلال الـ 3 أيام القادمة.
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-900 text-xs">
              <thead>
                <tr className="bg-amber-200 text-amber-950 font-black">
                  <th className="border border-slate-900 p-2 text-right">العميل والأوردر</th>
                  <th className="border border-slate-900 p-2 text-right">الموديل والمواصفات</th>
                  <th className="border border-slate-900 p-2 text-center">موعد التسليم</th>
                  <th className="border border-slate-900 p-2 text-center">المتبقي</th>
                  <th className="border border-slate-900 p-2 text-right">المهندس المشرف</th>
                </tr>
              </thead>
              <tbody>
                {analyzedOrders.critical.map((ord) => (
                  <tr key={ord.id} className="hover:bg-amber-50/50">
                    <td className="border border-slate-900 p-2 font-bold">
                      <div className="text-slate-900 font-black">{ord.customer?.name || 'عميل'}</div>
                      <div className="font-mono text-[10px] text-slate-600">#{ord.order_number}</div>
                    </td>
                    <td className="border border-slate-900 p-2 font-semibold">
                      {ord.room_model_code}
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono font-bold">
                      {ord.delivery_date}
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono font-black text-amber-800 bg-amber-50">
                      {ord.diffDays === 0 ? 'مقرر التسليم اليوم!' : `متبقي ${ord.diffDays} يوم`}
                    </td>
                    <td className="border border-slate-900 p-2 font-bold text-slate-800">
                      {ord.supervisor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
            <p className="text-slate-800">تاريخ المراجعة:</p>
            <p className="font-mono text-slate-500">{new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </div>

      </div>

    </div>
  );
};
