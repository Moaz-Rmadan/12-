import React from 'react';
import { JobOrderPopulated, OrderStatus } from '../types';
import { printElementById } from '../utils/printHelper';
import {
  X,
  Printer,
  Ruler,
  Paintbrush,
  Scissors,
  MapPin,
  Calendar,
  Layers,
  Phone,
  Tag,
  CheckCircle2,
  Clock,
  PackageCheck,
} from 'lucide-react';

interface WorkshopCardModalProps {
  order: JobOrderPopulated | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: OrderStatus) => void;
}

export const WorkshopCardModal: React.FC<WorkshopCardModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    printElementById('printable-workshop-card');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'قيد التشغيل':
        return {
          label: 'قيد التشغيل بالورشة',
          bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800',
          icon: Clock,
        };
      case 'تم التنفيذ':
        return {
          label: 'تم التنفيذ ومطابقة المواصفات',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800',
          icon: CheckCircle2,
        };
      case 'تسليم':
        return {
          label: 'تم التسليم والتركيب',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-800',
          icon: PackageCheck,
        };
    }
  };

  const statusBadge = getStatusBadge(order.status);
  const StatusIcon = statusBadge.icon;

  const drawingAttachment = order.attachments?.find((a) => a.file_type === 'drawing');
  const fabricAttachment = order.attachments?.find((a) => a.file_type === 'fabric_sample');
  const renderAttachment = order.attachments?.find((a) => a.file_type === '3d_render');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 my-8 print-card">
        
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-20 bg-amber-950 text-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-800/50 no-print">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-amber-800/80 text-amber-200 px-3 py-1 rounded-md font-mono font-bold tracking-wide">
              {order.order_number}
            </span>
            <h2 className="text-lg font-bold font-serif text-amber-100">
              كارت تشغيل الورشة - مصنع النجار ديزاين
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكارت</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-amber-900/80 text-amber-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CARD CONTENT */}
        <div id="printable-workshop-card" className="p-6 sm:p-8 space-y-6">
          
          {/* Card Header Info */}
          <div className="border-b border-amber-900/20 dark:border-slate-800 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <span>مصنع النجار ديزاين للأثاث والديكور</span>
                  <span>•</span>
                  <span>كارت أمر شغل رقم {order.order_number}</span>
                </div>
                <h1 className="text-2xl font-black font-serif text-slate-900 dark:text-slate-100">
                  {order.general_specs}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-700" />
                  <span>كود الغرفة / الموديل:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {order.room_model_code}
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold ${statusBadge.bg}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span>{statusBadge.label}</span>
                </div>

                {onUpdateStatus && (
                  <div className="flex items-center gap-1 mt-1 no-print">
                    <span className="text-[11px] text-slate-400">تحديث الحالة:</span>
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                      className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-semibold cursor-pointer"
                    >
                      <option value="قيد التشغيل">قيد التشغيل</option>
                      <option value="تم التنفيذ">تم التنفيذ</option>
                      <option value="تسليم">تسليم</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Dates & Customer Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 p-4 rounded-xl bg-amber-50/50 dark:bg-slate-800/40 border border-amber-200/50 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">اسم العميل:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {order.customer?.name || 'غير محدد'}
                </span>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 mt-1">
                  <Phone className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-mono">{order.customer?.phone || 'لا يوجد'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">تاريخ التعاقد والاستلام:</span>
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>التعاقد: {order.contract_date}</span>
                </div>
                <div className="text-amber-800 dark:text-amber-400 font-bold mt-1">
                  موعد الاستلام: {order.delivery_date}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">عنوان التركيب والموقع:</span>
                <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 leading-tight">
                  <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>{order.customer?.address || 'تسليم من المصنع'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: WORKSHOP DETAILS (النجار والمقاسات) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-base border-r-4 border-amber-700 pr-3">
              <Ruler className="w-5 h-5 text-amber-700" />
              <h3>قسم النجارين - المقاسات والهيكل الخشبي</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-500 block">المقاسات الدقيقة (بالسم):</span>
                <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100 font-mono leading-relaxed">
                  {order.job_details?.dimensions_cm || 'حسب الرسم المرفق'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-500 block">نوع الخشب الهيكلي:</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {order.job_details?.wood_type || 'خشب زان أحمر'}
                </p>
              </div>
            </div>

            {/* Drawing Attachment preview */}
            {drawingAttachment && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>الرسم الهيكلي والتنفيذي (CAD / Drawing):</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{drawingAttachment.title}</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-800 max-h-80 bg-black flex justify-center">
                  <img
                    src={drawingAttachment.file_url}
                    alt={drawingAttachment.title}
                    referrerPolicy="no-referrer"
                    className="object-contain max-h-80 w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PAINTERS & FINISH DETAILS (الدهانات) */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-base border-r-4 border-amber-700 pr-3">
              <Paintbrush className="w-5 h-5 text-amber-700" />
              <h3>قسم الدهانات والأستر</h3>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/30 dark:bg-slate-800/40 border border-amber-200/50 dark:border-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              <span className="text-xs font-semibold text-slate-500 block mb-1">تفاصيل دهان الورشة ونوع الطبقة النهائية:</span>
              {order.job_details?.paint_details || 'حسب اتفاق العميل'}
            </div>
          </div>

          {/* SECTION 3: UPHOLSTERY & FABRICS (التنجيد والأقمشة) */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-base border-r-4 border-amber-700 pr-3">
              <Scissors className="w-5 h-5 text-amber-700" />
              <h3>قسم التنجيد والأقمشة ومطابقة الـ Batch</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 block mb-1">مصدر القماش:</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {order.job_details?.fabric_source || 'وارد المصنع'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 block mb-1">كود اللون المعتمد:</span>
                <p className="text-xs font-extrabold font-mono text-amber-800 dark:text-amber-300">
                  {order.job_details?.color_code || 'N/A'}
                </p>
              </div>

              {/* BATCH NUMBER CALLOUT */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950 dark:to-slate-900 border-2 border-amber-500/60 text-amber-950 dark:text-amber-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider block text-amber-900 dark:text-amber-400">
                  رقم تشغيلة القماش (Batch Number):
                </span>
                <p className="text-sm font-black font-mono tracking-wide mt-1">
                  {order.job_details?.batch_number || 'BATCH-DEFAULT'}
                </p>
                <span className="text-[10px] text-amber-800 dark:text-amber-400 block mt-1">
                  * يجب التأكد من مطابقة رقم الـ Batch قبل قص الثوب لضمان درجة اللون
                </span>
              </div>
            </div>

            {/* Fabric Swatch & Render previews */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fabricAttachment && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    عينة القماش المعتمدة:
                  </span>
                  <img
                    src={fabricAttachment.file_url}
                    alt={fabricAttachment.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              )}

              {renderAttachment && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    رندر الـ 3D المعتمد:
                  </span>
                  <img
                    src={renderAttachment.file_url}
                    alt={renderAttachment.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: INSTALLATION & SITE NOTES */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-500 block">تعليمات الفنيين وملاحظات التركيب بالموقع:</span>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
              {order.job_details?.installation_notes || 'لا توجد ملاحظات إضافية'}
            </div>
          </div>

          {/* Card Footer Signature Area for Print */}
          <div className="pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="block font-bold">مهندس الورشة / الجودة</span>
              <span className="block mt-6 font-mono">--------------------</span>
            </div>
            <div>
              <span className="block font-bold">فني النجار والتنجيد</span>
              <span className="block mt-6 font-mono">--------------------</span>
            </div>
            <div>
              <span className="block font-bold">استلام العميل والتثبيت</span>
              <span className="block mt-6 font-mono">--------------------</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
