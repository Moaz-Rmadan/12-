import React, { useState, useMemo, useEffect } from 'react';
import { Customer, JobOrderPopulated } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  FileCheck,
  User,
  Calendar,
  CheckSquare,
  Square,
  Trash2,
  Printer,
  Sparkles,
  MapPin,
  Layers,
  X,
} from 'lucide-react';

interface CustomerDeliveryReceiptViewProps {
  customers: Customer[];
  orders: JobOrderPopulated[];
  initialCustomerId?: string;
  onCloseModal?: () => void;
}

export const CustomerDeliveryReceiptView: React.FC<CustomerDeliveryReceiptViewProps> = ({
  customers,
  orders,
  initialCustomerId,
  onCloseModal,
}) => {
  // Currently selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || (customers[0]?.id || '')
  );

  // Sync if initialCustomerId changes
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Orders linked to the selected customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (o) =>
        o.customer_id === selectedCustomer.id ||
        (o.customer?.phone && o.customer.phone === selectedCustomer.phone) ||
        (o.customer?.name && o.customer.name.trim() === selectedCustomer.name.trim())
    );
  }, [orders, selectedCustomer]);

  // Selected Order IDs included in the current receipt (checked/unchecked)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Whenever selected customer changes, auto-select all of their orders by default
  useEffect(() => {
    if (customerOrders.length > 0) {
      setSelectedOrderIds(customerOrders.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  }, [selectedCustomerId, customerOrders]);

  // Editable receipt date
  const [receiptDate, setReceiptDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Toggle order inclusion
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Select/Unselect All
  const handleSelectAll = () => {
    setSelectedOrderIds(customerOrders.map((o) => o.id));
  };

  const handleUnselectAll = () => {
    setSelectedOrderIds([]);
  };

  // Orders actually included in the printable document
  const activeReceiptOrders = useMemo(() => {
    return customerOrders.filter((o) => selectedOrderIds.includes(o.id));
  }, [customerOrders, selectedOrderIds]);

  // Print Handler
  const handlePrintReceipt = () => {
    printElementById('printable-delivery-receipt', 'portrait');
  };

  return (
    <div className="space-y-6">
      
      {/* TOP HEADER & CONTROL BAR */}
      <div className="no-print bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-amber-50 p-4 sm:p-6 rounded-2xl border border-amber-800/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Product Delivery Receipt Form Generator</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black font-serif text-white">
              إقرار وتقـريـر اسـتـلام الـمـنـتـج (المطابق المعتمد)
            </h2>
            <p className="text-xs text-amber-200/80 mt-0.5 max-w-xl">
              تظهر جميع أوامر الشغل الخاصة بالعميل تلقائياً. يمكنك اختيار أو استبعاد أي أمر بضغطة زر وطباعة التقرير فوراً في ورقة A4 واحدة ملائمة بنسبة 100%!
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-amber-800/60 shrink-0">
          {onCloseModal && (
            <button
              onClick={onCloseModal}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handlePrintReceipt}
            disabled={!selectedCustomer}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة إقرار الاستلام (A4)</span>
          </button>
        </div>
      </div>

      {/* CUSTOMER & ORDERS SELECTION CONTROLS */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        
        {/* Row 1: Select Customer & Date */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
          
          {/* Customer Dropdown */}
          <div className="md:col-span-7 relative">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>اختر العميل لعرض كافة أوامره:</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {customers.map((c) => {
                const count = orders.filter((o) => o.customer_id === c.id || o.customer?.phone === c.phone).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} - ({c.phone}) - [{count} أمر شغل]
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date Picker */}
          <div className="md:col-span-5">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>تاريخ استلام الإقرار:</span>
            </label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

        </div>

        {/* Row 2: Customer Orders Checkbox Selection Pipeline */}
        {selectedCustomer && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                  أوامر شغل العميل ({customerOrders.length} أمر مسجل):
                </h4>
                <span className="text-[11px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                  محدد للتقرير ({activeReceiptOrders.length})
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
                >
                  تحديد الكل
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleUnselectAll}
                  className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  استبعاد الكل
                </button>
              </div>
            </div>

            {customerOrders.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-slate-800/60 border border-amber-200 text-xs text-amber-900 dark:text-amber-200 font-bold">
                لا توجد أوامر شغل مسجلة مسبقاً لهذا العميل. يمكنك اختيار عميل آخر أو إضافة أوامر شغل جديدة.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {customerOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => toggleOrderSelection(ord.id)}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-500 shadow-xs ring-1 ring-amber-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-mono font-black text-amber-950 dark:text-amber-300 text-[11px]">
                            {ord.order_number}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {ord.status}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {ord.room_model_code}
                        </h5>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {ord.general_specs}
                        </p>
                      </div>

                      {isChecked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderSelection(ord.id);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 shrink-0"
                          title="إزالة من هذا الإقرار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* PRINTABLE OFFICIAL SHEET - GUARANTEED SINGLE A4 PAGE FIT */}
      <div className="flex justify-center p-2 sm:p-4 bg-slate-100 dark:bg-slate-950 overflow-x-auto">
        
        <div
          id="printable-delivery-receipt"
          className="bg-white text-black p-4 sm:p-6 rounded-none border-2 sm:border-4 border-slate-900 shadow-2xl max-w-[210mm] w-full font-serif text-xs sm:text-sm leading-snug relative flex flex-col justify-between print-card my-auto"
          style={{
            color: '#000000',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            pageBreakInside: 'avoid',
            pageBreakAfter: 'avoid',
            breakInside: 'avoid',
          }}
        >

          {/* DOCUMENT CONTENT */}
          <div className="space-y-3 sm:space-y-4">
            
            {/* 1. BRAND HEADER WITH LOGO */}
            <div className="relative border-b-2 border-slate-950 pb-2.5">
              <div className="flex items-start justify-between gap-3">
                
                {/* Brand Title & Logo */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-700 text-amber-300 font-black text-xl sm:text-2xl rounded-lg flex items-center justify-center border-2 border-emerald-600 shadow-xs font-serif shrink-0">
                    A
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-emerald-800 tracking-wider font-serif">
                      النجار فيرنتشر
                    </h1>
                    <span className="text-[9px] sm:text-[10px] text-slate-600 block -mt-0.5 uppercase tracking-widest font-mono font-bold">
                      El-Naggar Furniture
                    </span>
                  </div>
                </div>

                {/* Main Receipt Title Badge */}
                <div className="text-left shrink-0">
                  <div className="bg-emerald-800 text-white font-black px-3.5 py-1 rounded-md text-sm sm:text-base tracking-wider border border-emerald-700 shadow-2xs text-center">
                    تـقـريـر اسـتـلام الـمـنـتـج
                  </div>
                </div>

              </div>
            </div>

            {/* 2. CUSTOMER & RECEIPT DATE GRID */}
            <div className="border-b-2 border-slate-950 pb-2 font-bold text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-3">
                
                <div className="flex items-center gap-2">
                  <span className="text-emerald-950 font-black shrink-0">اسم العميل :</span>
                  <span className="font-extrabold text-blue-950 text-sm sm:text-base border-b border-dotted border-slate-400 px-2 min-w-[200px]">
                    {selectedCustomer?.name || 'أ/ مصطفى كمال الدين'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-emerald-950 font-black shrink-0">تاريخ الاستلام :</span>
                  <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-400 px-2 dir-ltr">
                    {receiptDate.replace(/-/g, ' / ')}
                  </span>
                </div>

              </div>
            </div>

            {/* 3. PRODUCTS BOX: "الـمـنـتـجـات عـبـارة عـن :" */}
            <div className="space-y-2 border-2 border-slate-950 p-2.5 sm:p-3 rounded-xs bg-white">
              
              <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-950 px-2.5 py-0.5 font-black text-xs sm:text-sm rounded-xs inline-block">
                الـمـنـتـجـات عـبـارة عـن :
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-0.5">
                {activeReceiptOrders.length === 0 ? (
                  <div className="text-slate-500 font-bold text-xs py-1 italic text-center">
                    (لم يتم تحديد أجهزة للتقرير - يمكنك تفعيل الأوامر من الأعلى)
                  </div>
                ) : (
                  activeReceiptOrders.map((ord, idx) => (
                    <div key={ord.id} className="border-b border-slate-300 pb-2 last:border-0 last:pb-0 space-y-0.5">
                      
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-black text-xs sm:text-sm text-blue-950">
                          {idx + 1}. {ord.general_specs || ord.room_model_code}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-600">
                          #{ord.order_number}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[11px] sm:text-xs text-slate-800 pr-2 font-semibold">
                        <div>
                          <strong>الدهان:</strong> {ord.job_details?.paint_details || 'مرفق بأمر التشغيل'}
                        </div>
                        <div>
                          <strong>التنجيد:</strong> {ord.job_details?.fabric_source || ord.job_details?.color_code || 'مرفق بأمر التشغيل'}
                        </div>
                        <div>
                          <strong>المواصفات:</strong> {ord.job_details?.dimensions_cm ? `مقاس ${ord.job_details.dimensions_cm}` : 'مرفق بأمر التشغيل'}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>

            {/* 4. EVALUATION FORM: "ما هو تقييمك للمنتج / لفريق العمل؟" */}
            <div className="space-y-2 pt-1 font-bold text-xs">
              
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                <span className="text-emerald-950 font-black shrink-0">ما هو تقييمك للمنتج ؟</span>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span>مقبول ( &nbsp; )</span>
                  <span>جيد ( &nbsp; )</span>
                  <span>جيد جداً ( &nbsp; )</span>
                  <span className="text-emerald-800">ممتاز ( &nbsp; )</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                <span className="text-emerald-950 font-black shrink-0">ما هو تقييمك لفريق العمل ؟</span>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span>مقبول ( &nbsp; )</span>
                  <span>جيد ( &nbsp; )</span>
                  <span>جيد جداً ( &nbsp; )</span>
                  <span className="text-emerald-800">ممتاز ( &nbsp; )</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <span className="text-slate-800 font-bold block mb-0.5 text-[11px]">ملاحظات أخرى:</span>
                <div className="space-y-1.5 text-slate-400 font-mono text-[10px] overflow-hidden">
                  <p className="border-b border-dotted border-slate-400 pb-0.5 w-full">&nbsp;</p>
                  <p className="border-b border-dotted border-slate-400 pb-0.5 w-full">&nbsp;</p>
                </div>
              </div>

            </div>

            {/* 5. LEGAL DISCLAIMER & BRANCHES LIST */}
            <div className="space-y-1.5 pt-1 text-[10px] sm:text-[11px] leading-snug font-serif">
              
              <p className="font-extrabold text-slate-900 text-justify">
                أقر أنا الموقع أدناه بأنني قد استلمت كافة المستحقات من شركة النجار فيرنتشر وفروعها كالأتي :
              </p>

              {/* Branches Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-300">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>84 جوزيف تيتو - النزهة الجديدة</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>29 مكرم عبيد - مدينة نصر</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>51 نبيل الوقاد - أرض الجولف</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>طريق بورسعيد - دمياط</span>
                </div>
              </div>

              <p className="font-semibold text-slate-900 text-justify pt-0.5">
                و أنني بالتوقيع على هذا الإقرار أخلي طرف الشركة من أي مستحقات أو خلافه يتعلق بالمنتجات المطلوبة من الشركة كاملة وخالية من عيوب الصناعة .
              </p>

              <p className="font-semibold text-slate-900 text-justify">
                وبعد المعاينة والقبول وهي في حالة جيدة وتم سداد القيمة المتفق عليها في العقد. توقيع العميل أو تابعه أو أي مستخدم ملحق بخدمته على هذا الإذن يقوم مقام إمضاء العميل نفسه.
              </p>

            </div>

          </div>

          {/* 6. SIGNATURES BLOCK */}
          <div className="pt-3 border-t border-slate-300 mt-2 space-y-2 font-serif shrink-0">
            
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <div className="space-y-1 flex-1">
                <p className="font-black text-slate-900">و هذا إقرار مني بذلك ,</p>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold pt-0.5">
                  <p>التوقيع / ....................</p>
                  <p>الرقم القومي / ....................</p>
                  <p>رقم الهاتف / ....................</p>
                </div>
              </div>

              <div className="text-left space-y-1 shrink-0 pl-2">
                <div className="font-mono font-bold text-xs text-slate-700">
                  تحريراً في : {receiptDate.replace(/-/g, ' / ')}
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  ختم الاستلام والتسليم
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
