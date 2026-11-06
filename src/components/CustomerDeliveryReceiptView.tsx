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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
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

  // Total text characters count in selected products
  const totalReceiptTextChars = useMemo(() => {
    return activeReceiptOrders.reduce((acc, ord) => {
      return (
        acc +
        (ord.general_specs?.length || 0) +
        (ord.room_model_code?.length || 0) +
        (ord.job_details?.paint_details?.length || 0) +
        (ord.job_details?.fabric_source?.length || 0) +
        (ord.job_details?.dimensions_cm?.length || 0)
      );
    }, 0);
  }, [activeReceiptOrders]);

  // Density override state: 'auto' | 'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'
  const [densityOverride, setDensityOverride] = useState<
    'auto' | 'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'
  >('auto');

  // Manual Font Scaling (80% to 135%, default: 100%)
  const [manualFontScale, setManualFontScale] = useState<number>(100);

  // Full-Page Stretch Toggle (fills A4 page height gracefully and balances vertical spacing)
  const [fillPageHeight, setFillPageHeight] = useState<boolean>(true);

  // Automatic density detection for receipt single-page guarantee:
  // - 1-2 short items -> 'spacious' (Enlarges fonts, spacing and fills the A4 page)
  // - 3-4 items -> 'comfortable'
  // - 5-6 items -> 'balanced'
  // - 7-9 items -> 'compact'
  // - 10+ items or very long text -> 'micro'
  const autoDetectedDensity = useMemo<'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'>(() => {
    const count = activeReceiptOrders.length;
    if (count <= 2 && totalReceiptTextChars < 280) return 'spacious';
    if (count <= 4 && totalReceiptTextChars < 550) return 'comfortable';
    if (count <= 6 && totalReceiptTextChars < 900) return 'balanced';
    if (count <= 8 && totalReceiptTextChars < 1300) return 'compact';
    return 'micro';
  }, [activeReceiptOrders.length, totalReceiptTextChars]);

  const activeDensity = densityOverride === 'auto' ? autoDetectedDensity : densityOverride;

  // Screen and print layout density mapping
  const receiptDensity = useMemo(() => {
    switch (activeDensity) {
      case 'spacious':
        return {
          containerPadding: 'p-6 sm:p-8',
          fontSize: 'text-sm sm:text-base',
          brandTitleText: 'text-2xl sm:text-3xl font-black',
          badgeText: 'text-sm sm:text-base px-4 py-1.5',
          spacingY: 'space-y-4 sm:space-y-5',
          itemPadding: 'pb-3 space-y-1',
          productTitleText: 'text-sm sm:text-base font-black',
          specsText: 'text-xs sm:text-sm',
          notesHeight: 'space-y-3',
          notesLine: 'pb-2',
          footerMargin: 'pt-4 mt-4',
        };
      case 'comfortable':
        return {
          containerPadding: 'p-5 sm:p-6',
          fontSize: 'text-xs sm:text-sm',
          brandTitleText: 'text-xl sm:text-2xl font-black',
          badgeText: 'text-xs sm:text-sm px-3.5 py-1',
          spacingY: 'space-y-3 sm:space-y-4',
          itemPadding: 'pb-2.5 space-y-0.5',
          productTitleText: 'text-xs sm:text-sm font-black',
          specsText: 'text-[11px] sm:text-xs',
          notesHeight: 'space-y-2',
          notesLine: 'pb-1',
          footerMargin: 'pt-3 mt-3',
        };
      case 'balanced':
        return {
          containerPadding: 'p-4 sm:p-5',
          fontSize: 'text-[11px] sm:text-xs',
          brandTitleText: 'text-lg sm:text-xl font-black',
          badgeText: 'text-xs px-3 py-1',
          spacingY: 'space-y-2.5 sm:space-y-3',
          itemPadding: 'pb-2 space-y-0.5',
          productTitleText: 'text-xs font-black',
          specsText: 'text-[10.5px] sm:text-[11px]',
          notesHeight: 'space-y-1.5',
          notesLine: 'pb-0.5',
          footerMargin: 'pt-2.5 mt-2.5',
        };
      case 'compact':
        return {
          containerPadding: 'p-3 sm:p-4',
          fontSize: 'text-[10px] sm:text-[10.5px]',
          brandTitleText: 'text-base sm:text-lg font-black',
          badgeText: 'text-[11px] px-2.5 py-0.5',
          spacingY: 'space-y-2',
          itemPadding: 'pb-1.5 space-y-0.5',
          productTitleText: 'text-[10.5px] sm:text-[11px] font-black',
          specsText: 'text-[9.5px] sm:text-[10px]',
          notesHeight: 'space-y-1',
          notesLine: 'pb-0.5',
          footerMargin: 'pt-2 mt-2',
        };
      case 'micro':
      default:
        return {
          containerPadding: 'p-2 sm:p-3',
          fontSize: 'text-[9px] sm:text-[9.5px]',
          brandTitleText: 'text-sm sm:text-base font-black',
          badgeText: 'text-[10px] px-2 py-0.5',
          spacingY: 'space-y-1.5',
          itemPadding: 'pb-1 space-y-0',
          productTitleText: 'text-[9.5px] sm:text-[10px] font-black',
          specsText: 'text-[8.5px] sm:text-[9px]',
          notesHeight: 'space-y-0.5',
          notesLine: 'pb-0.5',
          footerMargin: 'pt-1.5 mt-1.5',
        };
    }
  }, [activeDensity]);

  // Print Handler
  const handlePrintReceipt = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    printElementById('printable-delivery-receipt', orientation);
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
            type="button"
            onClick={() => handlePrintReceipt('portrait')}
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

      {/* PRINTABLE OFFICIAL SHEET - GUARANTEED SINGLE A4 PAGE FIT WITH ADAPTIVE SCALING */}
      <div className="space-y-3">
        {/* Helper info bar & adaptive density switcher above preview */}
        <div className="no-print bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-xs" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-950 dark:text-emerald-200 text-sm">
                    الملاءمة التلقائية لصفحة الطباعة (ملء صفحة A4 بذكاء):
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                    {activeDensity === 'spacious' && '🔍 ملء مكبر (منتجات قليلة - خط كبير وواضح يملأ الصفحة)'}
                    {activeDensity === 'comfortable' && '📄 مريح متوازن (خط متوسط متناسق)'}
                    {activeDensity === 'balanced' && '⚖️ قياسي معتمد'}
                    {activeDensity === 'compact' && '📐 مضغوط ذكي (منتجات كثيرة في صفحة واحدة)'}
                    {activeDensity === 'micro' && '⚡ كثافة قصوى (أوردرات ومنتجات متعددة)'}
                  </span>
                </div>
                <p className="font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  {activeDensity === 'spacious'
                    ? 'نظراً لقلة المنتجات في هذا الإقرار، تم تكبير الخطوط والمسافات آلياً لتشغل ورقة A4 كاملة دون فراغات بيضاء بالأسفل.'
                    : activeDensity === 'compact' || activeDensity === 'micro'
                    ? 'نظراً لكثرة بنود المنتجات ومواصفاتها، تم تصغير الخطوط والهوامش بنسب دقيقة لتتسع بالكامل في صفحة واحدة دون ترحيل.'
                    : 'حجم الخطوط والهوامش متوازن ومضبوط تماماً لملء ورقة A4 واحدة.'}{' '}
                  <span className="text-emerald-800 dark:text-emerald-400 font-mono font-bold">
                    ({activeReceiptOrders.length} منتجات محددة | {totalReceiptTextChars} حرف)
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintReceipt('portrait')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
                title="طباعة إقرار الاستلام المتأقلم في صفحة A4 واحدة"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإقرار (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintReceipt('landscape')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="طباعة بنمط أفقي عريض"
              >
                <span>أفقي</span>
              </button>
            </div>
          </div>

          {/* Density Mode Selector Pills & Manual Font Sizing Bar */}
          <div className="space-y-2.5 pt-2 border-t border-emerald-200/60 dark:border-slate-700/60 text-xs">
            {/* Row 1: Density Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 shrink-0">
                أنماط الكثافة الجاهزة:
              </span>

              <button
                type="button"
                onClick={() => setDensityOverride('auto')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  densityOverride === 'auto'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                🤖 تأقلم تلقائي ذكي {densityOverride === 'auto' && `(${activeDensity})`}
              </button>

              <button
                type="button"
                onClick={() => setDensityOverride('spacious')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  densityOverride === 'spacious'
                    ? 'bg-emerald-700 text-white font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                🔍 تكبير وملء الصفحة (منتج 1 أو 2)
              </button>

              <button
                type="button"
                onClick={() => setDensityOverride('comfortable')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  densityOverride === 'comfortable'
                    ? 'bg-emerald-700 text-white font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                📄 خط مريح متسع
              </button>

              <button
                type="button"
                onClick={() => setDensityOverride('balanced')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  densityOverride === 'balanced'
                    ? 'bg-emerald-700 text-white font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                ⚖️ عادي قياسي
              </button>

              <button
                type="button"
                onClick={() => setDensityOverride('compact')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  densityOverride === 'compact'
                    ? 'bg-emerald-700 text-white font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                📐 مضغوط (منتجات متعددة)
              </button>

              <button
                type="button"
                onClick={() => setDensityOverride('micro')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  densityOverride === 'micro'
                    ? 'bg-emerald-700 text-white font-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                ⚡ أقصى كثافة
              </button>
            </div>

            {/* Row 2: Manual Font Zoom Stepper & Slider + Page Stretch Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-200/50 dark:border-slate-700/50">
              {/* Stepper & Slider */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  التحكم اليدوي الدقيق بحجم الخط:
                </span>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setManualFontScale((s) => Math.max(80, s - 5))}
                    disabled={manualFontScale <= 80}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                    title="تصغير حجم الخط (-5%)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <span className="font-mono font-black text-xs px-2 text-emerald-800 dark:text-emerald-300 min-w-[50px] text-center">
                    {manualFontScale}%
                  </span>

                  <button
                    type="button"
                    onClick={() => setManualFontScale((s) => Math.min(135, s + 5))}
                    disabled={manualFontScale >= 135}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                    title="تكبير حجم الخط (+5%)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {manualFontScale !== 100 && (
                    <button
                      type="button"
                      onClick={() => setManualFontScale(100)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 cursor-pointer transition-colors"
                      title="إعادة ضبط حجم الخط إلى 100%"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>100%</span>
                    </button>
                  )}
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="80"
                  max="135"
                  step="5"
                  value={manualFontScale}
                  onChange={(e) => setManualFontScale(Number(e.target.value))}
                  className="w-24 sm:w-32 accent-emerald-600 cursor-pointer"
                  title={`حجم الخط الحالي: ${manualFontScale}%`}
                />
              </div>

              {/* Page Fit Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFillPageHeight((f) => !f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    fillPageHeight
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                  }`}
                  title="تمديد الإقرار لملء صفحة A4 بالكامل رأسياً دون فراغات بيضاء بالأسفل"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{fillPageHeight ? '✓ ملء صفحة A4 بالكامل مفعل' : 'تعبئة حسب المحتوى فقط'}</span>
                </button>

                <div className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800/60">
                  <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                  <span>المنتجات باللون الأحمر المعتمد</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center p-2 sm:p-4 bg-slate-100 dark:bg-slate-950 overflow-x-auto">
          <div
            id="printable-delivery-receipt"
            className={`bg-white text-black density-${activeDensity} ${receiptDensity.containerPadding} rounded-none border-2 sm:border-4 border-slate-900 shadow-2xl max-w-[210mm] w-full font-serif ${receiptDensity.fontSize} leading-snug relative flex flex-col justify-between print-card my-auto`}
            style={{
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              pageBreakInside: 'avoid',
              pageBreakAfter: 'avoid',
              breakInside: 'avoid',
              minHeight: fillPageHeight ? (activeDensity === 'spacious' ? '274mm' : '272mm') : 'auto',
              fontSize: manualFontScale !== 100 ? `${manualFontScale}%` : undefined,
            }}
          >
            {/* DOCUMENT CONTENT */}
            <div className={`receipt-content-wrapper flex-1 flex flex-col ${receiptDensity.spacingY}`}>
            
            {/* 1. BRAND HEADER WITH LOGO */}
            <div className="relative border-b-2 border-slate-950 pb-2.5">
              <div className="flex items-start justify-between gap-3">
                
                {/* Brand Title & Logo */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-700 text-amber-300 font-black text-xl sm:text-2xl rounded-lg flex items-center justify-center border-2 border-emerald-600 shadow-xs font-serif shrink-0">
                    A
                  </div>
                  <div>
                    <h1 className={`receipt-brand-title font-black text-emerald-800 tracking-wider font-serif ${receiptDensity.brandTitleText}`}>
                      النجار فيرنتشر
                    </h1>
                    <span className="text-[9px] sm:text-[10px] text-slate-600 block -mt-0.5 uppercase tracking-widest font-mono font-bold">
                      El-Naggar Furniture
                    </span>
                  </div>
                </div>

                {/* Main Receipt Title Badge */}
                <div className="text-left shrink-0">
                  <div className={`receipt-badge-title bg-emerald-800 text-white font-black rounded-md tracking-wider border border-emerald-700 shadow-2xs text-center ${receiptDensity.badgeText}`}>
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
                    (لم يتم تحديد منتجات للتقرير - يمكنك تفعيل الأوامر من الأعلى)
                  </div>
                ) : (
                  activeReceiptOrders.map((ord, idx) => (
                    <div
                      key={ord.id}
                      className={`border-b border-slate-300 ${receiptDensity.itemPadding} last:border-0 last:pb-0`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div
                          className={`receipt-product-title font-black text-red-600 print:text-red-600 ${receiptDensity.productTitleText}`}
                          style={{ color: '#dc2626' }}
                        >
                          <span>{idx + 1}. </span>
                          {ord.room_model_code && !ord.general_specs?.includes(ord.room_model_code) && (
                            <span className="font-black ml-1">[{ord.room_model_code}] </span>
                          )}
                          <span>{ord.general_specs || ord.room_model_code}</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-600 shrink-0">
                          #{ord.order_number}
                        </span>
                      </div>

                      <div className={`receipt-specs-grid grid grid-cols-3 gap-1 text-slate-800 pr-2 font-semibold ${receiptDensity.specsText}`}>
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
                <div className={`receipt-notes-lines ${receiptDensity.notesHeight} text-slate-400 font-mono text-[10px] overflow-hidden`}>
                  <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>&nbsp;</p>
                  <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>&nbsp;</p>
                  {(activeDensity === 'spacious' || activeReceiptOrders.length <= 2) && (
                    <>
                      <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>&nbsp;</p>
                      <p className={`border-b border-dotted border-slate-400 ${receiptDensity.notesLine} w-full`}>&nbsp;</p>
                    </>
                  )}
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
          <div className={`border-t border-slate-300 ${receiptDensity.footerMargin} space-y-2 font-serif shrink-0`}>
            
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

    </div>
  );
};
