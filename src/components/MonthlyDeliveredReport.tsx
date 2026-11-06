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
    <div className="space-y-6">
      
      {/* TOP CONTROLS & HEADER */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Monthly Delivery & Revenue Report</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-serif">
                تقرير تسليمات وإيرادات العملاء الشهري
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                متابعة دقيقة لكافة الأوامر المنتهية والمستلمة خلال الشهر مع ملخص الإيرادات والتحصيلات.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => printElementById('printable-report', 'portrait')}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black rounded-xl transition-all shadow-md cursor-pointer text-xs"
              title="طباعة التقرير الشهري الرسمي في ورقة A4"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير الشهري (A4)</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          
          {/* Month Selector */}
          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">الشهر:</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              {arabicMonths.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}. {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">السنة:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">حالة التسليم:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">كافة الحالات (تم التنفيذ + تسليم)</option>
              <option value="تم التنفيذ">تم التنفيذ (جاهز للتسليم)</option>
              <option value="تسليم">تم التسليم النهائي للعميل</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">بحث سريع:</label>
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

        {/* Quick KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
              <span>إجمالي الغرف المسلمة</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-lg font-black font-mono text-emerald-950 dark:text-emerald-200 mt-1">
              {stats.deliveriesCount} غرفة
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-[11px] font-bold">
              <span>إجمالي الإيرادات</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-lg font-black font-mono text-amber-950 dark:text-amber-200 mt-1">
              {stats.revenue.toLocaleString('ar-EG')} ج.م
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 text-[11px] font-bold">
              <span>المدفوع (المحصل)</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-lg font-black font-mono text-blue-950 dark:text-blue-200 mt-1">
              {stats.deposit.toLocaleString('ar-EG')} ج.م
            </div>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl">
            <div className="flex items-center justify-between text-purple-800 dark:text-purple-300 text-[11px] font-bold">
              <span>عدد العملاء المستفيدين</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-lg font-black font-mono text-purple-950 dark:text-purple-200 mt-1">
              {stats.customersCount} عميل
            </div>
          </div>
        </div>

      </div>

      {/* PRINTABLE OFFICIAL REPORT SHEET */}
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
                        <td className="border border-slate-900 p-2 text-center font-mono">
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
                        <td className="border border-slate-900 p-2 text-right font-mono font-bold">
                          {(order.total_price || 0).toLocaleString('ar-EG')} ج.م
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50 font-bold">
                      <td colSpan={4} className="border border-slate-900 p-1.5 text-left text-amber-950">
                        إجمالي حساب العميل ({data.customerName}):
                      </td>
                      <td colSpan={2} className="border border-slate-900 p-1.5 text-right font-mono text-amber-950">
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
                  <td className="border border-slate-900 p-3 text-right text-base font-mono text-amber-300">
                    {stats.revenue.toLocaleString('ar-EG')} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>
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
