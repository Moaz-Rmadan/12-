import React, { useState, useRef } from 'react';
import { CreateJobOrderPayload, Customer, OrderStatus } from '../types';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Users,
  Check,
} from 'lucide-react';

interface BatchOrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (orders: CreateJobOrderPayload[]) => Promise<number>;
  existingCustomers: Customer[];
}

export const BatchOrderImportModal: React.FC<BatchOrderImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingCustomers,
}) => {
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [parsedOrders, setParsedOrders] = useState<CreateJobOrderPayload[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Template example for quick copy
  const sampleTemplate = `رقم الأمر\tاسم العميل\tرقم الهاتف\tالعنوان\tكود الموديل\tالمواصفات\tالمقاسات\tنوع الخشب\tالدهان\tالقماش\tالإجمالي\tالعربون\tتاريخ التسليم
JO-2026-105\tأحمد فتحي\t01099887766\tالتجمع الخامس\tRM-BED-05\tغرفة نوم ماستر مودرن كابوتينيه\tدولاب 260×220، سرير 180×200\tزان أحمر روماني\tأستر رمادي مطفي\tمخمل مستورد كحلي\t85000\t35000\t2026-11-20
JO-2026-106\tمريم الكردي\t01122334455\tالشيخ زايد\tRM-SAL-02\tصالون كلاسيك مذهب فاخر\tكنبة 3 مقاعد + 2 فوتيه\tزان طبيعي مبخر\tدوكو فرن ذهبي عتيق\tحرير دمشقي نبيتي\t62000\t20000\t2026-11-28`;

  // Flexible parser for CSV / Tab-separated / Pipe-separated order lines
  const parseRawOrders = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const parsed: CreateJobOrderPayload[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const line of lines) {
      // Skip header lines
      if (
        line.includes('رقم الأمر') ||
        line.toLowerCase().includes('order') ||
        line.includes('اسم العميل') ||
        line.toLowerCase().includes('customer')
      ) {
        continue;
      }

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        continue;
      }

      parts = parts.map((p) => (p || '').trim());
      if (parts.length < 2) continue;

      const orderNumber = parts[0] || `JO-${Date.now().toString().slice(-4)}`;
      const customerName = parts[1] || 'عميل غير مسمى';
      let customerPhone = (parts[2] || '').replace(/[^0-9+]/g, '');
      if (!customerPhone) customerPhone = '01000000000';
      const customerAddress = parts[3] || 'العنوان غير مدخل';
      const modelCode = parts[4] || `MOD-${Date.now().toString().slice(-3)}`;
      const generalSpecs = parts[5] || 'أعمال نجارة وديكور حسب الاتفاق';
      const dimensions = parts[6] || 'حسب الرسومات التنفيذية المعتمدة';
      const woodType = parts[7] || 'خشب زان أحمر طبيعي';
      const paintDetails = parts[8] || 'تشطيب أستر / دوكو حسب العينة';
      const fabricSource = parts[9] || 'من اختيار العميل / المصنع';
      const totalPrice = parseFloat(parts[10]?.replace(/[^0-9.]/g, '') || '0') || 50000;
      const depositPaid = parseFloat(parts[11]?.replace(/[^0-9.]/g, '') || '0') || 20000;
      const deliveryDate = parts[12] || todayStr;

      const payload: CreateJobOrderPayload = {
        customer: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
        },
        job_order: {
          order_number: orderNumber,
          room_model_code: modelCode,
          contract_date: todayStr,
          delivery_date: deliveryDate,
          general_specs: generalSpecs,
          status: 'قيد التشغيل' as OrderStatus,
          total_price: totalPrice,
          deposit_paid: depositPaid,
        },
        job_details: {
          dimensions_cm: dimensions,
          wood_type: woodType,
          paint_details: paintDetails,
          fabric_source: fabricSource,
          color_code: 'STD',
          batch_number: `BATCH-${new Date().getFullYear()}`,
          installation_notes: 'فحص المقاسات في الموقع قبل التركيب النهائي',
        },
        attachments: [],
      };

      parsed.push(payload);
    }

    setParsedOrders(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPastedText(content);
        parseRawOrders(content);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(sampleTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleExecuteImport = async () => {
    if (parsedOrders.length === 0) return;
    setIsImporting(true);
    try {
      const count = await onImport(parsedOrders);
      setSuccessMessage(`تم بنجاح فرز وحفظ ${count} أمر شغل وتحديث بيانات العملاء في Firebase.`);
      setTimeout(() => {
        onClose();
        setParsedOrders([]);
        setPastedText('');
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error('Batch order import failed', err);
    } finally {
      setIsImporting(false);
    }
  };

  // Distinct count of customers extracted
  const uniquePhones = new Set(parsedOrders.map((o) => o.customer.phone));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                استيراد أوامر الشغل مع فرز العملاء تلقائياً
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يقوم النظام بفصل أوامر الشغل في جدولها، والعملاء في جدولهم وربطهم برقم الهاتف
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Action Controls & Sample Template */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportMode('paste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                importMode === 'paste'
                  ? 'bg-amber-800 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>نسخ ولصق من Excel / Sheets</span>
            </button>

            <button
              type="button"
              onClick={() => setImportMode('file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                importMode === 'file'
                  ? 'bg-amber-800 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع ملف (CSV أو TXT)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyTemplate}
            className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-400 hover:underline px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60"
          >
            {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTemplate ? 'تم نسخ نموذج الأعمدة!' : 'نسخ نموذج أعمدة Excel'}</span>
          </button>
        </div>

        {/* Input area */}
        <div className="py-3 shrink-0">
          {importMode === 'paste' ? (
            <div>
              <textarea
                rows={4}
                placeholder="الصق بيانات جدول أوامر الشغل والعملاء هنا (انسخ من Excel مباشرة)..."
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  parseRawOrders(e.target.value);
                }}
                className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 dark:border-amber-900/60 rounded-2xl p-6 text-center cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-amber-700 dark:text-amber-400 mb-2" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                اضغط هنا لاختيار ملف أوامر الشغل (.CSV أو .TXT)
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                سيقوم النظام تلقائياً باستخراج العملاء وأوامر الشغل وربطهم
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt, .tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Extraction Summary Stats */}
        {parsedOrders.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-3">
              <Layers className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <div>
                <span className="text-[11px] text-slate-500 block">أوامر شغل مستخرجة:</span>
                <span className="font-bold text-sm text-amber-950 dark:text-amber-200 font-mono">
                  {parsedOrders.length} أمر شغل
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <div>
                <span className="text-[11px] text-slate-500 block">عملاء مستخرجين للفرز:</span>
                <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200 font-mono">
                  {uniquePhones.size} عميل (سيتم فرزهم لجدول العملاء)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Preview List */}
        <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="bg-slate-50 dark:bg-slate-800 p-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>معاينة أوامر الشغل والفرز التلقائي:</span>
            <span className="font-mono text-amber-800 dark:text-amber-300">
              {parsedOrders.length} أمر جاهز للإرسال لـ Firebase
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {parsedOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                الصق محتوى أوامر الشغل أو ارفع ملف CSV لتظهر المعاينة هنا قبل الحفظ.
              </div>
            ) : (
              parsedOrders.map((ord, idx) => {
                const isExistingCustomer = existingCustomers.some(
                  (c) => c.phone === ord.customer.phone && ord.customer.phone !== '01000000000'
                );

                return (
                  <div
                    key={idx}
                    className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-900 dark:text-amber-300">
                          {ord.job_order.order_number}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {ord.job_order.room_model_code}
                        </span>
                        <span className="text-slate-500 text-[11px] truncate max-w-[200px]">
                          {ord.job_order.general_specs}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700 dark:text-slate-300">العميل:</span>
                        <span>{ord.customer.name}</span>
                        <span>({ord.customer.phone})</span>
                        <span>- {ord.customer.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left font-mono text-[11px]">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold block">
                          {ord.job_order.total_price.toLocaleString()} ج.م
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          العربون: {ord.job_order.deposit_paid.toLocaleString()} ج.م
                        </span>
                      </div>

                      {isExistingCustomer ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          عميل مسجل (سيتم ربطه)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          عميل جديد (سيُضاف للعملاء)
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setParsedOrders((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="إزالة هذا الأمر"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <span className="text-xs text-slate-500">
            يقوم الخادم بفرز وتوثيق العملاء وأوامر الشغل في Firebase Firestore مباشرة.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={isImporting || parsedOrders.length === 0}
              onClick={handleExecuteImport}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {isImporting
                  ? 'جارٍ الفرز والحفظ في Firebase...'
                  : `بدء الفرز وحفظ (${parsedOrders.length}) أمر شغل في Firebase`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
