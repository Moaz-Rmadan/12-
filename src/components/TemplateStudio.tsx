import React, { useState } from 'react';
import { TemplateJobOrder, CreateJobOrderPayload } from '../types';
import { printElementById } from '../utils/printHelper';
import { compressImage } from '../utils/imageCompressor';
import {
  Printer,
  Upload,
  Plus,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Award,
} from 'lucide-react';

interface TemplateStudioProps {
  onSaveToDatabase?: (payload: CreateJobOrderPayload) => void;
}

// Preset templates constructed from the user's uploaded PDFs and images
export const presetTemplates: TemplateJobOrder[] = [
  {
    id: 'preset-1',
    customerName: 'ا.امير عبد الحميد',
    roomCode: 'كنبتين مخصوص',
    contractDate: '5 / 8 / 2026',
    deliveryDate: '15 / 9 / 2026',
    specs: 'عدد كنبتين مخصوص من صورة',
    detailsList: [
      '1- الكنبة الكبيرة مقاس 3م والكنبة الصغيرة مقاس 230سم',
      '2- الكنبة الصغيرة مقاس 230سم .',
      '3- الكنبتين يوجد بهم ميكانيزم في اليدين والظهور (اليدين و الظهور متحركة)',
      '4- يوجد صورة توضح شكل الكنبتين',
    ],
    paintDetails: 'كما بالمعرض',
    upholsterySource: 'من شطا',
    upholsteryBreakdown: [
      { item: 'الكنبتين+ 4 خدادية', color: 'البني الغامق' },
      { item: '4 خدادية', color: 'بيج فاتح' },
    ],
    fabricTagImages: [
      '/src/assets/images/fabric_sample_swatch_1793738336334.jpg',
    ],
    modelImages: [
      '/src/assets/images/living_room_3d_render_1793738336721.jpg',
    ],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-2',
    customerName: 'ا.ايمن محمد زكي',
    roomCode: 'ركنة فنيسيا مخصوص',
    contractDate: '20 / 8 / 2026',
    deliveryDate: '20 / 9 / 2026',
    specs: 'عدد واحد ركنة فنيسيا مقاس 280سم * 225سم',
    detailsList: [
      '1- الركنة مقاس 280سم * 225سم مقسمة الي 4 قطعة والتجاه مثل الرسم المرفق.',
      '2- صورة الركنة مرفقة بامر الشغل لتوضيح الشكل فقط اما التنفيذ مثل الرسم المرفق بكل التفاصيل الموجودة بالرسم.',
    ],
    paintDetails: 'كما بالمعرض',
    upholsterySource: 'من شطا',
    upholsteryBreakdown: [
      { item: 'الركنة بالكامل + 3 خدادية', color: '( بيج )' },
      { item: 'عدد 3 خدادية', color: '(كشمير)' },
    ],
    fabricTagImages: [
      '/src/assets/images/fabric_sample_swatch_1793738336334.jpg',
    ],
    modelImages: [
      '/src/assets/images/bedroom_cad_drawing_1793738336612.jpg',
    ],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-3',
    customerName: 'ا.احمد محمد قنديل',
    roomCode: 'سرير مكة شبابي',
    contractDate: '14 / 8 / 2026',
    deliveryDate: '10 / 9 / 2026',
    specs: 'عدد واحد سرير مكة شبابي + الملل',
    detailsList: [],
    paintDetails: 'كما بالمعرض',
    upholsterySource: 'من شطا',
    upholsteryBreakdown: [],
    fabricTagImages: [
      '/assets/aistudio/WhatsApp_Image_2026-08-19_at_11.06.46_PM_5275c30c.jpeg',
    ],
    modelImages: [],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-4',
    customerName: 'بيتر فيليب',
    roomCode: 'مكتبه تليفزيون',
    contractDate: '19 / 8 / 2026',
    deliveryDate: '30 / 8 / 2026',
    specs: 'مكتبة تليفزيون مخصوص *',
    detailsList: [
      'الاستلام يوم الاحد 30 / 8 / 2026',
      'تـــــعــــديــــل امـــــر شــــــغــــــل',
      'مكتبة تليفزيون مخصوص : جزء سفلى فقط',
      'المكتبه هتتعمل : اكليريك لون اسود زجاجى ( المكتبه سمارت مش طبيعى )',
      'مقاس المكتبه : 2.40 م فى عمق 30 سم فى ارتفاع 30 سم',
      'مقسمه على : 3 ضلف قلاب لتحت وهنعمل شطف فى الضلف من فوق تفتح منه',
      'هنعمل ظهر للمكتبه كلها ماعدا الضلفه اللي فى النص هتكون بدون ظهر ( مفتوحه على الحيطه )',
      'المكتبه هتتعلق على الحيطه',
    ],
    paintDetails: 'اكليريك اسود زجاجي',
    upholsterySource: 'لا يوجد تنجيد',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: [
      '/assets/aistudio/WhatsApp_Image_2026-08-21_at_2.28.17_PM_400d2667.jpeg',
    ],
    approverName: 'محمد حسام / محمد عبد الله',
  },
];

