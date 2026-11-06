export type OrderStatus = 'قيد التشغيل' | 'تم التنفيذ' | 'تسليم';

export type ProductionStage =
  | 'لم يبدأ'
  | 'نجارة عفش'
  | 'نجارة انتريهات'
  | 'خدمة وتجهيز'
  | 'كابينة أستر'
  | 'كابينة دوكو'
  | 'تنجيد'
  | 'تشطيب وتغليف'
  | 'جاهز للتسليم';

export type AttachmentType = 'drawing' | 'fabric_sample' | '3d_render' | 'other';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobOrder {
  id: string;
  order_number: string; // e.g. "JO-2026-101"
  customer_id: string;
  room_model_code: string; // e.g. "RM-BED-LUX-01"
  contract_date: string; // YYYY-MM-DD
  delivery_date: string; // YYYY-MM-DD
  general_specs: string; // المواصفات العامة
  status: OrderStatus;
  current_stage?: ProductionStage; // مرحلة الإنتاج الحالية في الورشة
  stage_updated_at?: string; // تاريخ وساعة الانضمام للمرحلة الحالية
  total_price: number;
  deposit_paid: number;
  is_archived?: boolean; // أرشفة أمر الشغل
  created_at?: string;
  updated_at?: string;
}

export interface JobDetail {
  id: string;
  job_order_id: string;
  dimensions_cm: string; // e.g. "العرض 240 × الارتفاع 220 × العمق 65 سم"
  wood_type?: string; // e.g. "خشب زان أحمر روماني + كاونتر كونتر بلي وود"
  paint_details: string; // e.g. "دهان أستر بني جوز مع طبقة بولي يوريثان مقاوم للخدش"
  fabric_source: string; // e.g. "وكالة النحاس للأقمشة / وارد المصنع"
  color_code: string; // e.g. "VELVET-NVY-904"
  batch_number: string; // e.g. "BATCH-2026-04B"
  installation_notes: string; // e.g. "تثبيت الموديول السفلية بقواعد ستانلس ستيل، موقع التركيب دور 3"
  created_at?: string;
}

export interface Attachment {
  id: string;
  job_order_id: string;
  file_type: AttachmentType;
  file_url: string;
  title: string;
  description?: string;
  uploaded_at?: string;
}

export interface JobOrderPopulated extends JobOrder {
  customer?: Customer;
  job_details?: JobDetail;
  attachments?: Attachment[];
}

export interface CreateJobOrderPayload {
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  job_order: {
    order_number: string;
    room_model_code: string;
    contract_date: string;
    delivery_date: string;
    general_specs: string;
    status: OrderStatus;
    current_stage?: ProductionStage;
    stage_updated_at?: string;
    total_price: number;
    deposit_paid: number;
  };
  job_details: {
    dimensions_cm: string;
    wood_type: string;
    paint_details: string;
    fabric_source: string;
    color_code: string;
    batch_number: string;
    installation_notes: string;
  };
  attachments: Array<{
    file_type: AttachmentType;
    file_url: string;
    title: string;
    description?: string;
  }>;
};

export interface TemplateJobOrder {
  id: string;
  customerName: string;
  roomCode: string;
  contractDate: string; // e.g. "5 / 8 / 2026"
  deliveryDate: string; // e.g. "15 / 9 / 2026"
  specs: string; // e.g. "عدد كنبتين مخصوص من صورة"
  detailsList: string[]; // e.g. ["1- الكنبة الكبيرة مقاس 3م...", "2- الكنبة الصغيرة..."]
  paintDetails?: string; // e.g. "كما بالمعرض" or "اكليريك اسود زجاجي"
  upholsterySource: string; // e.g. "من شطا"
  upholsteryBreakdown: Array<{ item: string; color: string }>; // e.g. [{ item: "الكنبتين+ 4 خدادية", color: "البني الغامق" }]
  fabricTagImages: string[]; // URLs or base64 data URLs for fabric tag photos
  modelImages: string[]; // URLs or base64 data URLs for 3D/diagram photos
  approverName: string; // e.g. "محمد عبد الله"
  logoUrl?: string; // Optional custom logo image URL
}

// Truck Manifest / Delivery Cargo Load Trip Sheet Types ("حمولة العربية")
export interface TruckManifestItem {
  id: string;
  customerName: string; // e.g. "عمرو ابو حشيش" or "المعرض"
  qty: number; // e.g. 1
  itemName: string; // e.g. "مكتبة عش النحل"
  specsDetails: string; // e.g. "جزء سفلي فقط"
  notes: string; // e.g. "الدهان كما هو بالمعرض"
  salesperson: string; // e.g. "محمد حسين"
  orderId?: string;
  itemType?: 'delivery' | 'showroom' | 'accessories' | 'return'; // 'delivery' = تسليم عميل, 'showroom' = عروض وقواطع المعرض, 'accessories' = نواقص وتكميلي, 'return' = مرتجع وصيانة
  returnReason?: string; // سبب الارجاع (صيانة، تعديل دهان، الخ)
}

export interface TruckManifest {
  id: string;
  tripDate: string; // YYYY/MM/DD e.g. "2026/03/04"
  tripDay: string; // e.g. "الأربعاء"
  truckNumber: string; // e.g. "1697"
  driverName: string; // e.g. "عصام"
  items: TruckManifestItem[];
  createdAt?: string;
  updatedAt?: string;
}
