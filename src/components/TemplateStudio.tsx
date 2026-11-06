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
  Eye,
  Edit3,
} from 'lucide-react';

interface TemplateStudioProps {
  onSaveToDatabase?: (payload: CreateJobOrderPayload) => void;
}

// Preset templates constructed from the user's uploaded PDFs and images
export const presetTemplates: TemplateJobOrder[] = [
  {
    id: 'preset-master-bed',
    customerName: 'ا.محمود الشريف',
    roomCode: 'غرفة نوم كبيرة روما',
    contractDate: '1 / 11 / 2026',
    deliveryDate: '25 / 11 / 2026',
    specs: 'غرفة نوم كبيرة مكونة من: دولاب 2.60م + سرير 1.60م + 2 كومود + تسريحة وباف',
    detailsList: [
      '1- الدولاب مقاس 2.60م مقسم على 4 ضلف (2 ضلفة خشب + 2 ضلفة مرايا دبل فايس).',
      '2- السرير مقاس 1.60م مع ظهر متنجد كابتينيه فاخر.',
      '3- 2 كومود بدرجين ودلفه، وتسريحة مع مرايا مضيئة.',
    ],
    paintDetails: 'استر بني جوز مع طبقة حماية لاكيه لامع',
    upholsterySource: 'من شطا / وارد المصنع',
    upholsteryBreakdown: [
      { item: 'ظهر السرير + الباف', color: 'بيج قطيفة (CHARM)' },
      { item: 'كراسي التسريحة', color: 'بني غامق' },
    ],
    fabricTagImages: [],
    modelImages: [],
    approverName: 'م النجار: بشير',
  },
  {
    id: 'preset-youth-bed',
    customerName: 'ا.طارق عادل',
    roomCode: 'غرفة شبابي ريماس',
    contractDate: '3 / 11 / 2026',
    deliveryDate: '28 / 11 / 2026',
    specs: 'غرفة شبابي مكونة من: دولاب 1.20م + سرير 1.20م + مكتب دراسي + كومود',
    detailsList: [
      '1- الدولاب مقاس 1.20م ضلفتين مع شماعات وأرفف داخلية.',
      '2- السرير مقاس 1.20م مع مرطبة ومكتب دراسي ملحق.',
    ],
    paintDetails: 'دوكو أبيض ناصع مع لمسات خشب طبيعي',
    upholsterySource: 'وكالة النحاس',
    upholsteryBreakdown: [
      { item: 'ظهر السرير', color: 'ازرق سماوي (NOLA)' },
    ],
    fabricTagImages: [],
    modelImages: [],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-living',
    customerName: 'ا.هشام ربيع',
    roomCode: 'انتريه مارسيليا مودرن',
    contractDate: '2 / 11 / 2026',
    deliveryDate: '22 / 11 / 2026',
    specs: 'طقم انتريه مارسيليا مكون من: كنبة 3 + كنبة 3 + 2 فوتيه + ترابيزة',
    detailsList: [
      '1- عدد 2 كنبة مقاس 3 مقاعد بتصميم مودرن وميكانيزم مريح.',
      '2- عدد 2 فوتيه بتصميم دائري فخم وقواعد خشب زان.',
      '3- ترابيزة وسط خشب زان مع قشرة جوز وترابيزة مثلثات.',
    ],
    paintDetails: 'بني جوز طبيعي مع لمعة مطفية',
    upholsterySource: 'من شطا',
    upholsteryBreakdown: [
      { item: 'الكنبتين بالكامل', color: 'بيج فاتح (MARVEL)' },
      { item: 'الفوتيه', color: 'بني غامق' },
    ],
    fabricTagImages: [],
    modelImages: [],
    approverName: 'محمد عبد الله',
  },
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
    fabricTagImages: [],
    modelImages: [],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-adeeb-dining',
    customerName: 'ا.اديب جانات',
    roomCode: 'سفرة فرجينيا + جزامة بمرايا',
    contractDate: '20 / 6 / 2026',
    deliveryDate: '30 / 8 / 2026',
    specs: 'عدد واحد سفرة فرجينيا مكونة من ترابيزة + 6 كرسي + 2 نيش + البوفية + مرايات السفرة الشجرة + واحد جزامة بمرايا',
    detailsList: [
      '1- السفرة الفرجينيا كاملة بمرايات السفرة الشجرة مع الغاء رسمة الشجرة من المرايات.',
      '2- صورة الجزامة والمرايا فوقها مرفقة بامر الشغل ومقاس المرايا 80سم * 80سم ويوجد فيها فريم استانلس.',
      '3- دهان وقشرة الجزامة بالكامل مثل دهان وقشرة السفرة الفرجينيا.',
      '4- مقابض الجزامة زرار جولد ( ذهبي )',
    ],
    paintDetails: 'قشرة ودرجة دهان الجزامة مثل السفرة الفرجينيا',
    upholsterySource: '[3]- BMD - 9199 بيج',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/__________-__________________________________edf1797d.jpeg'],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-adeeb-salon',
    customerName: 'ا.اديب جانات',
    roomCode: 'صالون',
    contractDate: '20 / 6 / 2026',
    deliveryDate: '30 / 8 / 2026',
    specs: 'عدد واحد صالون مكون من كنبتين + 2 فوتية',
    detailsList: [
      '1- يتم تسليم الصالون الموجود في دمياط بعد المراجعة علية.',
    ],
    paintDetails: 'كما بالمعرض',
    upholsterySource: 'كما بالمعرض',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/___________-______0c0e1d86.jpeg'],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-adeeb-bedroom',
    customerName: 'ا.اديب جانات',
    roomCode: 'نوم نيو دريم مخصوص',
    contractDate: '20 / 6 / 2026',
    deliveryDate: '30 / 8 / 2026',
    specs: 'عدد واحد نوم نيو دريم مكونة من سرير + 2 كمود + الدولاب + التسريحة + الباف + الملل.',
    detailsList: [
      '1- مقاس المرتبة 180سم ساقطة.',
      '2- بالنسبة للتسريحة الغاء الدلفة الشمال المفصلي وعمل مكانها دلفة خشب مفصلي عليها مراية ويوجد خلفها رفوف للتخزين ولا يوجد تفريغ حوالين الدلفة يتم التنفيذ مثل الصورة المرفقة.',
    ],
    paintDetails: 'كما بالمعرض ( بني )',
    upholsterySource: 'BMD - GERMANY [1]',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/___________-___________________d61edddb.jpeg'],
    approverName: 'محمد عبد الله',
  },
  {
    id: 'preset-mazen-bed',
    customerName: 'مازن محمود البهنساوى',
    roomCode: 'نوم مخصوص',
    contractDate: '13 / 7 / 2025',
    deliveryDate: '1 / 9 / 2025',
    specs: 'نوم من صوره سرير + 2 كمود + المولا',
    detailsList: [
      '1- السرير مرتبه ساقطه 180 سم',
      '2- ال 2 كمود 50 سم',
    ],
    paintDetails: 'الجزء البني في 2 كمود القشرة والدهان نفس النوم الروما | الجزء الدوكو عينه من المعرض',
    upholsterySource: 'BMD - ROKOKO-9',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/mazen_page_01.jpg', '/assets/aistudio/mazen_page_02.jpg'],
    approverName: 'مروان هلال',
  },
  {
    id: 'preset-mazen-dining',
    customerName: 'مازن محمود البهنساوى',
    roomCode: 'سفره مخصوص',
    contractDate: '13 / 7 / 2025',
    deliveryDate: '1 / 9 / 2025',
    specs: 'ترابيزه + 6 كرسى نفس الصورة بالظبط',
    detailsList: [
      '1- الترابيزة مقاس 2م في 1 م',
    ],
    paintDetails: 'القشرة والدهان نفس النوم الروما',
    upholsterySource: 'BMD - GERMANY /2',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/mazen_page_03.jpg', '/assets/aistudio/mazen_page_04.jpg'],
    approverName: 'مروان هلال',
  },
  {
    id: 'preset-mazen-venice',
    customerName: 'مازن محمود البهنساوى',
    roomCode: 'ركنه فينيسيا مخصوص + ترابيزة',
    contractDate: '13 / 7 / 2025',
    deliveryDate: '1 / 9 / 2025',
    specs: 'ركنه فينيسيا مخصوص + ترابيزة',
    detailsList: [
      '1- الركنه نفس اتجاه الصورة (الضلع الأيسر 3.50م × المنتصف 3.30م × الضلع الأيمن 2م)',
      '2- الترابيزة نفس الصورة 120 سم في 60 سم',
    ],
    paintDetails: 'القشرة والدهان نفس النوم الروما',
    upholsterySource: 'الركنه كلها HAROUN KOYA Q9',
    upholsteryBreakdown: [
      { item: 'عدد 3 خداديات', color: 'SABEHA MARON-1' },
      { item: 'عدد 3 خداديات', color: 'SABEHA MARON-18' },
    ],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/mazen_page_05.jpg', '/assets/aistudio/mazen_page_06.jpg'],
    approverName: 'مروان هلال',
  },
  {
    id: 'preset-mazen-youth',
    customerName: 'مازن محمود البهنساوى',
    roomCode: 'شبابي مخصوص',
    contractDate: '13 / 7 / 2025',
    deliveryDate: '1 / 9 / 2025',
    specs: 'شبابى مخصوص مكونه من :- دولاب + 2 سرير + كمود + المولا',
    detailsList: [
      '1- الدولاب نفس دولاب مكه بدون دوكو',
      '2- الكمود نفس كمود الليدو',
      '3- ال 2 سرير نفس سراير الاكسات',
    ],
    paintDetails: 'القشرة واللون نفس شبابي ليدو بدون دوكو',
    upholsterySource: 'SABEHA LUXURY FABRIC - MARON-18',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/mazen_page_07.jpg'],
    approverName: 'مروان هلال',
  },
  {
    id: 'preset-mazen-coffee',
    customerName: 'مازن محمود البهنساوى',
    roomCode: 'كوفي كورنر + 2 رف طاير',
    contractDate: '13 / 7 / 2025',
    deliveryDate: '1 / 9 / 2025',
    specs: 'كوفي كورنر + 2 رف طاير',
    detailsList: [
      '1- العرض 80 سم والارتفاع 90 سم والعمق 50 سم',
      '2- عرض الارفف 80 سم وعمقها 30 سم',
    ],
    paintDetails: 'القشرة والدهان نفس النوم الروما | وش الادراج والضلف اسود مط',
    upholsterySource: 'بدون تنجيد',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/mazen_page_08.jpg', '/assets/aistudio/mazen_page_09.jpg'],
    approverName: 'مروان هلال',
  },
  {
    id: 'preset-mazen-console',
    customerName: 'مازن محمود البهنساوى',
    roomCode: 'كونسول مخصوص',
    contractDate: '13 / 7 / 2025',
    deliveryDate: '1 / 9 / 2025',
    specs: 'كونسول مثل الصورة',
    detailsList: [
      '1- كونسول عرض 120 سم وارتفاع 50 والعمق 40',
    ],
    paintDetails: 'القشرة والدهان نفس النوم الروما',
    upholsterySource: 'بدون تنجيد',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/mazen_page_10.jpg', '/assets/aistudio/mazen_page_11.jpg'],
    approverName: 'مروان هلال',
  },
  {
    id: 'preset-rania-bed',
    customerName: 'ارانيا عادل محمد',
    roomCode: 'نوم شبابي مكة مخصوص',
    contractDate: '3 / 11 / 2026',
    deliveryDate: '5 / 12 / 2026',
    specs: 'عدد واحد نوم شبابي مكة مخصوص مكونة من 2 سرير + واحد كمود + الدولاب + التسريحة + الملل',
    detailsList: [
      '1- الدولاب: عرض 2م، ارتفاع 240سم.',
      '2- القشرة: لزق القشرة على الدلفة بالطول.',
      '3- التقسيم الداخلي: كما بالصورة.',
      '4- تنجيد السرير: مثل الصورة.',
      '5- تسريحة: عرض 80 سم.',
      '6- تنجيد أدراج: إلغاء (تكون خشب).',
    ],
    paintDetails: 'كما بالمعرض ماعدا الجزء الأبيض الدوكو الموجود في برنيطة الدولاب هيكون قشرة بني',
    upholsterySource: 'كما بالمعرض (بيج)',
    upholsteryBreakdown: [],
    fabricTagImages: [],
    modelImages: ['/assets/aistudio/rania_2_page_01.jpg', '/assets/aistudio/rania_2_page_02.jpg', '/assets/aistudio/rania_2_page_03.jpg'],
    approverName: 'محمد عبد الله',
  },
];

