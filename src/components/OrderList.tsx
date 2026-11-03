import React, { useState } from 'react';
import { JobOrderPopulated, OrderStatus } from '../types';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  User,
  Phone,
  Ruler,
  Paintbrush,
  Scissors,
  CheckCircle2,
  Clock,
  PackageCheck,
  ChevronRight,
} from 'lucide-react';

interface OrderListProps {
  orders: JobOrderPopulated[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  onUpdateStatus: (id: string, newStatus: OrderStatus) => void;
  onDeleteOrder: (id: string) => void;
  activeFilter: string;
  setActiveFilter: (status: string) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onSelectOrder,
  onUpdateStatus,
  onDeleteOrder,
  activeFilter,
  setActiveFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<JobOrderPopulated | null>(null);

  const filteredOrders = orders.filter((ord) => {
    const matchesFilter = activeFilter === 'الكل' || ord.status === activeFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ord.order_number.toLowerCase().includes(q) ||
      ord.room_model_code.toLowerCase().includes(q) ||
      ord.customer?.name.toLowerCase().includes(q) ||
      ord.customer?.phone.includes(q) ||
      ord.general_specs.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'قيد التشغيل':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'تم التنفيذ':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'تسليم':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800';
    }
  };

  const uniqueFilteredOrders = Array.from(
    new Map(filteredOrders.map((o) => [o.id, o])).values()
  );

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Status Filter segmented control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto scrollbar-none">
          {['الكل', 'قيد التشغيل', 'تم التنفيذ', 'تسليم'].map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative flex-1 max-w-xs min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث برقم الأمر، العميل، الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Orders Grid / Cards List */}
      {uniqueFilteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            لا توجد أوامر شغل تطابق البحث
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            جرب تغيير أسلوب تصفية الحالات أو كلمة البحث
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueFilteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Order Top Banner */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-amber-950 text-amber-200">
                      {ord.order_number}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400">
                      [{ord.room_model_code}]
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(ord.status)}`}>
                    {ord.status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* General Specs */}
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-amber-900 dark:group-hover:text-amber-300 transition-colors line-clamp-2">
                      {ord.general_specs}
                    </h3>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 p-2.5 rounded-lg bg-amber-50/40 dark:bg-slate-800/40 border border-amber-200/30 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {ord.customer?.name || 'عميل غير مسجل'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="font-mono">{ord.customer?.phone || 'لا يوجد رقم'}</span>
                    </div>
                  </div>

                  {/* Specs Snapshot */}
                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-1.5 truncate">
                      <Ruler className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span className="truncate">
                        المقاسات: <strong className="font-mono text-slate-800 dark:text-slate-200">{ord.job_details?.dimensions_cm || 'حسب الكارت'}</strong>
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5 truncate">
                      <Scissors className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span className="truncate">
                        الـ Batch: <strong className="font-mono text-amber-800 dark:text-amber-400">{ord.job_details?.batch_number || 'N/A'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Delivery Date & Financials */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>تاريخ التسليم: <strong className="font-mono text-slate-800 dark:text-slate-200">{ord.delivery_date}</strong></span>
                    </div>

                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {ord.total_price.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectOrder(ord)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>عرض كارت الورشة</span>
                </button>

                <div className="flex items-center gap-1">
                  <select
                    value={ord.status}
                    onChange={(e) => onUpdateStatus(ord.id, e.target.value as OrderStatus)}
                    className="text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 font-bold cursor-pointer"
                    title="تغيير حالة الأمر"
                  >
                    <option value="قيد التشغيل">تشغيل</option>
                    <option value="تم التنفيذ">تنفيذ</option>
                    <option value="تسليم">تسليم</option>
                  </select>

                  <button
                    onClick={() => setOrderToDelete(ord)}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="حذف الأمر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  تأكيد حذف أمر الشغل
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  رقم الأمر: <strong className="font-mono text-amber-700">{orderToDelete.order_number}</strong>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 border border-slate-200 dark:border-slate-700">
              <p><strong>العميل:</strong> {orderToDelete.customer?.name || 'غير مسجل'}</p>
              <p><strong>المواصفات:</strong> {orderToDelete.general_specs}</p>
              <p className="text-rose-600 dark:text-rose-400 font-bold text-[11px] pt-1">
                * هل أنت متأكد من الحذف النهائي؟ سينمسح الأمر من قاعدة البيانات.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onDeleteOrder(orderToDelete.id);
                  setOrderToDelete(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                تأكيد الحذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
