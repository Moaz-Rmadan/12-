import React, { useState, useMemo, useRef, useEffect } from 'react';
import { JobOrderPopulated } from '../types';
import { Bell, Clock, AlertTriangle, Calendar, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface NotificationsDropdownProps {
  orders: JobOrderPopulated[];
  onSelectOrder: (order: JobOrderPopulated) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  orders,
  onSelectOrder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute urgent orders (delivery date within 48 hours or overdue, and status != 'تسليم')
  const urgentOrders = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return orders
      .filter((ord) => {
        if (ord.status === 'تسليم') return false; // Already delivered
        if (!ord.delivery_date) return false;

        const parts = ord.delivery_date.split('-');
        if (parts.length !== 3) return false;

        const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - now.getTime();
        const diffHours = diffTime / (1000 * 60 * 60);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Overdue or within next 48 hours (diffHours <= 48, which covers diffDays <= 2 and past due)
        return diffHours <= 48;
      })
      .sort((a, b) => (a.delivery_date || '').localeCompare(b.delivery_date || ''));
  }, [orders]);

  const count = urgentOrders.length;

  const getUrgencyBadge = (deliveryDateStr: string) => {
    const parts = deliveryDateStr.split('-');
    if (parts.length !== 3) return null;
    const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>متأخر عن موعد التسليم ({Math.abs(diffDays)} يوم)</span>
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 animate-pulse">
          <Clock className="w-3 h-3" />
          <span>موعـد الاستلام اليـوم!</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>متبقي {diffDays} أيام (خلال 48 ساعة)</span>
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="تنبيهات مواعيد التسليم (خلال 48 ساعة)"
        aria-label="تنبيهات مواعيد التسليم"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden font-sans">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black">تنبيهات الإدارة (مواعيد التسليم)</h4>
                <p className="text-[10px] text-slate-400">أوامر الشغل المستحقة خلال 48 ساعة أو المتأخرة</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500 text-amber-950 rounded-full">
              {count} تنبيه
            </span>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {urgentOrders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  لا توجد مواعيد تسليم حرجة
                </h5>
                <p className="text-[11px] text-slate-500">
                  جميع أوامر الشغل الحالية مواعيد تسليمها مستقرة ولديها وقت كافٍ.
                </p>
              </div>
            ) : (
              urgentOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => {
                    onSelectOrder(ord);
                    setIsOpen(false);
                  }}
                  className="p-3.5 hover:bg-amber-50/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-amber-900 dark:text-amber-400">
                      {ord.order_number}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {ord.delivery_date}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-800 transition-colors">
                        {ord.customer?.name || 'عميل'} - {ord.room_model_code}
                      </h5>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {ord.general_specs}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {getUrgencyBadge(ord.delivery_date)}
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 group-hover:underline flex items-center gap-0.5">
                      <span>عرض الكارت</span>
                      <ChevronLeft className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              النظام يقوم بالتحديث تلقائياً وفقاً لمواعيد الورشة
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
