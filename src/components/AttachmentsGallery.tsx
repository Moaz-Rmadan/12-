import React, { useState } from 'react';
import { Attachment, JobOrderPopulated, AttachmentType } from '../types';
import { Image as ImageIcon, Layers, Scissors, Box, Eye, X } from 'lucide-react';

interface AttachmentsGalleryProps {
  orders: JobOrderPopulated[];
}

export const AttachmentsGallery: React.FC<AttachmentsGalleryProps> = ({ orders }) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<Attachment | null>(null);

  // Flatten all attachments from orders
  const allAttachments: Array<Attachment & { orderNumber: string; specs: string }> = [];
  orders.forEach((o) => {
    o.attachments?.forEach((a) => {
      allAttachments.push({
        ...a,
        orderNumber: o.order_number,
        specs: o.general_specs,
      });
    });
  });

  const filteredAttachments = allAttachments.filter((att) => {
    if (activeFilter === 'all') return true;
    return att.file_type === activeFilter;
  });

  const getAttachmentBadge = (type: AttachmentType) => {
    switch (type) {
      case 'drawing':
        return { label: 'رسم هيكلي CAD', icon: Layers, color: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300' };
      case 'fabric_sample':
        return { label: 'عينة قماش', icon: Scissors, color: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' };
      case '3d_render':
        return { label: 'رندر 3D', icon: Box, color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' };
      default:
        return { label: 'مرفق أخر', icon: ImageIcon, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Category Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-700" />
            <span>معرض المرفقات وكروت عينات القماش ({allAttachments.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تصفح الرسومات الهيكلية CAD وكروت عينات التنجيد المعتمدة بالـ Batch Number
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
          {[
            { id: 'all', label: 'كافة المرفقات' },
            { id: 'drawing', label: 'رسومات هيكلية (CAD)' },
            { id: 'fabric_sample', label: 'كروت القماش' },
            { id: '3d_render', label: 'رندر 3D' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === item.id
                  ? 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attachments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredAttachments.map((att) => {
          const badge = getAttachmentBadge(att.file_type);
          const BadgeIcon = badge.icon;

          return (
            <div
              key={att.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Image Aspect ratio Box */}
                <div className="relative h-52 bg-slate-950 overflow-hidden flex items-center justify-center">
                  <img
                    src={att.file_url}
                    alt={att.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <button
                      onClick={() => setPreviewImage(att)}
                      className="w-full py-2 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-600 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Eye className="w-4 h-4" />
                      <span>تكبير المعاينة</span>
                    </button>
                  </div>

                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-sm ${badge.color}`}>
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-200">
                      أمر: {att.orderNumber}
                    </span>
                  </div>

                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {att.title}
                  </h3>

                  {att.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {att.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-mono">
                {att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString('ar-EG') : 'مسجل بالمصنع'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-4 bg-slate-950 flex items-center justify-between text-slate-100 border-b border-slate-800">
              <span className="font-bold text-sm text-amber-400">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-hidden bg-black">
              <img
                src={previewImage.file_url}
                alt={previewImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
