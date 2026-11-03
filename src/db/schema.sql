-- ==============================================================================
-- SQL DATABASE SCHEMA: EL-NAGGAR DESIGN JOB ORDER MANAGEMENT SYSTEM
-- نظام إدارة أوامر الشغل - مصنع النجار ديزاين للأثاث
-- Compatible with PostgreSQL (Supabase / Cloud SQL) & SQLite
-- ==============================================================================

-- 1. Create Enum Types for Statuses and Attachment Types (PostgreSQL / Supabase)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE order_status_enum AS ENUM ('قيد التشغيل', 'تم التنفيذ', 'تسليم');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_type_enum') THEN
        CREATE TYPE attachment_type_enum AS ENUM ('drawing', 'fabric_sample', '3d_render', 'other');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLE: customers (جدول العملاء)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS 'جدول بيانات العملاء وبيانات الاتصال والشيء المسند إليهم';
COMMENT ON COLUMN customers.id IS 'المعرف الفريد للعميل';
COMMENT ON COLUMN customers.name IS 'اسم العميل ثلاثي أو رباعي';
COMMENT ON COLUMN customers.phone IS 'رقم الهاتف الرئيسي للتواصل أو المتابعة';
COMMENT ON COLUMN customers.address IS 'عنوان التسليم والتركيب التفصيلي';

-- ------------------------------------------------------------------------------
-- 3. TABLE: job_orders (جدول أوامر الشغل)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) NOT NULL UNIQUE, -- مثال: JO-2026-101
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    room_model_code VARCHAR(100) NOT NULL, -- كود الغرفة / الموديل
    contract_date DATE NOT NULL, -- تاريخ التعاقد
    delivery_date DATE NOT NULL, -- تاريخ الاستلام
    general_specs TEXT, -- المواصفات العامة للطلب
    status order_status_enum NOT NULL DEFAULT 'قيد التشغيل', -- حالة الطلب: (قيد التشغيل، تم التنفيذ، تسليم)
    total_price DECIMAL(12, 2) DEFAULT 0.00, -- إجمالي سعر التعاقد
    deposit_paid DECIMAL(12, 2) DEFAULT 0.00, -- المقدم / المدفوع
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE job_orders IS 'جدول أوامر الشغل الرئيسية، تاريخ التعاقد والتسليم والحالة الحالية';
COMMENT ON COLUMN job_orders.order_number IS 'رقم الأمر المرجعي بالمصنع مثل JO-2026-101';
COMMENT ON COLUMN job_orders.customer_id IS 'رابط العميل صاحب الأمر (Foreign Key)';
COMMENT ON COLUMN job_orders.room_model_code IS 'كود الغرفة أو اسم الموديل المطلوبة بالمصنع';
COMMENT ON COLUMN job_orders.contract_date IS 'تاريخ تحرير العقد والتصميم';
COMMENT ON COLUMN job_orders.delivery_date IS 'التاريخ المعتمد للتركيب أو التسليم للعميل';
COMMENT ON COLUMN job_orders.general_specs IS 'الوصف العام للغرفة والأثاث المطلوبة';
COMMENT ON COLUMN job_orders.status IS 'حالة الأمر الحالية: قيد التشغيل / تم التنفيذ / تسليم';

-- ------------------------------------------------------------------------------
-- 4. TABLE: job_details (جدول تفاصيل الورش والتشغيل)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID NOT NULL UNIQUE REFERENCES job_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    dimensions_cm TEXT NOT NULL, -- المقاسات التفصيلية بالسم (العرض × الارتفاع × العمق)
    wood_type VARCHAR(255) DEFAULT 'خشب زان أحمر', -- نوع الخشب المعتمد
    paint_details TEXT NOT NULL, -- تفاصيل دهان الورشة (أستر، دوكو، بولي يوريثان، تذهيب)
    fabric_source VARCHAR(255) NOT NULL, -- مصدر القماش (اسم المورد أو وارد العميل)
    color_code VARCHAR(100) NOT NULL, -- كود اللون المطلوب للتنجيد
    batch_number VARCHAR(100) NOT NULL, -- رقم الـ Batch للطبخة والقماش لتجنب اختلاف الألوان
    installation_notes TEXT, -- ملاحظات التركيب والموقع (دور، أسانسير، قواعد ستانلس)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE job_details IS 'جدول تفاصيل الورش، المقاسات الدقيقة للنجارين، الدهان والتنجيد';
