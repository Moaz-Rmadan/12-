import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initialCustomers,
  initialOrders,
  initialDetails,
  initialAttachments,
  getPopulatedOrders,
} from '../data/mockData';
import {
  buildRepairedBaselineOrderUpdate,
  buildRepairedBaselineCustomerUpdate,
} from '../utils/baselineSync';

const PUBLIC_ROOT = path.resolve(process.cwd(), 'public');
const IMAGE_URL_REGEX = /\.(jpe?g|png|webp|pdf)$/i;

test('customers, orders, details, and attachments have unique IDs and unique order numbers', () => {
  const customerIds = new Set<string>();
  const customerPhones = new Set<string>();
  for (const c of initialCustomers) {
    assert.ok(c.id, 'Customer must have an id');
    assert.equal(customerIds.has(c.id), false, `Duplicate customer id: ${c.id}`);
    customerIds.add(c.id);

    const normalizedPhone = (c.phone || '').trim();
    assert.ok(normalizedPhone.length > 0, `Customer ${c.id} (${c.name}) must have a non-empty phone`);
    assert.equal(
      customerPhones.has(normalizedPhone),
      false,
      `Duplicate customer phone ${normalizedPhone} on ${c.id} (${c.name})`
    );
    customerPhones.add(normalizedPhone);
  }

  const orderIds = new Set<string>();
  const orderNumbers = new Set<string>();
  for (const o of initialOrders) {
    assert.ok(o.id, 'Order must have an id');
    assert.equal(orderIds.has(o.id), false, `Duplicate order id: ${o.id}`);
    orderIds.add(o.id);

    assert.ok(o.order_number, `Order ${o.id} must have an order_number`);
    assert.equal(orderNumbers.has(o.order_number), false, `Duplicate order_number: ${o.order_number}`);
    orderNumbers.add(o.order_number);
  }

  const detailIds = new Set<string>();
  for (const d of initialDetails) {
    assert.ok(d.id, 'Detail must have an id');
    assert.equal(detailIds.has(d.id), false, `Duplicate detail id: ${d.id}`);
    detailIds.add(d.id);
  }

  const attachmentIds = new Set<string>();
  for (const a of initialAttachments) {
    assert.ok(a.id, 'Attachment must have an id');
    assert.equal(attachmentIds.has(a.id), false, `Duplicate attachment id: ${a.id}`);
    attachmentIds.add(a.id);
  }
});

test('every job order resolves a valid customer, has job details, and has >= 1 existing image attachment', () => {
  const populated = getPopulatedOrders();
  assert.equal(populated.length, initialOrders.length);
  assert.ok(populated.length >= 88, `Expected >= 88 verified orders, got ${populated.length}`);

  for (const order of populated) {
    assert.ok(order.customer, `Order ${order.id} missing resolved customer (${order.customer_id})`);
    assert.notEqual(
      order.customer.name,
      'عميل غير مسجل',
      `Order ${order.id} resolved fallback unknown customer (${order.customer_id})`
    );
    assert.ok(order.job_details, `Order ${order.id} missing job_details`);

    const orderAtts = order.attachments || [];
    assert.ok(orderAtts.length >= 1, `Order ${order.id} has zero attachments`);

    const imageAtts = orderAtts.filter((a) => IMAGE_URL_REGEX.test(a.file_url));
    assert.ok(imageAtts.length >= 1, `Order ${order.id} must have >= 1 renderable image attachment`);
  }
});

test('every attachment file_url uses /assets/aistudio/ without /public/ or ellipsis and exists on disk', () => {
  for (const att of initialAttachments) {
    assert.ok(
      att.file_url.startsWith('/assets/aistudio/'),
      `Attachment ${att.id} (${att.job_order_id}) has invalid prefix: ${att.file_url}`
    );
    assert.equal(att.file_url.includes('/public/'), false, `Attachment ${att.id} contains /public/: ${att.file_url}`);
    assert.equal(att.file_url.includes('...'), false, `Attachment ${att.id} contains '...': ${att.file_url}`);

    const relativeDiskPath = att.file_url.replace(/^\/+/, '');
    const absoluteDiskPath = path.join(PUBLIC_ROOT, relativeDiskPath);
    assert.equal(
      fs.existsSync(absoluteDiskPath),
      true,
      `Attachment ${att.id} (${att.job_order_id}) file does not exist on disk: ${absoluteDiskPath}`
    );
    const stat = fs.statSync(absoluteDiskPath);
    assert.ok(stat.size > 0, `Attachment ${att.id} file is empty on disk: ${absoluteDiskPath}`);
  }
});

