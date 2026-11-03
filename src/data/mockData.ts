import { Customer, JobOrder, JobDetail, Attachment, JobOrderPopulated } from '../types';

export const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'المهندس أحمد عبد العزيز',
    phone: '01001234567',
    address: 'القاهرة - التجمع الخامس - حي النرجس فيلا 14',
    created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: 'cust-2',
    name: 'الدكتورة منى فاروق',
    phone: '01119876543',
    address: 'الجيزة - الشيخ زايد - كمبوند السليمانية',
    created_at: '2026-10-20T14:30:00Z',
  },
  {
    id: 'cust-3',
    name: 'الأستاذ محمود إبراهيم',
    phone: '01225554433',
    address: 'الإسكندرية - سموحة - شارع فوزي معاذ برج الصفوة',
    created_at: '2026-11-01T09:15:00Z',
  },
];

export const initialOrders: JobOrder[] = [
  {
    id: 'ord-1',
    order_number: 'JO-2026-101',
    customer_id: 'cust-1',
    room_model_code: 'RM-BED-MASTER-09',
    contract_date: '2026-10-15',
    delivery_date: '2026-11-20',
    general_specs: 'غرفة نوم رئيسية مودرن (سرير كابوتونيه + دولاب 6 ضلفة هيدروليك + 2 كومودينو + تسريحة مرآة مدمجة)',
    status: 'قيد التشغيل',
    total_price: 185000,
    deposit_paid: 100000,
    created_at: '2026-10-15T10:30:00Z',
    updated_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'ord-2',
    order_number: 'JO-2026-102',
    customer_id: 'cust-2',
    room_model_code: 'SAL-ROYAL-GREEN-04',
    contract_date: '2026-10-20',
    delivery_date: '2026-11-10',
    general_specs: 'طقم صالون كلاسيك مذهب وخشب جوز طبيعي (كنبة ثلاثية + كنبة ثنائية + 2 فوتيه + طاولة وسط خشبية زان)',
    status: 'تم التنفيذ',
    total_price: 145000,
    deposit_paid: 145000,
    created_at: '2026-10-20T15:00:00Z',
    updated_at: '2026-11-03T09:00:00Z',
  },
  {
    id: 'ord-3',
    order_number: 'JO-2026-103',
    customer_id: 'cust-3',
    room_model_code: 'DIN-MODERN-WOOD-02',
    contract_date: '2026-11-01',
    delivery_date: '2026-12-05',
    general_specs: 'غرفة سفرة مودرن (طاولة 8 كراسي خشب زان أحمر + بوفيه زجاجي مودرن مع إضاءة LED مدمجة)',
    status: 'تسليم',
    total_price: 120000,
    deposit_paid: 120000,
    created_at: '2026-11-01T09:30:00Z',
    updated_at: '2026-11-03T10:15:00Z',
  },
];

