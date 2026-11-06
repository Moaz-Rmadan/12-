import React, { useState, useEffect } from 'react';
import { CreateJobOrderPayload, OrderStatus, ProductionStage, AttachmentType, JobOrderPopulated } from '../types';
import { X, Save, Hammer, Ruler, Paintbrush, Scissors, Plus, Trash2, Upload, Edit3, Sparkles } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateJobOrderPayload, orderId?: string) => void;
  orderToEdit?: JobOrderPopulated | null;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  orderToEdit,
}) => {
  const isEditMode = Boolean(orderToEdit);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [orderNumber, setOrderNumber] = useState('');
  const [roomModelCode, setRoomModelCode] = useState('RM-BED-LUX-01');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [generalSpecs, setGeneralSpecs] = useState('');
  const [status, setStatus] = useState<OrderStatus>('قيد التشغيل');
  const [currentStage, setCurrentStage] = useState<ProductionStage>('لم يبدأ');
  const [totalPrice, setTotalPrice] = useState<number>(150000);
  const [depositPaid, setDepositPaid] = useState<number>(80000);

  const [dimensionsCm, setDimensionsCm] = useState('الدولاب: 280 × 220 × 65 سم | السرير: 180 × 200 سم');
  const [woodType, setWoodType] = useState('خشب زان أحمر روماني + أبلكاش سه');
  const [paintDetails, setPaintDetails] = useState('دهان بولي يوريثان مط عالي الثبات على قشرة أرو');
  const [fabricSource, setFabricSource] = useState('وكالة النحاس للأقمشة - قطيفة فاخرة');
  const [colorCode, setColorCode] = useState('VELVET-NVY-904');
  const [batchNumber, setBatchNumber] = useState('');
  const [installationNotes, setInstallationNotes] = useState('تركيب دور 2، التأكد من استواء الأرضيات');

  const [attachmentsList, setAttachmentsList] = useState<
    Array<{ file_type: AttachmentType; file_url: string; title: string }>
  >([]);

  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customer?.name || '');
      setCustomerPhone(orderToEdit.customer?.phone || '');
      setCustomerAddress(orderToEdit.customer?.address || '');

      setOrderNumber(orderToEdit.order_number);
      setRoomModelCode(orderToEdit.room_model_code);
      setContractDate(orderToEdit.contract_date);
      setDeliveryDate(orderToEdit.delivery_date);
      setGeneralSpecs(orderToEdit.general_specs);
      setStatus(orderToEdit.status);
      setCurrentStage(orderToEdit.current_stage || 'لم يبدأ');
      setTotalPrice(orderToEdit.total_price);
      setDepositPaid(orderToEdit.deposit_paid);

      setDimensionsCm(orderToEdit.job_details?.dimensions_cm || '');
      setWoodType(orderToEdit.job_details?.wood_type || 'خشب زان أحمر روماني + أبلكاش سه');
      setPaintDetails(orderToEdit.job_details?.paint_details || '');
      setFabricSource(orderToEdit.job_details?.fabric_source || '');
      setColorCode(orderToEdit.job_details?.color_code || '');
      setBatchNumber(orderToEdit.job_details?.batch_number || '');
      setInstallationNotes(orderToEdit.job_details?.installation_notes || '');

      if (orderToEdit.attachments && orderToEdit.attachments.length > 0) {
        setAttachmentsList(
          orderToEdit.attachments.map((a) => ({
            file_type: a.file_type,
            file_url: a.file_url,
            title: a.title,
          }))
        );
      } else {
        setAttachmentsList([]);
      }
    } else {
      // New Order defaults
      const defaultOrderNum = `JO-2026-${Math.floor(100 + Math.random() * 900)}`;
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setOrderNumber(defaultOrderNum);
      setRoomModelCode('RM-BED-LUX-01');
      setContractDate(new Date().toISOString().split('T')[0]);
      setDeliveryDate(
        new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
      setGeneralSpecs('');
      setStatus('قيد التشغيل');
      setTotalPrice(150000);
      setDepositPaid(80000);
      setDimensionsCm('الدولاب: 280 × 220 × 65 سم | السرير: 180 × 200 سم');
      setWoodType('خشب زان أحمر روماني + أبلكاش سه');
      setPaintDetails('دهان بولي يوريثان مط عالي الثبات على قشرة أرو');
      setFabricSource('وكالة النحاس للأقمشة - قطيفة فاخرة');
      setColorCode('VELVET-NVY-904');
      setBatchNumber(`BATCH-2026-${Math.floor(100 + Math.random() * 900)}`);
      setInstallationNotes('تركيب دور 2، التأكد من استواء الأرضيات');
      setAttachmentsList([
        {
          file_type: 'drawing',
          file_url: '/src/assets/images/bedroom_cad_drawing_1793738336612.jpg',
          title: 'الرسم الهيكلي والتنفيذي (CAD)',
        },
        {
          file_type: 'fabric_sample',
          file_url: '/src/assets/images/fabric_sample_swatch_1793738336334.jpg',
          title: 'كرت عينة القماش واللون',
        },
      ]);
    }
  }, [orderToEdit, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: AttachmentType) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const compressedUrl = await compressImage(file, 1000, 1000, 0.75);
        setAttachmentsList((prev) => [
          ...prev,
          {
            file_type: fileType,
            file_url: compressedUrl,
            title: file.name.replace(/\.[^/.]+$/, ''),
          },
        ]);
      } catch (err) {
        console.error('Error uploading file attachment:', err);
      }
    }
  };

  const handleAddAttachment = () => {
    setAttachmentsList([
      ...attachmentsList,
      { file_type: '3d_render', file_url: '', title: 'رندر 3D أو مرفق جديد' },
    ]);
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachmentsList(attachmentsList.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !orderNumber || !generalSpecs) {
      alert('الرجاء إدخال اسم العميل، رقم الأمر والمواصفات العامة');
      return;
    }

    const payload: CreateJobOrderPayload = {
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      },
      job_order: {
        order_number: orderNumber,
        room_model_code: roomModelCode,
        contract_date: contractDate,
        delivery_date: deliveryDate,
        general_specs: generalSpecs,
        status,
        current_stage: currentStage,
        total_price: Number(totalPrice),
        deposit_paid: Number(depositPaid),
      },
      job_details: {
        dimensions_cm: dimensionsCm,
        wood_type: woodType,
        paint_details: paintDetails,
        fabric_source: fabricSource,
        color_code: colorCode,
        batch_number: batchNumber,
        installation_notes: installationNotes,
      },
      attachments: attachmentsList.filter((a) => a.file_url.trim() !== ''),
    };

    onSubmit(payload, orderToEdit?.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-900 via-amber-950 to-slate-900 text-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEditMode ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {isEditMode ? <Edit3 className="w-5 h-5 text-amber-300" /> : <Hammer className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-serif text-amber-100">
                  {isEditMode ? `تعديل أمر الشغل (${orderToEdit?.order_number})` : 'إنشاء أمر شغل جديد'}
                </h2>
                {isEditMode && (
                  <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    أمر تعديل مواصفة / ECO
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-300/80">
                {isEditMode
                  ? 'تعديل المقاسات، نوع الخشب، كود القماش أو رقم الباتش وحفظها في قاعدة البيانات'
                  : 'إدخال بيانات العميل، الموديل، الدهانات، والتنجيد برقم الـ Batch'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-amber-900 text-amber-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* SECTION 1: CUSTOMER INFO */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span>1. بيانات العميل والاتصال</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم العميل الثلاثي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: د. حسام فاروق"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01000000000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان التسليم والتركيب التفصيلي
                </label>
                <input
                  type="text"
                  placeholder="مثال: القاهرة - التجمع الخامس - فيلا 22"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: JOB ORDER MAIN DETAILS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span>2. بيانات أمر الشغل والتعاقد</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الأمر *
                </label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كود الغرفة / الموديل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="RM-BED-09"
                  value={roomModelCode}
                  onChange={(e) => setRoomModelCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  حالة الطلب الرئيسية
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
                >
                  <option value="قيد التشغيل">قيد التشغيل</option>
                  <option value="تم التنفيذ">تم التنفيذ</option>
                  <option value="تسليم">تسليم</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  مرحلة الإنتاج الحالية (الورشة)
                </label>
                <select
                  value={currentStage}
                  onChange={(e) => setCurrentStage(e.target.value as ProductionStage)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-bold cursor-pointer"
                >
                  <option value="لم يبدأ">⏳ لم يبدأ</option>
                  <option value="نجارة عفش">🪚 نجارة عفش</option>
                  <option value="نجارة انتريهات">🪵 نجارة انتريهات</option>
                  <option value="خدمة وتجهيز">⏱️ خدمة وتجهيز</option>
                  <option value="كابينة أستر">🎨 كابينة أستر</option>
                  <option value="كابينة دوكو">🖌️ كابينة دوكو</option>
                  <option value="تنجيد">🛋️ تنجيد</option>
                  <option value="تشطيب وتغليف">📦 تشطيب وتغليف</option>
                  <option value="جاهز للتسليم">🚀 جاهز للتسليم</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ التعاقد
                </label>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ التسليم المتوقع
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  إجمالي المبلغ (ج.م)
                </label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                المواصفات العامة للطلب *
              </label>
              <textarea
                required
                rows={2}
                placeholder="مثال: غرفة نوم رئيسية مودرن تحتوي على دولاب 6 ضلفة وسرير كابوتونيه و2 كومودينو"
                value={generalSpecs}
                onChange={(e) => setGeneralSpecs(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* SECTION 3: WORKSHOP & TECHNICAL DETAILS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span>3. تفاصيل الورش والتشغيل (المقاسات والدهان والتنجيد)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-amber-700" />
                  <span>المقاسات والتصاميم الهيكلية (بالسم)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: 240 × 220 × 65 سم"
                  value={dimensionsCm}
                  onChange={(e) => setDimensionsCm(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نوع الخشب المعتمد
                </label>
                <input
                  type="text"
                  placeholder="مثال: خشب زان أحمر روماني"
                  value={woodType}
                  onChange={(e) => setWoodType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Paintbrush className="w-3.5 h-3.5 text-amber-700" />
                  <span>تفاصيل الدهان واللمعة النهاية</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: دهان أستر بني جوز طبيعي بولي يوريثان مط"
                  value={paintDetails}
                  onChange={(e) => setPaintDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-amber-700" />
                  <span>مصدر القماش</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: النحاس للأقمشة / وارد العميل"
                  value={fabricSource}
                  onChange={(e) => setFabricSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كود اللون
                </label>
                <input
                  type="text"
                  placeholder="مثال: VELVET-NVY-904"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 dark:bg-slate-800/60 border border-amber-300/60 dark:border-amber-800/60">
                <label className="block text-xs font-bold text-amber-950 dark:text-amber-300 mb-1">
                  رقم الـ Batch (Batch Number) لضمان تجانس اللون *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: BATCH-2026-24-0BB73"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات التركيب بالموقع
                </label>
                <input
                  type="text"
                  placeholder="مثال: تثبيت قواعد ستانلس ستيل، موقع التركيب دور 3 بدون أسانسير"
                  value={installationNotes}
                  onChange={(e) => setInstallationNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: ATTACHMENTS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                4. المرفقات (الرسم الهيكلي وكروت العينات)
              </h3>
              
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 dark:bg-amber-950 dark:text-amber-200 rounded-lg cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع صورة من الجهاز</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'drawing')}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة رابط</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {attachmentsList.map((att, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <select
                    value={att.file_type}
                    onChange={(e) => {
                      const updated = [...attachmentsList];
                      updated[idx].file_type = e.target.value as AttachmentType;
                      setAttachmentsList(updated);
                    }}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-semibold cursor-pointer"
                  >
                    <option value="drawing">رسم هيكلي (CAD)</option>
                    <option value="fabric_sample">كرت عينة قماش</option>
                    <option value="3d_render">رندر 3D</option>
                    <option value="other">مرفق آخر</option>
                  </select>

                  <input
                    type="text"
                    placeholder="رابط الصورة / Image URL"
                    value={att.file_url}
                    onChange={(e) => {
                      const updated = [...attachmentsList];
                      updated[idx].file_url = e.target.value;
                      setAttachmentsList(updated);
                    }}
                    className="flex-1 min-w-[200px] px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-900 hover:to-slate-900 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditMode ? 'تحديث وحفظ التعديل' : 'حفظ أمر الشغل'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
