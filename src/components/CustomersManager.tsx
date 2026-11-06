import React, { useState, useRef } from 'react';
import { Customer, JobOrderPopulated } from '../types';
import {
  User,
  Phone,
  MapPin,
  Search,
  Plus,
  ExternalLink,
  Trash2,
  AlertTriangle,
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileCheck,
} from 'lucide-react';

interface CustomersManagerProps {
  customers: Customer[];
  orders: JobOrderPopulated[];
  onOpenNewOrderForCustomer?: (customer: Customer) => void;
  onOpenDeliveryReceiptForCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onAddBatchCustomers?: (newCustomers: Array<{ name: string; phone: string; address?: string }>) => Promise<number>;
  onAddSingleCustomer?: (customer: { name: string; phone: string; address?: string }) => Promise<void>;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({
  customers,
  orders,
  onOpenNewOrderForCustomer,
  onOpenDeliveryReceiptForCustomer,
  onDeleteCustomer,
  onAddBatchCustomers,
  onAddSingleCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [parsedCustomers, setParsedCustomers] = useState<Array<{ name: string; phone: string; address: string }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [isSavingSingle, setIsSavingSingle] = useState(false);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      c.phone.includes(searchTerm.trim()) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase().trim()))
  );

  const getCustomerOrders = (cust: Customer) => {
    return orders.filter((o) => o.customer_id === cust.id || o.customer?.phone === cust.phone);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete || !onDeleteCustomer) return;
    setIsDeleting(true);
    try {
      await onDeleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Parse raw text into structured customer records
  const parseRawText = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const parsed: Array<{ name: string; phone: string; address: string }> = [];

    for (const line of lines) {
      // Ignore common header line
      if (
        line.includes('الاسم') ||
        line.toLowerCase().includes('name') ||
        line.includes('التليفون') ||
        line.toLowerCase().includes('phone')
      ) {
        continue;
      }

      // Determine separator: Tab, Comma, Semicolon, or Pipe
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else {
        // Space separated fallback: attempt to extract phone
        const phoneMatch = line.match(/(01[0125][0-9]{8})/);
        if (phoneMatch) {
          const phone = phoneMatch[1];
          const before = line.substring(0, line.indexOf(phone)).trim();
          const after = line.substring(line.indexOf(phone) + phone.length).trim();
          parts = [before || 'عميل بدون اسم', phone, after || 'العنوان غير مدخل'];
        } else {
          parts = [line, '', ''];
        }
      }

      const name = (parts[0] || '').trim();
      let phone = (parts[1] || '').trim();
      const address = (parts[2] || '').trim();

      // Clean phone number
      phone = phone.replace(/[^0-9+]/g, '');

      if (name) {
        parsed.push({
          name,
          phone: phone || '01000000000',
          address: address || 'العنوان غير مدخل',
        });
      }
    }

    setParsedCustomers(parsed);
  };

  // Handle File Upload (.csv or .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPastedText(content);
        parseRawText(content);
      }
    };
    reader.readAsText(file);
  };

  // Execute Batch Import
  const handleExecuteImport = async () => {
    if (parsedCustomers.length === 0 || !onAddBatchCustomers) return;
    setIsImporting(true);
    try {
      const count = await onAddBatchCustomers(parsedCustomers);
      setImportSuccessMessage(`تم استيراد وحفظ ${count} عميل بنجاح في قاعدة البيانات.`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setParsedCustomers([]);
        setPastedText('');
        setImportSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error('Import error', err);
    } finally {
      setIsImporting(false);
    }
  };

  // Execute Single Customer Save
  const handleSaveSingleCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !onAddSingleCustomer) return;
    setIsSavingSingle(true);
    try {
      await onAddSingleCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || '01000000000',
        address: newCustAddress.trim() || 'العنوان غير مدخل',
      });
      setIsAddModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
    } finally {
      setIsSavingSingle(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-300">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-950 dark:text-amber-100">
              سجل العملاء ودليل الاتصال
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إجمالي العملاء المسجلين: <strong className="font-mono text-amber-800 dark:text-amber-300">{customers.length}</strong> عميل
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Import Customers Button */}
          {onAddBatchCustomers && (
            <button
              onClick={() => {
                setIsImportModalOpen(true);
                setParsedCustomers([]);
                setPastedText('');
                setImportSuccessMessage(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-950/60 dark:hover:bg-amber-950 border border-amber-200 dark:border-amber-900 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>استيراد عملاء (ملف / لصق)</span>
            </button>
          )}

          {/* Quick Add Single Customer Button */}
          {onAddSingleCustomer && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل</span>
            </button>
          )}
        </div>
      </div>

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
            <User className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold">لا يوجد عملاء يطابقون البحث</p>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const custOrders = getCustomerOrders(cust);

            return (
              <div
                key={cust.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-xl hover:shadow-amber-950/5 hover:border-amber-400/80 dark:hover:border-amber-600/70 card-motion flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Subtle Amber Hairline Accent */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-600 to-amber-800 opacity-80 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-4 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 flex items-center justify-center font-black text-sm shadow-inner transition-transform duration-200 group-hover:scale-105">
                        {cust.name.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-900 dark:group-hover:text-amber-300 transition-colors">
                          {cust.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">عميل معتمد</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 tabular-nums">
                        {custOrders.length} أوامر
                      </span>

                      {onDeleteCustomer && (
                        <button
                          type="button"
                          onClick={() => setCustomerToDelete(cust)}
                          title="حذف العميل"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-850/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 transition-colors group-hover:border-amber-200/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <a
                        href={`tel:${cust.phone}`}
                        className="font-mono font-black hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 tabular-nums"
                      >
                        {cust.phone}
                      </a>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-relaxed font-medium">{cust.address || 'العنوان غير مدخل'}</span>
                    </div>
                  </div>

                  {/* Assigned Orders List */}
                  {custOrders.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                        أوامر الشغل بالورشة ({custOrders.length}):
                      </span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                        {custOrders.map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-amber-300 transition-colors"
                          >
                            <span className="font-mono font-black text-amber-900 dark:text-amber-300 tabular-nums">
                              {o.order_number}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] leading-relaxed">
                              {o.general_specs}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 tabular-nums">
                              {o.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={`https://wa.me/2${cust.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>واتساب</span>
                  </a>

                  <div className="flex items-center gap-2">
                    {onOpenDeliveryReceiptForCustomer && (
                      <button
                        onClick={() => onOpenDeliveryReceiptForCustomer(cust)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300/60 dark:border-amber-800/60 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        title="طباعة إقرار استلام منتجات العميل"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>إقرار استلام</span>
                      </button>
                    )}

                    {onOpenNewOrderForCustomer && (
                      <button
                        onClick={() => onOpenNewOrderForCustomer(cust)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>أمر جديد</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Customer Deletion */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  تأكيد حذف بيانات العميل
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  هل أنت متأكد من رغبتك في حذف هذا العميل من سجل العملاء؟
                </p>
              </div>
              <button
                onClick={() => !isDeleting && setCustomerToDelete(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Info Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">اسم العميل:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{customerToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">رقم الهاتف:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{customerToDelete.phone}</span>
              </div>
              {customerToDelete.address && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">العنوان:</span>
                  <span className="text-slate-700 dark:text-slate-300">{customerToDelete.address}</span>
                </div>
              )}
            </div>

            {/* Warning if customer has linked orders */}
            {(() => {
              const linkedCount = getCustomerOrders(customerToDelete).length;
              if (linkedCount > 0) {
                return (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs mb-5 flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>تنبيه:</strong> لدى هذا العميل <strong>{linkedCount}</strong> أمر شغل مسجل في النظام. سيتم حذف العميل من قاعدة بيانات العملاء فقط مع بقاء أوامر الشغل السابقة محفوظة.
                    </span>
                  </div>
                );
              }
              return (
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 text-xs mb-5">
                  لا توجد أي أوامر شغل مرتبطة بهذا العميل حالياً.
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QUICK ADD SINGLE CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-300">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  إضافة عميل جديد
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم العميل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. أحمد عبد الرحمن"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف (واتساب) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="مثال: 01012345678"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان التسليم / السكن
                </label>
                <input
                  type="text"
                  placeholder="مثال: التجمع الخامس، كمبوند هايد بارك، فيلا 24"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingSingle || !newCustName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50 rounded-lg shadow-xs"
                >
                  {isSavingSingle ? 'جارٍ الحفظ...' : 'حفظ العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT CUSTOMERS MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-300">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    استيراد دليل العملاء (دفعة واحدة إلى Firebase)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ارفع ملف Excel / CSV أو انسخ والصق جدول العملاء مباشرة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success Message Banner */}
            {importSuccessMessage && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-bold">{importSuccessMessage}</span>
              </div>
            )}

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-2 mt-4 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-2">
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
                <span>نسخ ولصق (Excel / Sheets / نصوص)</span>
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

            {/* Input Section */}
            <div className="py-4 space-y-3 shrink-0">
              {importMode === 'paste' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    انسخ والصف البيانات هنا (يقبل صفوف Excel المنسوخة أو فواصل , أو |):
                  </label>
                  <textarea
                    rows={4}
                    placeholder={`مثال:\nمحمد أحمد, 01012345678, التجمع الخامس\nمحمود السيد\t01123456789\tالشيخ زايد\nخالد إبراهيم | 01234567890 | الإسكندرية`}
                    value={pastedText}
                    onChange={(e) => {
                      setPastedText(e.target.value);
                      parseRawText(e.target.value);
                    }}
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>النظام يتعرف تلقائياً على الأعمدة (الاسم، الهاتف، العنوان).</span>
                    {pastedText && (
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText('');
                          setParsedCustomers([]);
                        }}
                        className="text-red-500 hover:underline"
                      >
                        مسح النص
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-amber-300 dark:border-amber-900/60 rounded-2xl p-6 text-center cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto text-amber-700 dark:text-amber-400 mb-2" />
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    اضغط هنا لاختيار ملف العملاء (.CSV أو .TXT)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    يمكنك تصدير شيت Excel بصيغة CSV ورفعه مباشرة
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

            {/* Parsed Preview Table */}
            <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>معاينة العملاء المستخرجين:</span>
                </span>
                <span className="font-mono text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {parsedCustomers.length} عميل جاهز
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {parsedCustomers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    لم يتم إدخال بيانات بعد. قم بلصق قائمة العملاء أو رفع ملف لتظهر المعاينة هنا.
                  </div>
                ) : (
                  parsedCustomers.map((cust, idx) => {
                    const isDuplicate = customers.some((c) => c.phone === cust.phone && cust.phone !== '01000000000');

                    return (
                      <div
                        key={idx}
                        className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-[10px] flex items-center justify-center font-bold text-slate-600">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {cust.name}
                            </span>
                            <span className="text-[11px] text-slate-500">{cust.address}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-700 dark:text-slate-300 dir-ltr text-left">
                            {cust.phone}
                          </span>
                          {isDuplicate ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              موجود مسبقاً (سيُتجاوز)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              جديد
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setParsedCustomers((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="حذف هذا الصف"
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
                سيتم حفظ السجلات مباشرة في قاعدة بيانات Firebase Firestore.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  disabled={isImporting || parsedCustomers.length === 0}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? 'جارٍ الاستيراد والحفظ...'
                      : `استيراد (${parsedCustomers.length}) عميل إلى Firebase`}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