COMMENT ON COLUMN job_details.dimensions_cm IS 'المقاسات والتصاميم الهيكلية بالسم لقطع الأثاث';
COMMENT ON COLUMN job_details.paint_details IS 'نوع ونسبة وشكل دهانات الورشة';
COMMENT ON COLUMN job_details.fabric_source IS 'مصدر أقمشة التنجيد والمورد المعتمد';
COMMENT ON COLUMN job_details.color_code IS 'كود لون القماش من كارت العينة';
COMMENT ON COLUMN job_details.batch_number IS 'رقم تشغيلة القماش Batch Number لضمان تجانس اللون';
COMMENT ON COLUMN job_details.installation_notes IS 'تعليمات وقواعد الفنيين في موقع التركيب';

-- ------------------------------------------------------------------------------
-- 5. TABLE: attachments (جدول المرفقات وكروت العينات)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    file_type attachment_type_enum NOT NULL DEFAULT 'drawing', -- drawing, fabric_sample, 3d_render, other
    file_url TEXT NOT NULL, -- رابط صورة الرسم الهيكلي أو كارت العينة
    title VARCHAR(255) NOT NULL, -- عنوان المرفق
    description TEXT, -- شرح أو تفاصيل إضافية للمرفق
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE attachments IS 'جدول المرفقات، الرسومات الهيكلية CAD ورسومات الـ 3D وكروت عينات القماش';
COMMENT ON COLUMN attachments.file_type IS 'نوع المرفق: drawing (رسم هيكلي), fabric_sample (كرت عينة قماش), 3d_render (رندر 3D)';
COMMENT ON COLUMN attachments.file_url IS 'رابط الصورة المرفقة المخزنة بالسيرفر أو CDN';

-- ------------------------------------------------------------------------------
-- 6. INDEXES (الفهارس لتحسين سرعة الاستعلامات)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_job_orders_customer ON job_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_order_number ON job_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_job_details_job_order ON job_details(job_order_id);
CREATE INDEX IF NOT EXISTS idx_attachments_job_order ON attachments(job_order_id);

-- ------------------------------------------------------------------------------
-- 7. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_job_orders_updated_at ON job_orders;
CREATE TRIGGER set_job_orders_updated_at
BEFORE UPDATE ON job_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- SEED DATA STATEMENT (بيانات أولية اختبارية)
-- ==============================================================================
INSERT INTO customers (id, name, phone, address) VALUES
('11111111-1111-1111-1111-111111111111', 'المهندس أحمد عبد العزيز', '01001234567', 'القاهرة - التجمع الخامس - حي النرجس فيلا 14'),
('22222222-2222-2222-2222-222222222222', 'الدكتورة منى فاروق', '01119876543', 'الجيزة - الشيخ زايد - كمبوند السليمانية')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO job_orders (id, order_number, customer_id, room_model_code, contract_date, delivery_date, general_specs, status, total_price, deposit_paid) VALUES
('a1111111-1111-1111-1111-111111111111', 'JO-2026-101', '11111111-1111-1111-1111-111111111111', 'RM-BED-MASTER-09', '2026-10-15', '2026-11-20', 'غرفة نوم رئيسية مودرن (سرير كابوتونيه + دولاب 6 ضلفة هيدروليك + 2 كومودينو)', 'قيد التشغيل', 185000.00, 100000.00),
('a2222222-2222-2222-2222-222222222222', 'JO-2026-102', '22222222-2222-2222-2222-222222222222', 'SAL-ROYAL-GREEN-04', '2026-10-20', '2026-11-10', 'طقم صالون كلاسيك مذهب وخشب جوز طبيعي (كنبة ثلاثية + كنبة ثنائية + 2 فوتيه)', 'تم التنفيذ', 145000.00, 145000.00)
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO job_details (job_order_id, dimensions_cm, wood_type, paint_details, fabric_source, color_code, batch_number, installation_notes) VALUES
('a1111111-1111-1111-1111-111111111111', 'الدولاب: 320 × 230 × 65 سم | السرير: 180 × 200 سم', 'خشب زان أحمر روماني مكفوف + كونتر بلي وود إسباني 18 مم', 'دهان أستر بني جوز طبيعي مع طبقة بولي يوريثان مط', 'وكالة النحاس للأقمشة - قطيفة إيطالي', 'VELVET-ROYAL-BLUE-NVY90', 'BATCH-2026-24-0BB73', 'التركيب في الدور الثالث، التثبيت بمفصلات بلوم هيدروليك'),
('a2222222-2222-2222-2222-222222222222', 'الكنبة الكبيرة: 220 × 90 × 95 سم | الفوتيه: 90 × 85 × 95 سم', 'خشب زان أحمر محفور يدوياً + ورق ذهب', 'تذهيب رقائق الذهب الإيطالي على أرضية بني', 'النجار ديزاين - فاخر', 'EMERALD-GREEN-VELVET-EG04', 'BATCH-2026-EG-991', 'تثبيت الأرجل بحرص مع واقيات أكريليك للأرضيات الباركية')
ON CONFLICT (job_order_id) DO NOTHING;