export const initialDetails: JobDetail[] = [
  {
    id: 'det-1',
    job_order_id: 'ord-1',
    dimensions_cm: 'الدولاب: 320 × 230 × 65 سم | السرير: 180 × 200 سم | الكومودينو: 55 × 45 × 50 سم',
    wood_type: 'خشب زان أحمر روماني مكفوف + كونتر بلي وود إسباني 18 مم',
    paint_details: 'دهان أستر بني جوز طبيعي عالي الثبات مع بولي يوريثان مط ضد التبصيم والخدش',
    fabric_source: 'وكالة النحاس للأقمشة - كولكشن قطيفة مايكروفايبر إيطالي',
    color_code: 'VELVET-ROYAL-BLUE-NVY90',
    batch_number: 'BATCH-2026-24-0BB73',
    installation_notes: 'التركيب في الدور الثالث (يوجد أسانسير). التأكد من استواء الأرضية وضبط مفصلات Blum هيدروليك.',
    created_at: '2026-10-15T11:00:00Z',
  },
  {
    id: 'det-2',
    job_order_id: 'ord-2',
    dimensions_cm: 'الكنبة الكبيرة: 220 × 90 × 95 سم | الفوتيه: 90 × 85 × 95 سم | الطاولة: 120 × 70 × 50 سم',
    wood_type: 'خشب زان أحمر روماني محفور يدوياً + ورق ذهب فرنسي عيار 24',
    paint_details: 'تذهيب رقائق الذهب الإيطالي على أرضية دهان لاكيه بني أوانس مغسول',
    fabric_source: 'المستورد - النجار ديزاين فاخر',
    color_code: 'EMERALD-GREEN-VELVET-EG04',
    batch_number: 'BATCH-2026-EG-991',
    installation_notes: 'تثبيت الأرجل المحفورة بحرص واستخدام واقيات أكريليك للأرضيات الباركية.',
    created_at: '2026-10-20T15:30:00Z',
  },
  {
    id: 'det-3',
    job_order_id: 'ord-3',
    dimensions_cm: 'طاولة السفرة: 240 × 110 × 78 سم | البوفيه: 200 × 50 × 90 سم | الكرسي: 50 × 50 × 95 سم',
    wood_type: 'خشب أرو أمريكي مشجر + قشرة جوز طبيعي إيطالي',
    paint_details: 'دهان بولي أوريثان شفاف هاردنر حماية للأرو الطبيعي مع إظهار ثمار الخشب',
    fabric_source: 'وارد العميل - أقمشة القماش الملكي',
    color_code: 'BEIGE-TEXTILE-BG-12',
    batch_number: 'BATCH-2026-TXT-55',
    installation_notes: 'توصيل إضاءة LED البوفيه بمخرج كهرباء خلفي محمي مع مفتاح لمس خفي.',
    created_at: '2026-11-01T10:00:00Z',
  },
];

export const initialAttachments: Attachment[] = [
  {
    id: 'att-1',
    job_order_id: 'ord-1',
    file_type: 'drawing',
    file_url: '/src/assets/images/bedroom_cad_drawing_1793738336612.jpg',
    title: 'الرسم الهندسي المعتمد - قطاعات غرفة النوم والتقسيم الداخلي (CAD)',
    description: 'رسم تنفيذي موضح به مقاسات الأرفف والشماعات ومكان إضاءة الـ LED',
    uploaded_at: '2026-10-15T11:30:00Z',
  },
  {
    id: 'att-2',
    job_order_id: 'ord-1',
    file_type: 'fabric_sample',
    file_url: '/src/assets/images/fabric_sample_swatch_1793738336334.jpg',
    title: 'كرت عينة القماش - قطيفة كحلي ملحق برقم الـ Batch',
    description: 'كارت عينة القماش المعتمد من العميل مع درجة اللون كحلي ملكي BATCH-2026-24-0BB73',
    uploaded_at: '2026-10-15T11:35:00Z',
  },
  {
    id: 'att-3',
    job_order_id: 'ord-2',
    file_type: '3d_render',
    file_url: '/src/assets/images/living_room_3d_render_1793738336721.jpg',
    title: 'صورة 3D Render لطقم الصالون الكلاسيك باللون الأخضر الزمردي',
    description: 'تصميم ثلاثي الأبعاد معتمد يوضح الحفر والتذهيب على خشب الجوز والزان',
    uploaded_at: '2026-10-20T16:00:00Z',
  },
];

export function getPopulatedOrders(
  orders: JobOrder[] = initialOrders,
  customers: Customer[] = initialCustomers,
  details: JobDetail[] = initialDetails,
  attachments: Attachment[] = initialAttachments
): JobOrderPopulated[] {
  return orders.map((ord) => ({
    ...ord,
    customer: customers.find((c) => c.id === ord.customer_id),
    job_details: details.find((d) => d.job_order_id === ord.id),
    attachments: attachments.filter((a) => a.job_order_id === ord.id),
  }));
}