test('multi-order customers have distinct primary sheets per order and critical PDF attributions match', () => {
  const populated = getPopulatedOrders();
  const byId = new Map(populated.map((o) => [o.id, o]));

  const multiOrderCustomers = [
    'cust-salma',
    'cust-mohamed-shaban',
    'cust-makarios-gabra',
    'cust-mohamed-gamal',
    'cust-azza-mahmoud',
    'cust-youssef-hussein',
    'cust-mohamed-tarek',
    'cust-talaat',
    'cust-sherif-kamal',
    'cust-sameh-fawzy',
    'cust-rawya-eissa',
    'cust-m-othman',
    'cust-medhat-aboujabal',
    'cust-adeeb-janat',
    'cust-mazen-behnsawy',
    'cust-ahmed-taleb',
  ];

  for (const custId of multiOrderCustomers) {
    const orders = populated.filter((o) => o.customer_id === custId);
    assert.ok(orders.length >= 2, `Expected >= 2 orders for ${custId}, got ${orders.length}`);

    const primaryImageUrls = new Set<string>();
    for (const o of orders) {
      const firstImage = (o.attachments || []).find((a) => IMAGE_URL_REGEX.test(a.file_url));
      assert.ok(firstImage, `Order ${o.id} for ${custId} missing primary image attachment`);
      assert.equal(
        primaryImageUrls.has(firstImage.file_url),
        false,
        `Customer ${custId} shares duplicate primary image URL ${firstImage.file_url} across multiple orders`
      );
      primaryImageUrls.add(firstImage.file_url);
    }
  }

  // Spot-check forensic attributions from user reports & PDF splits
  const mgamalOrders = populated.filter((o) => o.customer_id === 'cust-mohamed-gamal');
  assert.equal(mgamalOrders.length, 2, 'محمد جمال عثمان must have exactly 2 distinct orders');
  assert.ok(byId.get('ord-mgamal-1')?.job_details?.fabric_source?.includes('رقم 8'));
  assert.ok(byId.get('ord-mgamal-2')?.job_details?.fabric_source?.includes('رقم 5'));

  const makariosOrders = populated.filter((o) => o.customer_id === 'cust-makarios-gabra');
  assert.equal(makariosOrders.length, 3, 'مكاريوس جبرة رزق الله must have 3 cleanly separated orders');

  assert.ok(
    byId.get('ord-azza-mahmoud-3')?.attachments?.some((a) => a.file_url.includes('azza_makkah_page_01')),
    'عزة محمود حسن شبابي مكة must attach azza_makkah_page_*'
  );
  assert.ok(
    byId.get('ord-youssef-1')?.attachments?.some((a) => a.file_url.includes('youssef_dining_page_01')),
    'يوسف حسين صالح سفرة شجرة must attach youssef_dining_page_*'
  );
  assert.ok(
    byId.get('ord-youssef-2')?.attachments?.some((a) => a.file_url.includes('youssef_roma_page_01')),
    'يوسف حسين صالح نوم روما must attach youssef_roma_page_*'
  );
  assert.ok(
    byId.get('ord-mostafa-kamal-1')?.attachments?.some((a) => a.file_url.includes('mostafa_kamal_page_01')),
    'مصطفى كمال الدين must attach mostafa_kamal_page_01.jpg'
  );
  assert.ok(
    byId.get('ord-mshaban-4')?.attachments?.some((a) => a.file_url.includes('shaban_shoe_page_01')),
    'محمد شعبان جزامة must attach shaban_shoe_page_01.jpg'
  );
  assert.ok(
    byId.get('ord-salma-2')?.general_specs.includes('6 كرسي'),
    'ord-salma-2 must specify 6 كرسي matching Salma PDF page 4'
  );
  assert.ok(
    byId.get('ord-zeinab-1')?.job_details?.paint_details?.includes('اغمق درجتين'),
    'ord-zeinab-1 must reflect updated paint_details (اغمق درجتين)'
  );
});