export const TemplateStudio: React.FC<TemplateStudioProps> = ({ onSaveToDatabase }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateJobOrder>(presetTemplates[0]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Mobile active view tab: 'editor' vs 'preview'
  const [mobileActiveTab, setMobileActiveTab] = useState<'editor' | 'preview'>('editor');

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
    <div className="space-y-6 sm:space-y-10">
      
      {/* Top Banner - Interactive & Compact */}
      <div className="no-print bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 text-white p-5 sm:p-8 rounded-3xl border border-amber-800/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-amber-400 text-[10px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] mb-2">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="truncate">Production Intelligence • Template Studio</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black font-serif text-white leading-tight">
            مصمم قوالب أوامر الشغل
          </h2>
          <p className="text-[11px] sm:text-sm text-amber-200/60 mt-2 max-w-2xl leading-relaxed font-bold">
            قم بإنشاء وتخصيص أوامر الشغل القياسية لمصنع النجار، عدل البيانات لحظياً واطبع النسخة المعتمدة بدقة عالية.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-amber-800/30 shrink-0">
          <button
            onClick={handleSaveToDb}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-xl shadow-amber-900/40 transition-all cursor-pointer whitespace-nowrap active:scale-95 group"
          >
            {savedSuccess ? <Check className="w-5 h-5 text-emerald-900" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            <span>{savedSuccess ? 'تم الحفظ بنجاح' : 'حفظ في النظام'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black text-white bg-amber-700 hover:bg-amber-600 shadow-xl shadow-amber-950/40 transition-all cursor-pointer whitespace-nowrap active:scale-95 border-b-4 border-amber-900"
          >
            <Printer className="w-5 h-5" />
            <span>طباعة (A4)</span>
          </button>
        </div>
      </div>

      {/* Preset Templates Selector - Horizontal Scroll for Mobile */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>نماذج معتمدة للتعديل (قوالب المصنع):</span>
          </span>
        </div>
        
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-none pb-2 px-1 snap-x snap-mandatory">
          {presetTemplates.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t);
                setSavedSuccess(false);
              }}
              className={`min-w-[160px] sm:min-w-[200px] p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 snap-start relative overflow-hidden group ${
                selectedTemplate.id === t.id
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-lg ring-4 ring-amber-500/10'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-lg ${
                  selectedTemplate.id === t.id ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  T-{idx + 1}
                </span>
                <Award className={`w-4 h-4 ${selectedTemplate.id === t.id ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-500 transition-colors'}`} />
              </div>
              <div className="min-w-0">
                <h4 className={`text-xs font-black truncate mb-0.5 ${selectedTemplate.id === t.id ? 'text-amber-950 dark:text-amber-100' : 'text-slate-900 dark:text-slate-200'}`}>
                  {t.roomCode}
                </h4>
                <p className="text-[10px] font-bold text-slate-500 truncate">
                  {t.customerName}
                </p>
              </div>
              {/* Active Highlight */}
              {selectedTemplate.id === t.id && (
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-amber-500/10 rounded-tl-3xl flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE SWITCHER TABS - Floating Style */}
      <div className="no-print lg:hidden sticky top-4 z-30 flex items-center p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 mx-auto w-fit">
        <button
          onClick={() => setMobileActiveTab('editor')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 text-[11px] font-black rounded-xl transition-all cursor-pointer ${
            mobileActiveTab === 'editor'
              ? 'bg-amber-500 text-slate-950 shadow-lg scale-105'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>محرر البيانات</span>
        </button>

        <button
          onClick={() => setMobileActiveTab('preview')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 text-[11px] font-black rounded-xl transition-all cursor-pointer ${
            mobileActiveTab === 'preview'
              ? 'bg-amber-500 text-slate-950 shadow-lg scale-105'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>معاينة الطباعة</span>
        </button>
      </div>

      {/* Main Studio Grid: Editor Side Panel + Live Printed Template Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE EDITOR FORM (Hidden on print) */}
        <div className={`no-print lg:col-span-5 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5 sm:space-y-6 ${
          mobileActiveTab === 'preview' ? 'hidden lg:block' : 'block'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-100 flex items-center gap-2">
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            {/* Customer Phone & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم هاتف العميل
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center font-bold text-amber-700"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            {/* Numbered Details List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-amber-900 dark:text-amber-400">
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
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDetail(idx)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Paint & Upholstery Info */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الدهان
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.paintDetails || 'كما بالمعرض'}
                    onChange={(e) => handleFieldChange('paintDetails', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Upholstery Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    توزيع الأقمشة والخداديات
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
                      className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="اللون"
                      value={row.color}
                      onChange={(e) => handleBreakdownChange(idx, 'color', e.target.value)}
                      className="w-28 sm:w-32 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-rose-600 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBreakdown(idx)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
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
                رفع صور المرفقات (كروت القماش والموديل)
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
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-800 file:text-amber-100 hover:file:bg-amber-900 cursor-pointer w-full"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTemplate.fabricTagImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg border overflow-hidden bg-black shrink-0">
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
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-900 cursor-pointer w-full"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTemplate.modelImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg border overflow-hidden bg-black shrink-0">
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              />
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: LIVE CANVAS - EXACT DOCUMENT LAYOUT */}
        <div className={`lg:col-span-7 flex justify-center w-full overflow-x-auto ${
          mobileActiveTab === 'editor' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          <div
            id="printable-job-order-sheet"
            className="bg-white text-black p-4 sm:p-8 rounded-none border-2 sm:border-4 border-double border-slate-900 shadow-xl max-w-[210mm] w-full font-serif text-xs sm:text-sm leading-relaxed relative flex flex-col justify-between print-card my-auto"
            style={{
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            
            {/* DOCUMENT CONTENT */}
            <div className="space-y-4 sm:space-y-6">
              
              {/* HEADER: GOLD METALLIC LOGO + "أمر شغل" TITLE */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 sm:pb-4 gap-2">
                
                {/* Gold Logo Badge matching uploaded document */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-700 p-0.5 rounded-lg shadow-md flex items-center justify-center">
                    <div className="w-full h-full bg-amber-950 rounded flex items-center justify-center text-amber-300 font-black text-xl sm:text-2xl font-serif">
                      A
                    </div>
                  </div>
                </div>

                {/* Main Header Text */}
                <div className="text-center flex-1 pr-2 sm:pr-6">
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-800 tracking-wider font-serif">
                    أمر شغل
                  </h1>
                </div>

              </div>

              {/* TABLE HEADER: CUSTOMER, CODE, DATES */}
              <div className="space-y-2.5 sm:space-y-3 font-semibold text-sm sm:text-base">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 border-b border-slate-300 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-900 font-bold underline shrink-0">أسم العميل :</span>
                    <span className="font-bold text-blue-950 text-sm sm:text-lg">{selectedTemplate.customerName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-900 font-bold underline shrink-0">كود الغرفه :</span>
                    <span className="font-bold text-blue-950 text-sm sm:text-lg">{selectedTemplate.roomCode}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 border-b-2 border-slate-900 pb-2.5 sm:pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-900 font-bold underline shrink-0">تاريخ التعاقد :</span>
                    <span className="font-mono font-bold text-blue-900 text-sm sm:text-base">{selectedTemplate.contractDate}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-900 font-bold underline shrink-0">تاريخ الاستلام :</span>
                    <span className="font-mono font-bold text-blue-900 text-sm sm:text-base">{selectedTemplate.deliveryDate}</span>
                  </div>
                </div>

              </div>

              {/* GENERAL SPECS */}
              <div className="border-b-2 border-slate-900 pb-2.5 sm:pb-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-blue-900 font-extrabold text-sm sm:text-lg underline shrink-0">المواصفات :</span>
                  <span className="text-blue-900 font-extrabold text-sm sm:text-lg leading-snug">
                    {selectedTemplate.specs}
                  </span>
                </div>
              </div>

              {/* NUMBERED DETAILS LIST IN RED FONT */}
              <div className="space-y-2 sm:space-y-3 border-b-2 border-slate-900 pb-3 sm:pb-4">
                <span className="text-blue-900 font-extrabold text-sm sm:text-lg underline block">التفاصيل :</span>
                
                <div className="space-y-1.5 pr-1 sm:pr-2">
                  {selectedTemplate.detailsList.map((dt, idx) => (
                    <p key={idx} className="text-red-600 font-bold text-xs sm:text-base leading-relaxed">
                      {dt}
                    </p>
                  ))}
                </div>
              </div>

              {/* DOTTED DIVIDER LINE - ZERO OVERFLOW */}
              <div className="border-b-2 border-dashed border-slate-400 my-3 w-full" />

              {/* PAINT & UPHOLSTERY SECTION */}
              <div className="space-y-3">
                
                {selectedTemplate.paintDetails && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold text-xs sm:text-base">
                    <span className="text-blue-900 underline shrink-0">الدهان :</span>
                    <span className="text-red-600">{selectedTemplate.paintDetails}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold text-xs sm:text-base">
                  <span className="text-blue-900 underline shrink-0">التنجيد :</span>
                  <span className="text-red-600 font-bold">{selectedTemplate.upholsterySource}</span>
                </div>

                {/* Upholstery Breakdown Table */}
                {selectedTemplate.upholsteryBreakdown.length > 0 && (
                  <div className="space-y-1.5 pr-2 sm:pr-4 pt-1">
                    {selectedTemplate.upholsteryBreakdown.map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between font-bold text-xs sm:text-base">
                        <span className="text-slate-900">{row.item}</span>
                        <span className="text-red-600">{row.color}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* EMBEDDED FABRIC TAGS & MODEL PHOTOS */}
              <div className="pt-3 space-y-3 border-t border-slate-300">
                
                {/* Fabric Tags Grid */}
                {selectedTemplate.fabricTagImages.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block">كروت عينات القماش والـ Batch المرفقة:</span>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {selectedTemplate.fabricTagImages.map((img, idx) => (
                        <div key={idx} className="border border-slate-400 p-1 bg-white rounded shadow-2xs">
                          <img src={img} alt="Fabric Tag" className="w-full h-auto max-h-36 sm:max-h-48 object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model or Diagram Photos */}
                {selectedTemplate.modelImages.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 block">صورة الموديل أو الرسم الهيكلي التوضيحي:</span>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      {selectedTemplate.modelImages.map((img, idx) => (
                        <div key={idx} className="border border-slate-400 p-1 bg-white rounded shadow-2xs flex justify-center">
                          <img src={img} alt="Model Diagram" className="w-full h-auto max-h-52 sm:max-h-72 object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* FOOTER APPROVAL */}
            <div className="pt-6 sm:pt-8 border-t border-slate-400 mt-6 sm:mt-8 flex items-center justify-start text-sm sm:text-base font-bold text-slate-900">
              <span>يعتمد / </span>
              <span className="mr-2 text-slate-800">{selectedTemplate.approverName}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