export const TemplateStudio: React.FC<TemplateStudioProps> = ({ onSaveToDatabase }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateJobOrder>(presetTemplates[0]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form Field Handlers
  const handleFieldChange = (field: keyof TemplateJobOrder, value: any) => {
    setSelectedTemplate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDetailChange = (index: number, val: string) => {
    const updated = [...selectedTemplate.detailsList];
    updated[index] = val;
    handleFieldChange('detailsList', updated);
  };

  const handleAddDetail = () => {
    handleFieldChange('detailsList', [
      ...selectedTemplate.detailsList,
      `${selectedTemplate.detailsList.length + 1}- بند جديد...`,
    ]);
  };

  const handleRemoveDetail = (index: number) => {
    handleFieldChange(
      'detailsList',
      selectedTemplate.detailsList.filter((_, i) => i !== index)
    );
  };

  const handleBreakdownChange = (index: number, key: 'item' | 'color', val: string) => {
    const updated = [...selectedTemplate.upholsteryBreakdown];
    updated[index][key] = val;
    handleFieldChange('upholsteryBreakdown', updated);
  };

  const handleAddBreakdown = () => {
    handleFieldChange('upholsteryBreakdown', [
      ...selectedTemplate.upholsteryBreakdown,
      { item: 'القطعة أو الخدادية', color: '(اللون)' },
    ]);
  };

  const handleRemoveBreakdown = (index: number) => {
    handleFieldChange(
      'upholsteryBreakdown',
      selectedTemplate.upholsteryBreakdown.filter((_, i) => i !== index)
    );
  };

  // Image upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetList: 'fabricTagImages' | 'modelImages') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const compressedDataUrl = await compressImage(file, 1000, 1000, 0.75);
        setSelectedTemplate((prev) => ({
          ...prev,
          [targetList]: [...prev[targetList], compressedDataUrl],
        }));
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  const handleRemoveImage = (targetList: 'fabricTagImages' | 'modelImages', idx: number) => {
    setSelectedTemplate((prev) => ({
      ...prev,
      [targetList]: prev[targetList].filter((_, i) => i !== idx),
    }));
  };

  const handlePrint = () => {
    printElementById('printable-job-order-sheet');
  };

  const [customerPhone, setCustomerPhone] = useState('01001234567');
  const [customerAddress, setCustomerAddress] = useState('القاهرة - التجمع الخامس');

  const handleSaveToDb = () => {
    if (!onSaveToDatabase) return;

    const payload: CreateJobOrderPayload = {
      customer: {
        name: selectedTemplate.customerName || 'عميل قالب',
        phone: customerPhone || '01000000000',
        address: customerAddress || 'عنوان المصنع',
      },
      job_order: {
        order_number: `JO-${Math.floor(1000 + Math.random() * 9000)}`,
        room_model_code: selectedTemplate.roomCode,
        contract_date: selectedTemplate.contractDate.replace(/\s+/g, ''),
        delivery_date: selectedTemplate.deliveryDate.replace(/\s+/g, ''),
        general_specs: selectedTemplate.specs,
        status: 'قيد التشغيل',
        total_price: 150000,
        deposit_paid: 75000,
      },
      job_details: {
        dimensions_cm: selectedTemplate.detailsList[0] || selectedTemplate.specs,
        wood_type: 'خشب زان أحمر + أرو طبيعي',
        paint_details: selectedTemplate.paintDetails || 'كما بالمعرض',
        fabric_source: selectedTemplate.upholsterySource,
        color_code: selectedTemplate.upholsteryBreakdown[0]?.color || 'N/A',
        batch_number: 'BATCH-A310',
        installation_notes: selectedTemplate.detailsList.join(' | '),
      },
      attachments: [
        ...selectedTemplate.fabricTagImages.map((url) => ({
          file_type: 'fabric_sample' as const,
          file_url: url,
          title: 'كروت عينات القماش والـ Batch المرفقة',
        })),
        ...selectedTemplate.modelImages.map((url) => ({
          file_type: 'drawing' as const,
          file_url: url,
          title: 'صورة الموديل والرسم الهيكلي',
        })),
      ],
    };

    onSaveToDatabase(payload);
    setSavedSuccess(true);
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="no-print bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-amber-50 p-6 rounded-2xl border border-amber-800/40 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Job Order Sheet Generator &amp; Template Studio</span>
          </div>
          <h2 className="text-xl font-black font-serif text-amber-100">
            مولد ومصمم قالب أمر الشغل القياسي (النجار ديزاين)
          </h2>
          <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
            يمكنك اختيار قالب جاهز مستوحى من أوامر الشغل المرفقة، تعديل النصوص والألوان، رفع صور كروت القماش والـ Batch، وطباعة المستند فوراً بنفس التنسيق المعتمد!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveToDb}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-900" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'تم الحفظ بالنظام!' : 'حفظ بقاعدة البيانات'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-600 shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة القالب (A4)</span>
          </button>
        </div>
      </div>

      {/* Preset Templates Selector Bar */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
          اختر قالباً محتمداً للتعديل عليه (مبني على صورك المرفقة):
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {presetTemplates.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                selectedTemplate.id === t.id
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-900 text-amber-200">
                  قالب {idx + 1}
                </span>
                <Award className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {t.roomCode}
              </h4>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {t.customerName}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Grid: Editor Side Panel + Live Printed Template Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE EDITOR FORM (Hidden on print) */}
        <div className="no-print lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700" />
              <span>محرر القالب وتغيير القيم</span>
            </h3>
            <button
              onClick={() => setSelectedTemplate(presetTemplates[0])}
              className="text-[11px] font-bold text-slate-400 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Success Saved Notification Banner */}
            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 text-xs font-bold shadow-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تم حفظ أمر الشغل وقيد العميل بنجاح في قاعدة البيانات!</span>
                </div>
                <button
                  onClick={() => setSavedSuccess(false)}
                  className="text-emerald-700 hover:underline text-[11px]"
                >
                  إغلاق
                </button>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم العميل
              </label>
              <input
                type="text"
                value={selectedTemplate.customerName}
                onChange={(e) => handleFieldChange('customerName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            {/* Customer Phone & Address */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم هاتف العميل
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان التسليم
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Room Code */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                كود الغرفة / الموديل
              </label>
              <input
                type="text"
                value={selectedTemplate.roomCode}
                onChange={(e) => handleFieldChange('roomCode', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            {/* Contract & Delivery Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ التعاقد
                </label>
                <input
                  type="text"
                  value={selectedTemplate.contractDate}
                  onChange={(e) => handleFieldChange('contractDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الاستلام
                </label>
                <input
                  type="text"
                  value={selectedTemplate.deliveryDate}
                  onChange={(e) => handleFieldChange('deliveryDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center font-bold text-amber-700"
                />
              </div>
            </div>

            {/* General Specs */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                المواصفات
              </label>
              <input
                type="text"
                value={selectedTemplate.specs}
                onChange={(e) => handleFieldChange('specs', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            {/* Numbered Details List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-amber-900 dark:text-amber-400">
                  التفاصيل الرقمية (المقاسات والملاحظات)
                </label>
                <button
                  type="button"
                  onClick={handleAddDetail}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند</span>
                </button>
              </div>

              {selectedTemplate.detailsList.map((dt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={dt}
                    onChange={(e) => handleDetailChange(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDetail(idx)}
                    className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Paint & Upholstery Info */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الدهان
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.paintDetails || 'كما بالمعرض'}
                    onChange={(e) => handleFieldChange('paintDetails', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مصدر التنجيد
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.upholsterySource}
                    onChange={(e) => handleFieldChange('upholsterySource', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Upholstery Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    ت توزيع الأقمشة والخداديات
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBreakdown}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                {selectedTemplate.upholsteryBreakdown.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="القطع / الخداديات"
                      value={row.item}
                      onChange={(e) => handleBreakdownChange(idx, 'item', e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="اللون"
                      value={row.color}
                      onChange={(e) => handleBreakdownChange(idx, 'color', e.target.value)}
                      className="w-32 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-rose-600 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBreakdown(idx)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* IMAGE UPLOADERS SECTION */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block font-bold text-amber-900 dark:text-amber-400">
                رفع وصور المرفقات (كروت القماش والموديل)
              </label>

              {/* Upload Fabric Tag Image */}
              <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-slate-800/40 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  1. صور كروت القماش والـ Batch:
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'fabricTagImages')}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-800 file:text-amber-100 hover:file:bg-amber-900 cursor-pointer"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTemplate.fabricTagImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden bg-black">
                      <img src={img} alt="Tag" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('fabricTagImages', idx)}
                        className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-bl"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Model Image */}
              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  2. صورة الموديل أو الرسم الهيكلي:
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'modelImages')}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-900 cursor-pointer"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTemplate.modelImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden bg-black">
                      <img src={img} alt="Model" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('modelImages', idx)}
                        className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-bl"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Approver Name */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم المعتمد (يعتمد / ...)
              </label>
              <input
                type="text"
                value={selectedTemplate.approverName}
                onChange={(e) => handleFieldChange('approverName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              />
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: LIVE CANVAS - EXACT DOCUMENT LAYOUT AS PRINTED IN USER PDF */}
        <div className="lg:col-span-7 flex justify-center">
          
          <div id="printable-job-order-sheet" className="bg-white text-black p-8 rounded-none border-4 border-double border-slate-900 shadow-2xl max-w-[210mm] w-full min-h-[297mm] font-serif text-sm leading-relaxed relative flex flex-col justify-between print-card">
            
            {/* DOCUMENT CONTENT */}
            <div className="space-y-6">
              
              {/* HEADER: GOLD METALLIC LOGO + "أمر شغل" TITLE */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                
                {/* Gold Logo Badge matching uploaded document */}
                <div className="flex items-center gap-2">
                  <div className="w-14 h-14 bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-700 p-0.5 rounded-lg shadow-md flex items-center justify-center">
                    <div className="w-full h-full bg-amber-950 rounded flex items-center justify-center text-amber-300 font-black text-2xl font-serif">
                      A
                    </div>
                  </div>
                </div>

                {/* Main Header Text */}
                <div className="text-center flex-1 pr-6">
                  <h1 className="text-4xl font-extrabold text-amber-800 tracking-wider font-serif">
                    أمر شغل
                  </h1>
                </div>

              </div>

              {/* TABLE HEADER: CUSTOMER, CODE, DATES */}
              <div className="space-y-3 font-semibold text-base">
                
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-900 font-bold underline">أسم العميل :</span>
                    <span className="font-bold text-blue-950 text-lg">{selectedTemplate.customerName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-blue-900 font-bold underline">كود الغرفه :</span>
                    <span className="font-bold text-blue-950 text-lg">{selectedTemplate.roomCode}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-900 font-bold underline">تاريخ التعاقد :</span>
                    <span className="font-mono font-bold text-blue-900">{selectedTemplate.contractDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-blue-900 font-bold underline">تاريخ الاستلام :</span>
                    <span className="font-mono font-bold text-blue-900">{selectedTemplate.deliveryDate}</span>
                  </div>
                </div>

              </div>

              {/* GENERAL SPECS */}
              <div className="border-b-2 border-slate-900 pb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-blue-900 font-extrabold text-lg underline shrink-0">المواصفات :</span>
                  <span className="text-blue-900 font-extrabold text-lg leading-snug">
                    {selectedTemplate.specs}
                  </span>
                </div>
              </div>

              {/* NUMBERED DETAILS LIST IN RED FONT */}
              <div className="space-y-3 border-b-2 border-slate-900 pb-4">
                <span className="text-blue-900 font-extrabold text-lg underline block">التفاصيل :</span>
                
                <div className="space-y-2 pr-2">
                  {selectedTemplate.detailsList.map((dt, idx) => (
                    <p key={idx} className="text-red-600 font-bold text-base leading-relaxed">
                      {dt}
                    </p>
                  ))}
                </div>
              </div>

              {/* DOTTED DIVIDER LINE */}
              <div className="text-center font-mono text-slate-400 tracking-widest my-2 select-none">
                ----------------------------------------------------------------------------------------------------
              </div>

              {/* PAINT & UPHOLSTERY SECTION */}
              <div className="space-y-4">
                
                {selectedTemplate.paintDetails && (
                  <div className="flex items-center justify-between font-bold text-base">
                    <span className="text-blue-900 underline">الدهان :</span>
                    <span className="text-red-600">{selectedTemplate.paintDetails}</span>
                  </div>
                )}

                <div className="flex items-center justify-between font-bold text-base">
                  <span className="text-blue-900 underline">التنجيد :</span>
                  <span className="text-red-600 font-bold">{selectedTemplate.upholsterySource}</span>
                </div>

                {/* Upholstery Breakdown Table */}
                {selectedTemplate.upholsteryBreakdown.length > 0 && (
                  <div className="space-y-2 pr-4 pt-1">
                    {selectedTemplate.upholsteryBreakdown.map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between font-bold text-base">
                        <span className="text-slate-900">{row.item}</span>
                        <span className="text-red-600">{row.color}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* EMBEDDED FABRIC TAGS & MODEL PHOTOS */}
              <div className="pt-4 space-y-4 border-t border-slate-300">
                
                {/* Fabric Tags Grid */}
                {selectedTemplate.fabricTagImages.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 block">كروت عينات القماش والـ Batch المرفقة:</span>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTemplate.fabricTagImages.map((img, idx) => (
                        <div key={idx} className="border border-slate-400 p-1 bg-white rounded shadow-2xs">
                          <img src={img} alt="Fabric Tag" className="w-full h-auto max-h-48 object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model or Diagram Photos */}
                {selectedTemplate.modelImages.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-500 block">صورة الموديل أو الرسم الهيكلي التوضيحي:</span>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedTemplate.modelImages.map((img, idx) => (
                        <div key={idx} className="border border-slate-400 p-1 bg-white rounded shadow-2xs flex justify-center">
                          <img src={img} alt="Model Diagram" className="w-full h-auto max-h-72 object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* FOOTER APPROVAL */}
            <div className="pt-8 border-t border-slate-400 mt-8 flex items-center justify-start text-base font-bold text-slate-900">
              <span>يعتمد / </span>
              <span className="mr-2 text-slate-800">{selectedTemplate.approverName}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
