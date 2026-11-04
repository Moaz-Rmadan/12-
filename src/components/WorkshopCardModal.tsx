import React from 'react';
import { JobOrderPopulated, OrderStatus } from '../types';
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
} from 'lucide-react';

interface WorkshopCardModalProps {
  order: JobOrderPopulated | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: OrderStatus) => void;
  onEditOrder?: (order: JobOrderPopulated) => void;
}

export const WorkshopCardModal: React.FC<WorkshopCardModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
  onEditOrder,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    printElementById('printable-workshop-card');
  };

  // Extract Approver Name from data or fallback
  const getApproverName = (): string => {
    const fullText = `${order.general_specs} ${order.job_details?.installation_notes || ''}`;
    if (fullText.includes('بشير')) {
      return 'م النجار: بشير';
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 my-4 print-card flex flex-col">
        
        {/* TOP TOOLBAR - Screen Only (Hidden on Print) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-slate-100 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shadow-md no-print">
          <div className="flex items-center gap-2.5">
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded font-mono font-bold tracking-wide">
              {order.order_number}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white flex items-center gap-1.5 font-serif">
                {cardTitle} - {order.room_model_code}
              </span>
              <span className="text-[11px] text-slate-400">
                العميل: {order.customer?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onUpdateStatus && (
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[11px] text-slate-400 hidden sm:inline">الحالة:</span>
                <select
                  value={order.status}
                  onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                  aria-label="تحديث حالة أمر الشغل"
                  className="text-xs bg-slate-800 text-amber-200 border border-slate-700 rounded-lg px-2.5 py-1.5 font-bold cursor-pointer hover:border-amber-500 transition-colors"
                >
                  <option value="قيد التشغيل">قيد التشغيل</option>
                  <option value="تم التنفيذ">تم التنفيذ</option>
                  <option value="تسليم">تسليم</option>
                </select>
              </div>
            )}

            {onEditOrder && (
              <button
                onClick={() => {
                  onEditOrder(order);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="تعديل مواصفات أمر الشغل"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>تعديل</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-extrabold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة أمر الشغل (A4)</span>
            </button>

            <button
              onClick={onClose}
              aria-label="إغلاق كارت أمر الشغل"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE BODY - EXACT 100% FACTORY JOB ORDER REPLICA */}
        <div className="p-3 sm:p-6 md:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          
          <div
            id="printable-workshop-card"
            className="bg-white text-black p-6 sm:p-10 rounded-sm border-2 sm:border-4 border-slate-950 shadow-xl max-w-[210mm] w-full font-serif text-base leading-relaxed relative flex flex-col justify-between"
            style={{
              minHeight: '290mm',
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          >

            {/* DOCUMENT BODY */}
            <div className="space-y-5">

              {/* 1. HEADER: GOLD EMBOSSED LOGO + 3D TITLE "أمر شغل" */}
              <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4">
                
                {/* Gold 3D Logo 'A' */}
                <div className="shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-700 p-0.5 rounded-xl shadow-md flex items-center justify-center">
                    <div className="w-full h-full bg-amber-950 rounded-[10px] flex items-center justify-center text-amber-300 font-black text-3xl font-serif">
                      A
                    </div>
                  </div>
                </div>

                {/* 3D Calligraphy Title */}
                <div className="text-center flex-1 px-4">
                  <h1
                    className="text-4xl sm:text-5xl font-black text-amber-800 tracking-wider select-none font-serif"
                    style={{
                      color: '#8a4b08',
                      textShadow: '1px 1px 0px #ffe28a, 2px 2px 2px rgba(0,0,0,0.25)',
                    }}
                  >
                    {cardTitle}
                  </h1>
                </div>

                {/* Balance spacer */}
                <div className="w-14 shrink-0 text-left font-mono text-[11px] font-bold text-slate-500">
                  #{order.order_number.replace('JO-2026-', '')}
                </div>
              </div>

              {/* 2. TABLE HEADER: CUSTOMER, ROOM CODE, DATES */}
              <div className="space-y-3 font-bold text-base sm:text-lg border-b-2 border-slate-950 pb-4">
                
                {/* Row 1: اسم العميل & كود الغرفة */}
                <div className="flex flex-wrap items-baseline justify-between gap-y-2 gap-x-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                      أسم العميل :
                    </span>
                    <span className="font-black text-blue-950 text-lg sm:text-xl" style={{ color: '#001a4d' }}>
                      {order.customer?.name || 'غير محدد'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                      كود الغرفه :
                    </span>
                    <span className="font-black text-blue-950 text-lg sm:text-xl" style={{ color: '#001a4d' }}>
                      {order.room_model_code}
                    </span>
                  </div>
                </div>

                {/* Row 2: تاريخ التعاقد & تاريخ الاستلام */}
                <div className="flex flex-wrap items-baseline justify-between gap-y-2 gap-x-6 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                      تاريخ التعاقد :
                    </span>
                    <span className="font-mono font-black text-blue-900 text-lg sm:text-xl" style={{ color: '#002266' }}>
                      {formatDateSlash(order.contract_date)}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                      تاريخ الاستلام :
                    </span>
                    <span className="font-mono font-black text-blue-900 text-lg sm:text-xl" style={{ color: '#002266' }}>
                      {formatDateSlash(order.delivery_date)}
                    </span>
                  </div>
                </div>

              </div>

              {/* 3. GENERAL SPECS (المواصفات) - Framed Box matching Roma & Venice orders */}
              <div className="border-2 border-slate-950 p-3 sm:p-4 rounded-xs bg-white">
                <div className="flex items-baseline gap-2">
                  <span className="text-blue-900 font-black text-lg sm:text-xl underline shrink-0" style={{ color: '#002266' }}>
                    المواصفات :
                  </span>
                  <span className="text-blue-900 font-extrabold text-base sm:text-lg leading-relaxed" style={{ color: '#002266' }}>
                    {order.general_specs}
                  </span>
                </div>
              </div>

              {/* 4. DETAILS / NOTES (التفاصيل والملاحظات باللون الأحمر والأزرق المعتمد) */}
              {detailsList.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-blue-900 font-black text-lg underline block" style={{ color: '#002266' }}>
                    التفاصيل :
                  </span>

                  <div className="space-y-2 pr-2">
                    {detailsList.map((dt, idx) => (
                      <p
                        key={idx}
                        className="font-bold text-base sm:text-[17px] leading-relaxed"
                        style={{ color: '#cc0000' }}
                      >
                        {dt}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. ICONIC DASHED DIVIDER */}
              <div
                className="text-center font-mono text-slate-400 tracking-widest my-3 select-none text-xs sm:text-sm overflow-hidden"
                style={{ color: '#94a3b8' }}
              >
                ------------------------------------------------------------------------------------------------------------------------
              </div>

              {/* 6. PAINT & UPHOLSTERY SECTION (الدهان والتنجيد) */}
              <div className="space-y-3 font-bold text-base sm:text-lg">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                    الدهان :
                  </span>
                  <span className="font-black text-base sm:text-lg" style={{ color: '#cc0000' }}>
                    {order.job_details?.paint_details || 'كما هو بالمعرض'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-blue-900 underline font-black shrink-0" style={{ color: '#002266' }}>
                    التنجيد :
                  </span>
                  <span className="font-black text-base sm:text-lg" style={{ color: '#cc0000' }}>
                    {order.job_details?.fabric_source || order.job_details?.color_code || 'كما هو بالمعرض'}
                  </span>
                </div>
              </div>

              {/* 7. IMAGE ATTACHMENTS EMBEDDED DIRECTLY IN THE ORDER (مثل صور البوفيه، السرير، الرخام، الكروكي) */}
              {imageAttachments.length > 0 && (
                <div className="pt-4 space-y-4 border-t-2 border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {imageAttachments.map((imgAtt, idx) => (
                      <div key={idx} className="border border-slate-300 rounded p-2 bg-slate-50 text-center">
                        <div className="font-bold text-xs text-blue-900 mb-1.5" style={{ color: '#002266' }}>
                          {imgAtt.title}
                        </div>
                        <img
                          src={imgAtt.file_url}
                          alt={imgAtt.title}
                          className="max-h-64 sm:max-h-72 w-full object-contain mx-auto rounded"
                          style={{ maxHeight: '280px' }}
                        />
                        {imgAtt.description && (
                          <p className="text-[11px] text-slate-600 mt-1.5 font-medium leading-tight">
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
            <div className="pt-8 mt-6 border-t border-slate-300">
              <div className="flex items-center justify-between font-serif">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-xl text-blue-950 underline" style={{ color: '#001a4d' }}>
                    يعتمــــد :
                  </span>
                  <span className="font-black text-xl text-blue-900" style={{ color: '#002266' }}>
                    / {approver}
                  </span>
                </div>

                {/* Factory Stamp & Sign line */}
                <div className="text-left font-serif text-xs text-slate-400 italic">
                  مصنع النجار ديزاين للأثاث والديكور
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
