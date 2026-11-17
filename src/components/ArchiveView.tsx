import React, { useMemo, useState } from 'react';
import {
  Archive,
  Search,
  RotateCcw,
  Eye,
  Trash2,
  Calendar,
  User,
  Phone,
  Layers,
  FileCheck,
} from 'lucide-react';
import { JobOrderPopulated } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';
import { canCancelOrder, hasPermission } from '../lib/permissions';
import { isArchivedOrder } from '../utils/orderLifecycle';

interface ArchiveViewProps {
  orders: JobOrderPopulated[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  onRestoreOrder: (id: string, isArchived: boolean) => Promise<void> | void;
  onDeleteOrder: (id: string) => Promise<void> | void;
  onNavigateToDeliveries: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  orders,
  onSelectOrder,
  onRestoreOrder,
  onDeleteOrder,
  onNavigateToDeliveries,
}) => {
  const { userProfile, hasPerm } = useAuth();
  const { confirmAction } = useFeedback();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const canRestore = hasPermission(userProfile, 'order:update_production_fields');
  const canDelete = canCancelOrder(userProfile);
  const canReadFinance = hasPerm('finance:read');

  const archivedOrders = useMemo(() => orders.filter(isArchivedOrder), [orders]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    archivedOrders.forEach((o) => {
      const d = (o.delivered_at || o.delivery_date || o.contract_date || '').trim();
      if (d.length >= 4) years.add(d.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [archivedOrders]);

  const filteredArchived = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return archivedOrders
      .filter((ord) => {
        if (selectedYear !== 'all') {
          const d = (ord.delivered_at || ord.delivery_date || ord.contract_date || '').trim();
          if (!d.startsWith(selectedYear)) return false;
        }

        if (q) {
          const matches =
            ord.order_number.toLowerCase().includes(q) ||
            ord.room_model_code.toLowerCase().includes(q) ||
            ord.general_specs.toLowerCase().includes(q) ||
            (ord.customer?.name || '').toLowerCase().includes(q) ||
            (ord.customer?.phone || '').toLowerCase().includes(q) ||
            (ord.job_details?.paint_details || '').toLowerCase().includes(q) ||
            (ord.job_details?.color_code || '').toLowerCase().includes(q) ||
            (ord.job_details?.batch_number || '').toLowerCase().includes(q) ||
            (ord.delivery_receipt_number || '').toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => (b.updated_at || b.delivery_date || '').localeCompare(a.updated_at || a.delivery_date || ''));
  }, [archivedOrders, selectedYear, searchQuery]);

  const handleRestore = async (ord: JobOrderPopulated) => {
    const destinationLabel = ord.status === 'تسليم' ? 'سجل التسليمات' : 'أوامر الشغل الجارية';
    const confirmed = await confirmAction({
      title: `استعادة الأمر ${ord.order_number} من الأرشيف`,
      message: `سيتم إلغاء أرشفة الأمر وإعادته إلى «${destinationLabel}» لمتابعة المعالجة.`,
      confirmLabel: 'استعادة الأمر',
      tone: 'primary',
    });
    if (!confirmed) return;

    await onRestoreOrder(ord.id, false);
  };

  const handleDelete = async (ord: JobOrderPopulated) => {
    const confirmed = await confirmAction({
      title: `حذف الأمر ${ord.order_number} نهائياً`,
      message: `هل أنت متأكد من الحذف النهائي للأمر المؤرشف الخاص بالعميل (${ord.customer?.name || 'غير مسجل'})؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'تأكيد الحذف النهائي',
      tone: 'danger',
    });
    if (!confirmed) return;

    await onDeleteOrder(ord.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3352] text-white p-5 sm:p-7 rounded-2xl border border-[#4B83B8]/30 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 text-[#C6A355] border border-white/20 flex items-center justify-center shrink-0">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-white">
              الأرشيف والسجل التاريخي للمصنع
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              مكتبة مرجعية للأوامر المغلقة والمؤرشفة: ابحث باسم العميل، رقم الأمر، كود الدهان، أو رقم الـ Batch للرجوع لمواصفات أي طلب سابق أو صيانته.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToDeliveries}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shrink-0"
        >
          <span>الانتقال إلى سجل التسليمات</span>
        </button>
      </div>

      {/* Search & Year Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الأرشيف برقم الأمر، العميل، الهاتف، كود الدهان، القماش، أو رقم الـ Batch..."
            className="w-full pl-9 pr-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4B83B8]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            aria-label="تصفية حسب السنة"
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">جميع السنوات ({archivedOrders.length})</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                سنة {yr}
              </option>
            ))}
          </select>

          <span className="text-xs font-bold text-slate-500 whitespace-nowrap font-mono tabular-nums">
            {filteredArchived.length} سجل
          </span>
        </div>
      </div>

      {/* Archive Cards */}
      {filteredArchived.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
          <Archive className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
            الأرشيف فارغ أو لا توجد نتائج مطابقة
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            تُحفظ هنا الأوامر التي تم تسليمها وتقفيل حساباتها من تبويب «التسليمات» أو أرشفتها من إدارة الإنتاج.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArchived.map((ord) => (
            <div
              key={ord.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between overflow-hidden"
            >
              <div>
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#16253B] text-white tabular-nums shrink-0">
                      {ord.order_number}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 truncate">
                      {ord.room_model_code}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    مؤرشف ({ord.status === 'Draft' ? 'مسودة' : ord.status})
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-2">
                    {ord.general_specs}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ord.customer?.name || 'عميل'}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Phone className="w-3 h-3" />
                      {ord.customer?.phone || '—'}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Calendar className="w-3 h-3" />
                      {ord.delivered_at || ord.delivery_date || '—'}
                    </span>
                  </div>

                  {/* Historical Tech Reference */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers className="w-3.5 h-3.5 text-[#4B83B8] shrink-0" />
                      <span className="truncate">
                        الدهان: <strong>{ord.job_details?.paint_details || '—'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate">
                        القماش / Batch:{' '}
                        <strong className="font-mono">
                          {ord.job_details?.color_code || ord.job_details?.batch_number || '—'}
                        </strong>
                      </span>
                      {ord.delivery_receipt_number && (
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                          <FileCheck className="w-3 h-3" />
                          {ord.delivery_receipt_number}
                        </span>
                      )}
                    </div>
                    {canReadFinance && (
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between font-mono tabular-nums">
                        <span className="font-sans">إجمالي العقد:</span>
                        <strong className="text-[#233B5D] dark:text-slate-100">
                          {(ord.total_price || 0).toLocaleString('ar-EG')} ج.م
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectOrder(ord)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white bg-[#233B5D] hover:bg-[#1E3352] transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C6A355]" />
                  <span>عرض الكارت</span>
                </button>

                {canRestore && (
                  <button
                    type="button"
                    onClick={() => handleRestore(ord)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                    title="استعادة من الأرشيف"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(ord)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="حذف نهائي"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
