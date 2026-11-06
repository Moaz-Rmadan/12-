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
    <div className="space-y-6 sm:space-y-10">
      
      {/* TOP HEADER & PREMIUM CONTROL BAR */}
      <div className="no-print bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 sm:p-8 rounded-3xl border border-emerald-800/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] mb-2">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Official Delivery Protocol • Smart Receipt Studio</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black font-serif text-white leading-tight">
            إقرار وتقـريـر اسـتـلام الـمـنـتـج
          </h2>
          <p className="text-[11px] sm:text-sm text-emerald-100/60 mt-2 max-w-2xl leading-relaxed font-bold">
            قم بتوليد إقرار استلام رسمي مطابق للمواصفات الفنية، مع نظام ذكي لملاءمة المحتوى داخل ورقة A4 واحدة مهما كان عدد المنتجات.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-emerald-800/30 shrink-0">
          {onCloseModal && (
            <button
              onClick={onCloseModal}
              className="p-3 rounded-2xl bg-white/5 hover:bg-rose-600/20 text-emerald-200 hover:text-white transition-all cursor-pointer group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePrintReceipt('portrait')}
            disabled={!selectedCustomer}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-xl shadow-amber-900/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap border-b-4 border-amber-600"
          >
            <Printer className="w-5 h-5" />
            <span>طباعة الإقرار المعتمد (A4)</span>
          </button>
        </div>
      </div>

      {/* CUSTOMER & ORDERS SELECTION CONTROLS */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        
        {/* Row 1: Select Customer & Date */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          
          {/* Customer Dropdown */}
          <div className="md:col-span-8 space-y-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>اختيار العميل المستلم:</span>
            </label>
            <div className="relative group">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-4 py-3.5 text-xs sm:text-sm font-black rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none cursor-pointer appearance-none transition-all shadow-inner"
              >
                {customers.map((c) => {
                  const count = orders.filter((o) => o.customer_id === c.id || o.customer?.phone === c.phone).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.phone} • [{count} أوردر]
                    </option>
                  );
                })}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="md:col-span-4 space-y-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>تاريخ الاستلام:</span>
            </label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full px-4 py-3.5 text-xs sm:text-sm font-black font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner"
            />
          </div>

        </div>

        {/* Row 2: Customer Orders Checkbox Selection Pipeline */}
        {selectedCustomer && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center border border-emerald-100 dark:border-emerald-800 shadow-inner shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    أوامر شغل العميل المسجلة
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500">
                    حدد المنتجات التي يتم تسليمها في هذا الإقرار ({activeReceiptOrders.length} من {customerOrders.length})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-4 py-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  تحديد الكل
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={handleUnselectAll}
                  className="px-4 py-1.5 text-[10px] font-black text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  استبعاد الكل
                </button>
              </div>
            </div>

            {customerOrders.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-amber-50/50 dark:bg-slate-800/20 border-2 border-dashed border-amber-200 dark:border-slate-700">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-400">لا توجد أوامر شغل مسجلة لهذا العميل حالياً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  return (
                    <button
                      key={ord.id}
                      onClick={() => toggleOrderSelection(ord.id)}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-4 group relative overflow-hidden ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-lg ring-4 ring-emerald-500/5'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:border-emerald-300'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 transition-transform duration-300 ${isChecked ? 'scale-110' : 'scale-100'}`}>
                        {isChecked ? (
                          <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                            <FileCheck className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`font-mono font-black text-[10px] tracking-tighter ${isChecked ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-500'}`}>
                            {ord.order_number}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            ord.status === 'تم التنفيذ' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <h5 className={`font-black text-xs truncate transition-colors ${isChecked ? 'text-emerald-950 dark:text-emerald-100' : 'text-slate-600'}`}>
                          {ord.room_model_code}
                        </h5>
                        <p className="text-[10px] font-bold text-slate-400 line-clamp-1 mt-1">
                          {ord.general_specs}
                        </p>
                      </div>

                      {/* Active Indicator Bar */}
                      {isChecked && (
                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* PRINTABLE OFFICIAL SHEET - SMART ADAPTIVE PREVIEW */}
      <div className="space-y-4">
        {/* Adaptive Density Controller - Interactive Design */}
        <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Maximize2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    محرك الملاءمة التلقائية لصفحة الطباعة
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase tracking-tighter">Smart Fit Engine</span>
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  يعمل النظام تلقائياً على حساب حجم الخطوط والهوامش لضمان بقاء الإقرار في صفحة A4 واحدة مع ملء الفراغات لضمان مظهر احترافي.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setFillPageHeight((f) => !f)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                  fillPageHeight
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${fillPageHeight ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                <span>{fillPageHeight ? 'تفعيل ملء الصفحة بالكامل' : 'تعبئة طبيعية'}</span>
              </button>
            </div>
          </div>

          {/* Density Presets & Manual Sizer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            {/* Density Presets */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 block">أنماط الكثافة (Pre-sets):</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'auto', label: 'تأقلم تلقائي', icon: '🤖' },
                  { id: 'spacious', label: 'مكبر', icon: '🔍' },
                  { id: 'comfortable', label: 'مريح', icon: '📄' },
                  { id: 'balanced', label: 'قياسي', icon: '⚖️' },
                  { id: 'compact', label: 'مضغوط', icon: '📐' },
                  { id: 'micro', label: 'كثيف', icon: '⚡' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDensityOverride(d.id as any)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer border flex items-center gap-2 ${
                      densityOverride === d.id
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-inner'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-transparent hover:border-emerald-200'
                    }`}
                  >
                    <span>{d.icon}</span>
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Sizing */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 block">حجم الخط اليدوي (Manual Scaling):</label>
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setManualFontScale((s) => Math.max(80, s - 5))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-600 shadow-sm hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">{manualFontScale}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualFontScale((s) => Math.min(135, s + 5))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-600 shadow-sm hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>
                
                {manualFontScale !== 100 && (
                  <button
                    type="button"
                    onClick={() => setManualFontScale(100)}
                    className="p-3 rounded-xl bg-amber-500 text-slate-950 font-black text-[10px] shadow-lg shadow-amber-500/20 active:scale-90 transition-all cursor-pointer uppercase tracking-tighter"
                  >
                    Reset 100%
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LIVE CANVAS PREVIEW */}
        <div className="flex justify-center p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 group relative">
          {/* Scroll Hint for Mobile */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-slate-900/80 text-white p-2 rounded-full lg:hidden opacity-50 pointer-events-none group-hover:opacity-0 transition-opacity">
            <RotateCcw className="w-5 h-5 animate-spin" />
          </div>

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
