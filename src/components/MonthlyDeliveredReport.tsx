import React, { useState, useMemo } from 'react';
import { JobOrderPopulated } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  Printer,
  Calendar,
  FileText,
  Search,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface MonthlyDeliveredReportProps {
  orders: JobOrderPopulated[];
}

export const MonthlyDeliveredReport: React.FC<MonthlyDeliveredReportProps> = ({ orders }) => {
  const currentDate = new Date();
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all' | 'تم التنفيذ' | 'تسليم'

  // Month names for Arabic UI
  const arabicMonths = [
    { id: 1, name: 'يناير' },
    { id: 2, name: 'فبراير' },
    { id: 3, name: 'مارس' },
    { id: 4, name: 'أبريل' },
    { id: 5, name: 'مايو' },
    { id: 6, name: 'يونيو' },
    { id: 7, name: 'يوليو' },
    { id: 8, name: 'أغسطس' },
    { id: 9, name: 'سبتمبر' },
    { id: 10, name: 'أكتوبر' },
    { id: 11, name: 'نوفمبر' },
    { id: 12, name: 'ديسمبر' },
  ];

  const reportData = useMemo(() => {
    const filtered = orders.filter((order) => {
      // Must be delivered statuses ('تم التنفيذ' or 'تسليم')
      if (!['تم التنفيذ', 'تسليم'].includes(order.status) || !order.delivery_date) return false;

      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Parse delivery date
      let d = new Date(order.delivery_date);
      if (isNaN(d.getTime())) {
        const parts = order.delivery_date.split('/');
        if (parts.length === 3) {
          d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }

      const matchesMonthYear = d.getMonth() + 1 === month && d.getFullYear() === year;
      if (!matchesMonthYear) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const custName = (order.customer?.name || '').toLowerCase();
        const orderNum = (order.order_number || '').toLowerCase();
        const roomCode = (order.room_model_code || '').toLowerCase();
        const specs = (order.general_specs || '').toLowerCase();
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

    // Grouping by customer to show total orders and value per customer
    const grouped = filtered.reduce((acc, order) => {
      const custName = order.customer?.name || 'عميل غير معروف';
      if (!acc[custName]) {
        acc[custName] = {
          customerPhone: order.customer?.phone || 'غير مسجل',
          customerAddress: order.customer?.address || 'غير مسجل',
          orders: [],
          totalValue: 0,
          totalDeposit: 0,
        };
      }
      acc[custName].orders.push(order);
      acc[custName].totalValue += order.total_price || 0;
      acc[custName].totalDeposit += order.deposit_paid || 0;
      return acc;
    }, {} as Record<string, { customerPhone: string; customerAddress: string; orders: JobOrderPopulated[]; totalValue: number; totalDeposit: number }>);

    return Object.entries(grouped).map(([customerName, data]) => ({
      customerName,
      ...data,
    }));
  }, [orders, month, year, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    let totalDeliveriesCount = 0;
    let totalRevenueAmount = 0;
    let totalDepositAmount = 0;
    const uniqueCustomersSet = new Set<string>();

    reportData.forEach((item) => {
      uniqueCustomersSet.add(item.customerName);
      item.orders.forEach((ord) => {
        totalDeliveriesCount += 1;
        totalRevenueAmount += ord.total_price || 0;
        totalDepositAmount += ord.deposit_paid || 0;
      });
    });

    return {
      deliveriesCount: totalDeliveriesCount,
      revenue: totalRevenueAmount,
      deposit: totalDepositAmount,
      remaining: totalRevenueAmount - totalDepositAmount,
      customersCount: uniqueCustomersSet.size,
    };
  }, [reportData]);

  return (
    <div className="space-y-6 sm:space-y-10">
      
      {/* TOP CONTROLS & PREMIUM HEADER */}
      <div className="no-print bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white p-5 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-amber-400 text-[10px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] mb-1">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Financial & Logistic Executive Audit</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black font-serif text-white leading-tight">
                تقرير التسليمات والإيرادات الشهرية
              </h2>
              <p className="text-[11px] sm:text-sm text-slate-400 mt-2 font-bold max-w-xl">
                تحليل شامل للأداء المالي واللوجستي، تتبع الأوامر المنتهية والمستلمة، وحساب صافي الإيرادات والتحصيلات بدقة عالية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
            <button
              type="button"
              onClick={() => printElementById('printable-report', 'portrait')}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl transition-all shadow-xl shadow-amber-900/20 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Printer className="w-5 h-5" />
              <span>طباعة التقرير (A4)</span>
            </button>
          </div>
        </div>

        {/* Filters Grid - Interactive Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-white/10 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">الفترة الزمنية (الشهر):</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-4 py-3 text-xs sm:text-sm font-black rounded-xl border border-slate-700 bg-slate-800/50 text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer appearance-none transition-all shadow-inner"
            >
              {arabicMonths.map((m) => (
                <option key={m.id} value={m.id}>{m.id}. {m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">السنة المالية:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-4 py-3 text-xs sm:text-sm font-black rounded-xl border border-slate-700 bg-slate-800/50 text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer appearance-none transition-all shadow-inner font-mono"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">فلترة حالة التسليم:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 text-xs sm:text-sm font-black rounded-xl border border-slate-700 bg-slate-800/50 text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer appearance-none transition-all shadow-inner"
            >
              <option value="all">كافة الحالات (المنفذ + المستلم)</option>
              <option value="تم التنفيذ">جاهز للتسليم (تم التنفيذ)</option>
              <option value="تسليم">تم التسليم النهائي</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">البحث في السجلات:</label>
            <div className="relative group">
              <Search className="w-4.5 h-4.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="اسم العميل أو رقم الأوردر..."
                className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-black rounded-xl border border-slate-700 bg-slate-800/50 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Quick KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 relative z-10">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl card-motion">
            <div className="flex items-center justify-between text-emerald-400 text-[10px] font-black uppercase mb-1">
              <span>الغرف المسلمة</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-100 tabular-nums">
              {stats.deliveriesCount} <span className="text-[10px] font-sans opacity-60">غرفة</span>
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl card-motion">
            <div className="flex items-center justify-between text-amber-400 text-[10px] font-black uppercase mb-1">
              <span>إجمالي الإيرادات</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-100 tabular-nums leading-none">
              {stats.revenue.toLocaleString()} <span className="text-[10px] font-sans opacity-60">ج.م</span>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl card-motion">
            <div className="flex items-center justify-between text-blue-400 text-[10px] font-black uppercase mb-1">
              <span>المحصل النقدي</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-100 tabular-nums leading-none">
              {stats.deposit.toLocaleString()} <span className="text-[10px] font-sans opacity-60">ج.م</span>
            </div>
          </div>

          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl card-motion">
            <div className="flex items-center justify-between text-purple-400 text-[10px] font-black uppercase mb-1">
              <span>قاعدة العملاء</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-100 tabular-nums leading-none">
              {stats.customersCount} <span className="text-[10px] font-sans opacity-60">عميل</span>
            </div>
          </div>
        </div>
      </div>

      {/* REPORT DATA LIST - Card View for Mobile, Table for Print/Desktop */}
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>تفاصيل السجلات المستخرجة:</span>
          </h3>
          <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            عدد البنود: {reportData.length} سجل
          </span>
        </div>

        {reportData.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <p className="text-sm font-bold text-slate-400">لا توجد بيانات مطابقة للفترة المحددة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportData.map((data) => (
              <div key={data.customerName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4 group hover:border-amber-500/50 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500/10 group-hover:bg-amber-500 transition-colors" />
                
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">{data.customerName}</h4>
                    <p className="text-[11px] font-mono font-bold text-slate-500 tabular-nums">{data.customerPhone}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                      {data.totalValue.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {data.orders.map((ord) => (
                    <div key={ord.id} className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="min-w-0">
                        <span className="font-mono font-black text-amber-700 dark:text-amber-400">#{ord.order_number.split('-').pop()}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300 truncate inline-block max-w-[120px]">{ord.room_model_code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${ord.status === 'تسليم' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {ord.status}
                        </span>
                        <span className="font-mono font-bold text-slate-500 tabular-nums">{ord.delivery_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRINTABLE OFFICIAL REPORT SHEET (A4) */}
      <div
        id="printable-report"
        className="bg-white p-6 sm:p-8 border-2 border-slate-900 shadow-2xl text-slate-900 font-serif max-w-[210mm] mx-auto space-y-6"
        style={{ direction: 'rtl', backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Header with Brand */}
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
                El-Naggar Furniture - Official Delivery Report
              </p>
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-lg sm:text-xl font-black text-slate-900">
              كشف تسليمات العملاء الشهري
            </h4>
            <p className="text-xs font-bold text-slate-700 font-mono mt-0.5">
              عن شهر : {arabicMonths.find((m) => m.id === month)?.name} لسنة {year}
            </p>
          </div>
        </div>

        {/* Report Content Table */}
        <div className="space-y-4">
          {reportData.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl font-bold text-sm">
              لا توجد تسليمات مسجلة أو مطابقة لشهر {arabicMonths.find((m) => m.id === month)?.name} {year}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-900 text-xs">
                <thead>
                  <tr className="bg-amber-300 text-black font-black">
                    <th className="border border-slate-900 p-2 text-center w-10">م</th>
                    <th className="border border-slate-900 p-2 text-right">اسم العميل ورقم الهاتف</th>
                    <th className="border border-slate-900 p-2 text-right">رقم الأوردر</th>
                    <th className="border border-slate-900 p-2 text-right">كود وطراز الغرفة</th>
                    <th className="border border-slate-900 p-2 text-center">تاريخ التسليم</th>
                    <th className="border border-slate-900 p-2 text-center">الحالة</th>
                    <th className="border border-slate-900 p-2 text-right">القيمة الإجمالية</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((data, idx) => (
                    <React.Fragment key={data.customerName}>
                      {data.orders.map((order, orderIdx) => (
                        <tr key={order.id} className="hover:bg-slate-50">
                          {orderIdx === 0 && (
                            <td
                              rowSpan={data.orders.length + 1}
                              className="border border-slate-900 p-2 text-center font-bold align-top bg-slate-100"
                            >
                              {idx + 1}
                            </td>
                          )}
                          {orderIdx === 0 && (
                            <td
                              rowSpan={data.orders.length + 1}
                              className="border border-slate-900 p-2 font-bold align-top bg-slate-100"
                            >
                              <div className="font-black text-slate-900">{data.customerName}</div>
                              <div className="text-[10px] font-mono text-slate-600 dir-ltr text-right mt-0.5">
                                {data.customerPhone}
                              </div>
                            </td>
                          )}
                          <td className="border border-slate-900 p-2 text-right font-mono font-bold">
                            #{order.order_number}
                          </td>
                          <td className="border border-slate-900 p-2 text-right font-semibold">
                            {order.room_model_code}
                            {order.general_specs && (
                              <span className="block text-[10px] text-slate-500 truncate max-w-[180px]">
                                {order.general_specs}
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-900 p-2 text-center font-mono tabular-nums">
                            {order.delivery_date}
                          </td>
                          <td className="border border-slate-900 p-2 text-center font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                order.status === 'تسليم'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="border border-slate-900 p-2 text-right font-mono font-bold tabular-nums">
                            {(order.total_price || 0).toLocaleString('ar-EG')} ج.م
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-amber-50 font-bold">
                        <td colSpan={4} className="border border-slate-900 p-1.5 text-left text-amber-950">
                          إجمالي حساب العميل ({data.customerName}):
                        </td>
                        <td colSpan={2} className="border border-slate-900 p-1.5 text-right font-mono text-amber-950 tabular-nums">
                          {data.totalValue.toLocaleString('ar-EG')} ج.م
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                  <tr>
                    <td colSpan={6} className="border border-slate-900 p-3 text-left">
                      إجمالي إيرادات وحصاد تسليمات الشهر ({arabicMonths.find((m) => m.id === month)?.name} {year}):
                    </td>
                    <td className="border border-slate-900 p-3 text-right text-base font-mono text-amber-300 tabular-nums">
                      {stats.revenue.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer Signatures */}
        <div className="pt-8 border-t-2 border-slate-900 mt-6 grid grid-cols-3 gap-4 text-xs font-bold">
          <div className="space-y-4">
            <p className="text-slate-800">إعداد / المسؤول المالي:</p>
            <p className="font-mono text-slate-500">............................................</p>
          </div>
          <div className="space-y-4 text-center">
            <p className="text-slate-800">اعتماد إدارة المصنع:</p>
            <p className="font-mono text-slate-500">............................................</p>
          </div>
          <div className="space-y-4 text-left pl-2">
            <p className="text-slate-800">ختم الشركة / المعرض:</p>
            <p className="font-mono text-slate-500">............................................</p>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500 pt-4 border-t border-slate-200">
          تم استخراج هذا التقرير آلياً من نظام إدارة مصانع النجار فيرنتشر في {new Date().toLocaleDateString('ar-EG')}
        </div>

      </div>

    </div>
  );
};