test('buildRepairedBaselineOrderUpdate repairs broken/stale baseline records and preserves live workflow state', () => {
  const populated = getPopulatedOrders();
  const baseline = populated.find((o) => o.id === 'ord-salma-2');
  assert.ok(baseline);

  // 1. Existing doc matches baseline -> no repair needed
  assert.equal(buildRepairedBaselineOrderUpdate(baseline, baseline, '2026-10-01T00:00:00Z'), null);

  // 2. Existing doc has broken URL, empty attachments, or PDF-only stale attachments -> repairs safely
  const staleDoc = {
    ...baseline,
    status: 'تم التنفيذ' as const,
    current_stage: 'كابينة دوكو' as const,
    is_archived: true,
    total_price: 99000,
    deposit_paid: 50000,
    general_specs: 'طقم سفرة 8 كراسي',
    attachments: [
      {
        id: 'att-old',
        job_order_id: 'ord-salma-2',
        file_type: 'drawing' as const,
        file_url: '/public/assets/aistudio/...broken.jpeg',
        title: 'old',
        uploaded_at: '2026-09-01T00:00:00Z',
      },
    ],
    job_details: undefined,
  };

  const repair = buildRepairedBaselineOrderUpdate(staleDoc, baseline, '2026-10-02T00:00:00Z');
  assert.ok(repair);
  assert.equal(repair.attachments?.length, baseline.attachments?.length);
  assert.deepEqual(repair.job_details, baseline.job_details);
  assert.equal(repair.general_specs, baseline.general_specs);
  // Must NOT overwrite live status/stage/archive/financial fields
  assert.equal('status' in repair, false);
  assert.equal('current_stage' in repair, false);
  assert.equal('is_archived' in repair, false);
  assert.equal('total_price' in repair, false);
  assert.equal('deposit_paid' in repair, false);

  // 3. Custom user-edited details and custom attachments with valid URLs are preserved
  const userEditedDoc = {
    ...baseline,
    job_details: {
      ...baseline.job_details!,
      id: 'det-1790000000000',
      paint_details: 'دهان خاص حسب طلب العميل',
    },
    attachments: [
      {
        id: 'att-1790000000000-0',
        job_order_id: 'ord-salma-2',
        file_type: 'drawing' as const,
        file_url: '/assets/aistudio/pages/salma_page_04.jpg',
        title: 'مرفق مخصص',
        uploaded_at: '2026-10-01T00:00:00Z',
      },
    ],
  };

  const userEditRepair = buildRepairedBaselineOrderUpdate(userEditedDoc, baseline, '2026-10-02T00:00:00Z');
  assert.equal(userEditRepair, null);

  // 4. Key-order invariance (Firestore returns map keys alphabetically)
  const reorderedKeysDetails = Object.fromEntries(
    Object.entries(baseline.job_details!).sort(([a], [b]) => b.localeCompare(a))
  ) as typeof baseline.job_details;
  const reorderedDoc = {
    ...baseline,
    job_details: reorderedKeysDetails,
  };
  assert.equal(buildRepairedBaselineOrderUpdate(reorderedDoc, baseline, '2026-10-02T00:00:00Z'), null);
});

test('buildRepairedBaselineCustomerUpdate repairs empty/shared placeholder phones and preserves custom phones', () => {
  const baselineCust = initialCustomers.find((c) => c.id === 'cust-mohamed-gamal')!;
  assert.ok(baselineCust);

  const staleShared = { ...baselineCust, phone: '01011223344' };
  const repair = buildRepairedBaselineCustomerUpdate(staleShared, baselineCust, '2026-10-02T00:00:00Z');
  assert.deepEqual(repair, { phone: baselineCust.phone, updated_at: '2026-10-02T00:00:00Z' });

  const customPhone = { ...baselineCust, phone: '01099998888' };
  assert.equal(buildRepairedBaselineCustomerUpdate(customPhone, baselineCust, '2026-10-02T00:00:00Z'), null);
});
