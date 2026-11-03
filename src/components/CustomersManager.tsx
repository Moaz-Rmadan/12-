import React, { useState } from 'react';
import { Customer, JobOrderPopulated } from '../types';
import { User, Phone, MapPin, Search, Plus, ClipboardList, ExternalLink } from 'lucide-react';

interface CustomersManagerProps {
  customers: Customer[];
  orders: JobOrderPopulated[];
  onOpenNewOrderForCustomer?: (customer: Customer) => void;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({
  customers,
  orders,
  onOpenNewOrderForCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      c.phone.includes(searchTerm.trim()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
          <User className="w-5 h-5 text-amber-700" />
          <span>سجل العملاء ودليل الاتصال ({customers.length})</span>
        </h2>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث باسم العميل أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((cust) => {
          const custOrders = orders.filter((o) => o.customer_id === cust.id || o.customer?.phone === cust.phone);

          return (
            <div
              key={cust.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
                      {cust.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {cust.name}
                      </h3>
                      <span className="text-[11px] text-slate-400">عميل مسجل</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {custOrders.length} أجهزة شغل
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <a
                      href={`tel:${cust.phone}`}
                      className="font-mono hover:text-amber-700 underline underline-offset-2"
                    >
                      {cust.phone}
                    </a>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span className="leading-tight">{cust.address || 'العنوان غير مدخل'}</span>
                  </div>
                </div>

                {/* Assigned Orders List */}
                {custOrders.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      أوامر الشغل الخاصة بالعميل:
                    </span>
                    <div className="space-y-1">
                      {custOrders.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-800/50"
                        >
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-300">
                            {o.order_number}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {o.general_specs}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200">
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <a
                  href={`https://wa.me/2${cust.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>تواصل واتساب</span>
                </a>

                {onOpenNewOrderForCustomer && (
                  <button
                    onClick={() => onOpenNewOrderForCustomer(cust)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>أمر جديد</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
