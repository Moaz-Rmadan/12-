import React, { useState } from 'react';
import { JobOrderPopulated, OrderStatus, ProductionStage } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  X,
  Printer,
  Edit3,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Archive,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canApproveDraft, canCancelOrder, isValidStatusTransition } from '../lib/permissions';
import { Check, ShieldCheck } from 'lucide-react';

interface WorkshopCardModalProps {
  order: JobOrderPopulated | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: OrderStatus) => void;
  onUpdateStage?: (id: string, newStage: ProductionStage) => void;
  onEditOrder?: (order: JobOrderPopulated) => void;
  onUpdateArchiveStatus?: (id: string, isArchived: boolean) => void;
}

export const WorkshopCardModal: React.FC<WorkshopCardModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
  onUpdateStage,
  onEditOrder,
  onUpdateArchiveStatus,
}) => {
  if (!order) return null;
  const { userProfile } = useAuth();

  const handlePrint = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    printElementById('printable-workshop-card', orientation);
  };

  // Extract Approver Name from data or fallback
  const getApproverName = (): string => {
    const fullText = `${order.general_specs} ${order.job_details?.installation_notes || ''}`;
    if (fullText.includes('بشير')) {
      return 'م النجار: بشير';
    }
    if (fullText.includes('مروان هلال') || fullText.includes('مروان')) {
      return 'مروان هلال';
    }
    if (fullText.includes('محمد عبد الله') || fullText.includes('محمد عبدالله')) {
      return 'محمد عبد الله';
    }
    if (fullText.includes('محمود زايد')) {
      return 'محمود زايد';
    }
    if (fullText.includes('الإدارة الفنية')) {
      return 'الإدارة الفنية';
    }
    return 'محمد عبد الله';
  };

  // Determine Title: "أمر شغل" vs "أمر تشغيل"
  const getCardTitle = (): string => {
    const fullText = `${order.general_specs} ${order.job_details?.installation_notes || ''}`;
    if (fullText.includes('أمر تشغيل') || fullText.includes('امر تشغيل')) {
      return 'أمر تشـغيـل';
    }
    return 'أمر شـغـل';
  };

  // Extract structured details lines from installation notes
  const getDetailsLines = (): string[] => {
    const rawNotes = order.job_details?.installation_notes || '';
    if (!rawNotes.trim()) {
      if (order.job_details?.dimensions_cm) {
        return [`المقاسات المعتمدة: ${order.job_details.dimensions_cm}`];
      }
      return [];
    }

    // Check if notes already has numbered points or bullet lines
    const splitLines = rawNotes
      .split(/\r?\n|(?=\d+[\-\)\.]\s*)|(?=ملحوظة\s*:)/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('يعتمد'));

    if (splitLines.length > 0) {
      return splitLines;
    }

    return [rawNotes];
  };

  const detailsList = getDetailsLines();
  const approver = getApproverName();
  const cardTitle = getCardTitle();

  // Format dates cleanly YYYY / MM / DD
  const formatDateSlash = (dStr: string) => {
    if (!dStr) return '';
    return dStr.replace(/-/g, ' / ');
  };

  const imageAttachments = order.attachments?.filter(
    (a) => a.file_url.endsWith('.jpeg') || a.file_url.endsWith('.jpg') || a.file_url.endsWith('.png')
  ) || [];

  const pdfAttachments = order.attachments?.filter((a) => a.file_url.endsWith('.pdf')) || [];

  // Default to 'original_image' mode if uploaded image attachments exist
  const [viewMode, setViewMode] = useState<'original_image' | 'digital_card'>(
    imageAttachments.length > 0 ? 'original_image' : 'digital_card'
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Fullscreen / Zoom Lightbox for mobile viewing of handwritten specs
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      
      <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-w-4xl w-full h-[96vh] sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 my-0 sm:my-4 print-card overflow-hidden">
        
        {/* TOP TOOLBAR - Mobile Optimized & Premium Sticky Header */}
        <div className="sticky top-0 z-40 bg-slate-900 text-slate-100 border-b border-slate-800 shadow-xl no-print shrink-0">
          <div className="p-3 sm:px-6 sm:py-4 space-y-3">
            
            {/* Row 1: Document Identity & Close */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-mono font-black text-xs shadow-lg shadow-amber-500/20 shrink-0">
                  {order.order_number.split('-').pop()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-lg font-black text-white truncate font-serif leading-none mb-1">
                    {cardTitle} • {order.room_model_code}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-tight">
                    <span className="truncate max-w-[120px] sm:max-w-none">العميل: {order.customer?.name || 'غير مسجل'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                    <span className="font-mono tabular-nums">{order.contract_date}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 shadow-inner group active:scale-90"
              >
                <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
              </button>
            </div>

            {/* Row 2: Status & Stage Selectors (Touch Ergonomic) */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              {order.status === 'Draft' ? (
                canApproveDraft(userProfile) ? (
                  <button
                    onClick={() => onUpdateStatus && onUpdateStatus(order.id, 'قيد التشغيل')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>اعتماد أمر الشغل وتحويله للتشغيل</span>
                  </button>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/40">
                    ⏳ مسودة (بانتظار اعتماد مدير النظام أو مدير التشغيل المفوض)
                  </div>
                )
              ) : (
                onUpdateStatus && (
                  <div className="relative group">
                    <select
                      value={order.status}
                      onChange={(e) => {
                        const targetStatus = e.target.value as OrderStatus;
                        const transition = isValidStatusTransition(order.status, targetStatus, userProfile);
                        if (!transition.allowed) {
                          alert(transition.error);
                          return;
                        }
                        onUpdateStatus(order.id, targetStatus);
                      }}
                      className="w-full sm:w-auto appearance-none text-[11px] font-black bg-slate-800 text-amber-400 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 cursor-pointer hover:border-amber-500 transition-all focus:ring-2 focus:ring-amber-500/40"
                    >
                      <option value="Draft">📝 مسودة</option>
                      <option value="قيد التشغيل">🔨 قيد التشغيل</option>
                      <option value="تم التنفيذ">✅ تم التنفيذ</option>
                      <option value="تسليم">🚚 تسليم</option>
                    </select>
                    <Activity className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )
              )}

              {onUpdateStage && (
                <div className="relative group">
                  <select
                    value={order.current_stage || 'لم يبدأ'}
                    onChange={(e) => onUpdateStage(order.id, e.target.value as ProductionStage)}
                    className="w-full sm:w-auto appearance-none text-[11px] font-black bg-purple-900/40 text-purple-200 border border-purple-500/50 rounded-xl pl-8 pr-3 py-2.5 cursor-pointer hover:border-purple-400 transition-all focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="لم يبدأ">لم يبدأ</option>
                    <option value="نجارة عفش">نجارة عفش</option>
                    <option value="نجارة انتريهات">نجارة انتريهات</option>
                    <option value="خدمة وتجهيز">خدمة وتجهيز</option>
                    <option value="كابينة أستر">كابينة أستر</option>
                    <option value="كابينة دوكو">كابينة دوكو</option>
                    <option value="تنجيد">تنجيد</option>
                    <option value="تشطيب وتغليف">تشطيب وتغليف</option>
                    <option value="جاهز للتسليم">جاهز للتسليم</option>
                  </select>
                  <Layers className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Row 3: Action Buttons (Horizontal Scroll on Mobile) */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
              {onEditOrder && (
                <button
                  onClick={() => {
                    onEditOrder(order);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>تعديل المواصفات</span>
                </button>
              )}

              <button
                onClick={() => handlePrint('portrait')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة طولي</span>
              </button>

              <button
                onClick={() => handlePrint('landscape')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black bg-blue-700 hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة بالعرض</span>
              </button>

              {onUpdateArchiveStatus && (
                <button
                  onClick={() => onUpdateArchiveStatus(order.id, !order.is_archived)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    order.is_archived
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{order.is_archived ? 'استعادة' : 'أرشفة'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SUB TOOLBAR: VIEW MODE SWITCHER (Screen Only) */}
        {imageAttachments.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/30 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 no-print shrink-0 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setViewMode('original_image')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  viewMode === 'original_image'
                    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>الورقة الأصلية</span>
              </button>

              <button
                onClick={() => setViewMode('digital_card')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  viewMode === 'digital_card'
                    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>الكارت الرقمي</span>
              </button>
            </div>

            {viewMode === 'original_image' && imageAttachments.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shrink-0">
                <span className="text-slate-500 text-[10px] font-black px-1">ورقة:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedImageIndex(null)}
                    className={`min-w-[28px] h-6 flex items-center justify-center rounded-md text-[10px] font-black transition-all cursor-pointer ${
                      selectedImageIndex === null ? 'bg-amber-500 text-white shadow-sm' : 'hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    الكل
                  </button>
                  {imageAttachments.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`min-w-[28px] h-6 flex items-center justify-center rounded-md text-[10px] font-black transition-all cursor-pointer ${
                        selectedImageIndex === idx ? 'bg-amber-500 text-white shadow-sm' : 'hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRINTABLE BODY - SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 md:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          
          <div
            id="printable-workshop-card"
            className="bg-white text-black p-3.5 sm:p-6 md:p-8 rounded-lg sm:rounded-sm border-2 sm:border-4 border-slate-950 shadow-xl max-w-[210mm] w-full font-serif text-sm sm:text-base leading-relaxed relative flex flex-col justify-between my-auto"
            style={{
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          >

            {/* OPTION A: 100% ORIGINAL UPLOADED IMAGE WORK ORDER SHEET (بالملي) */}
            {viewMode === 'original_image' && imageAttachments.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="no-print bg-amber-50 border border-amber-300 text-amber-950 p-2.5 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>صورة أمر الشغل المرفقة بالكامل دون أي زيادة أو نقص (100% بالملي)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-normal">
                      اضغط للتكبير على الموبايل
                    </span>
                    <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded-full font-mono font-bold">
                      #{order.order_number}
                    </span>
                  </div>
                </div>

                {imageAttachments.map((imgAtt, idx) => {
                  if (selectedImageIndex !== null && selectedImageIndex !== idx) return null;
                  return (
                    <div key={idx} className="w-full text-center space-y-2 relative group">
                      <div className="relative inline-block w-full overflow-hidden rounded border border-slate-300 bg-slate-50">
                        <img
                          src={imgAtt.file_url}
                          alt={imgAtt.title}
                          onClick={() => {
                            setFullscreenImage(imgAtt.file_url);
                            setZoomLevel(1);
                          }}
                          className="full-sheet-img w-full h-auto object-contain mx-auto rounded shadow-xs cursor-zoom-in transition-transform duration-200"
                          style={{ width: '100%', maxHeight: 'none', objectFit: 'contain' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFullscreenImage(imgAtt.file_url);
                            setZoomLevel(1);
                          }}
                          className="no-print absolute top-2 left-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs flex items-center gap-1 text-[11px] font-bold shadow-md cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>تكتيم وتكبير</span>
                        </button>
                      </div>

                      {imgAtt.title && (
                        <p className="no-print text-xs font-bold text-blue-950 pt-1">
                          {imgAtt.title}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* OPTION B: DIGITAL RECONSTRUCTED WORKSHOP CARD */
              <>
                {/* DOCUMENT BODY */}
                <div className="space-y-4 sm:space-y-5">

                  {/* 1. HEADER: GOLD EMBOSSED LOGO + 3D TITLE "أمر شغل" */}
                  <div className="flex items-center justify-between border-b-2 border-slate-950 pb-3 sm:pb-4 gap-2">
                    
                    {/* Gold 3D Logo 'A' */}
                    <div className="shrink-0">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-700 p-0.5 rounded-lg sm:rounded-xl shadow-md flex items-center justify-center">
                        <div className="w-full h-full bg-amber-950 rounded-[6px] sm:rounded-[10px] flex items-center justify-center text-amber-300 font-black text-xl sm:text-3xl font-serif">
                          A
                        </div>
                      </div>
                    </div>

                    {/* 3D Calligraphy Title */}
                    <div className="text-center flex-1 px-2">
                      <h1
                        className="text-2xl sm:text-5xl font-black text-amber-800 tracking-wide select-none font-serif"
                        style={{
                          color: '#8a4b08',
                          textShadow: '1px 1px 0px #ffe28a, 2px 2px 2px rgba(0,0,0,0.25)',
                        }}
                      >
                        {cardTitle}
                      </h1>
                    </div>

                    {/* Balance spacer */}
                    <div className="w-10 sm:w-14 shrink-0 text-left font-mono text-[10px] sm:text-[11px] font-bold text-slate-500">
                      #{order.order_number.replace('JO-2026-', '')}
                    </div>
                  </div>

                  {/* 2. TABLE HEADER: CUSTOMER, ROOM CODE, DATES */}
                  <div className="space-y-2.5 sm:space-y-3 font-bold text-sm sm:text-lg border-b-2 border-slate-950 pb-3 sm:pb-4">
                    
                    {/* Row 1: اسم العميل & كود الغرفة */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 sm:gap-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-blue-900 underline font-black shrink-0 text-xs sm:text-base" style={{ color: '#002266' }}>
                          أسم العميل :
                        </span>
                        <span className="font-black text-blue-950 text-sm sm:text-xl" style={{ color: '#001a4d' }}>
                          {order.customer?.name || 'غير محدد'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-blue-900 underline font-black shrink-0 text-xs sm:text-base" style={{ color: '#002266' }}>
                          كود الغرفه :
                        </span>
                        <span className="font-black text-blue-950 text-sm sm:text-xl" style={{ color: '#001a4d' }}>
                          {order.room_model_code}
                        </span>
                      </div>
                    </div>

                    {/* Row 1.5: مرحلة الإنتاج والورشة الحالية */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-purple-950 dark:text-purple-300 font-black shrink-0 text-xs sm:text-sm">
                        مرحلة الورشة والإنتاج الحالية :
                      </span>
                      <span className="inline-flex items-center gap-1 font-black text-xs sm:text-sm bg-purple-100 text-purple-950 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        📍 {order.current_stage || 'لم يبدأ'}
                      </span>
                    </div>

                    {/* Row 2: تاريخ التعاقد & تاريخ الاستلام */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 sm:gap-6 pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-blue-900 underline font-black shrink-0 text-xs sm:text-base" style={{ color: '#002266' }}>
                          تاريخ التعاقد :
                        </span>
                        <span className="font-mono font-black text-blue-900 text-sm sm:text-xl" style={{ color: '#002266' }}>
                          {formatDateSlash(order.contract_date)}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-blue-900 underline font-black shrink-0 text-xs sm:text-base" style={{ color: '#002266' }}>
                          تاريخ الاستلام :
                        </span>
                        <span className="font-mono font-black text-blue-900 text-sm sm:text-xl" style={{ color: '#002266' }}>
                          {formatDateSlash(order.delivery_date)}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* 3. GENERAL SPECS (المواصفات) */}
                  <div className="border-2 border-slate-950 p-2.5 sm:p-4 rounded-xs bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                      <span className="text-blue-900 font-black text-sm sm:text-xl underline shrink-0" style={{ color: '#002266' }}>
                        المواصفات :
                      </span>
                      <span className="text-blue-900 font-extrabold text-sm sm:text-lg leading-relaxed" style={{ color: '#002266' }}>
                        {order.general_specs}
                      </span>
                    </div>
                  </div>

                  {/* 4. DETAILS / NOTES */}
                  {detailsList.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-blue-900 font-black text-sm sm:text-lg underline block" style={{ color: '#002266' }}>
                        التفاصيل :
                      </span>

                      <div className="space-y-1.5 pr-1 sm:pr-2">
                        {detailsList.map((dt, idx) => (
                          <p
                            key={idx}
                            className="font-bold text-xs sm:text-[17px] leading-relaxed"
                            style={{ color: '#cc0000' }}
                          >
                            {dt}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. ICONIC DASHED DIVIDER - ZERO OVERFLOW GUARANTEE */}
                  <div className="border-b-2 border-dashed border-slate-400 my-3.5 w-full" />

                  {/* 6. PAINT & UPHOLSTERY SECTION (الدهان والتنجيد) */}
                  <div className="space-y-2.5 font-bold text-xs sm:text-lg">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                      <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                        الدهان :
                      </span>
                      <span className="font-black text-xs sm:text-lg" style={{ color: '#cc0000' }}>
                        {order.job_details?.paint_details || 'كما هو بالمعرض'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                      <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                        التنجيد :
                      </span>
                      <span className="font-black text-xs sm:text-lg" style={{ color: '#cc0000' }}>
                        {order.job_details?.fabric_source || order.job_details?.color_code || 'كما هو بالمعرض'}
                      </span>
                    </div>
                  </div>

                  {/* 7. IMAGE ATTACHMENTS EMBEDDED DIRECTLY IN THE ORDER */}
                  {imageAttachments.length > 0 && (
                    <div className="pt-3 space-y-3 border-t-2 border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {imageAttachments.map((imgAtt, idx) => (
                          <div key={idx} className="border border-slate-300 rounded p-2 bg-slate-50 text-center">
                            <div className="font-bold text-xs text-blue-900 mb-1.5" style={{ color: '#002266' }}>
                              {imgAtt.title}
                            </div>
                            <img
                              src={imgAtt.file_url}
                              alt={imgAtt.title}
                              onClick={() => {
                                setFullscreenImage(imgAtt.file_url);
                                setZoomLevel(1);
                              }}
                              className="max-h-52 sm:max-h-72 w-full object-contain mx-auto rounded cursor-pointer"
                              style={{ maxHeight: '240px' }}
                            />
                            {imgAtt.description && (
                              <p className="text-[10px] sm:text-[11px] text-slate-600 mt-1.5 font-medium leading-tight">
                                {imgAtt.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 8. PDF BLUEPRINTS & DRAWINGS LINKS */}
                  {pdfAttachments.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 no-print">
                      <div className="flex flex-wrap gap-2">
                        {pdfAttachments.map((pdfAtt, idx) => (
                          <a
                            key={idx}
                            href={pdfAtt.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-700" />
                            <span>فتح المقايسة الهندسية المعتمدة ({pdfAtt.title})</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* 9. OFFICIAL FOOTER SIGN-OFF: "يعتمد / [المهندس المسؤول]" */}
                <div className="pt-6 sm:pt-8 mt-4 sm:mt-6 border-t border-slate-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-serif">
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-base sm:text-xl text-blue-950 underline" style={{ color: '#001a4d' }}>
                        يعتمــــد :
                      </span>
                      <span className="font-black text-base sm:text-xl text-blue-900" style={{ color: '#002266' }}>
                        / {approver}
                      </span>
                    </div>

                    {/* Factory Stamp & Sign line */}
                    <div className="text-right sm:text-left font-serif text-[11px] sm:text-xs text-slate-400 italic">
                      مصنع النجار فيرنتشر للأثاث والديكور
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>

        </div>

      </div>

      {/* FULLSCREEN TOUCH ZOOM LIGHTBOX FOR MOBILE */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-between p-3 sm:p-6 no-print">
          {/* Lightbox Controls Header */}
          <div className="w-full max-w-4xl flex items-center justify-between bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-white z-10">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>معاينة وتكبير أمر الشغل دقة عالية</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-xs font-mono"
                title="إعادة تعيين"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setFullscreenImage(null)}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer ml-2"
                title="إغلاق المعاينة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Viewer Area */}
          <div className="flex-1 w-full flex items-center justify-center overflow-auto p-2">
            <img
              src={fullscreenImage}
              alt="معاينة الشغل"
              className="max-w-none transition-transform duration-200 object-contain rounded-lg shadow-2xl"
              style={{
                transform: `scale(${zoomLevel})`,
                maxHeight: zoomLevel === 1 ? '82vh' : 'none',
                maxWidth: zoomLevel === 1 ? '95vw' : 'none',
              }}
            />
          </div>

          <div className="text-[11px] text-slate-400 font-bold bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800">
            يمكنك السحب والتحريك أو استخدام زري التكبير لمعاينة التفاصيل الدقيقة على الهاتف
          </div>
        </div>
      )}

    </div>
  );
};
