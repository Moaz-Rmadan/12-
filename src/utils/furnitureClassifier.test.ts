import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrderCategory, FurnitureCategory } from './furnitureClassifier';
import { JobOrderPopulated } from '../types';

function createMockOrder(model: string, specs: string, notes = ''): JobOrderPopulated {
  return {
    id: 'test-1',
    order_number: 'JO-TEST-01',
    customer_id: 'cust-1',
    room_model_code: model,
    contract_date: '2026-11-01',
    delivery_date: '2026-11-20',
    general_specs: specs,
    status: 'قيد التشغيل',
    current_stage: 'نجارة عفش',
    total_price: 50000,
    deposit_paid: 20000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    job_details: {
      id: 'det-1',
      job_order_id: 'test-1',
      dimensions_cm: '180x200',
      wood_type: 'زان',
      paint_details: 'دوكو',
      fabric_source: 'المصنع',
      color_code: 'C-01',
      batch_number: 'B-10',
      installation_notes: notes,
      created_at: new Date().toISOString(),
    },
    attachments: [],
  };
}

test('classifies lazy boy recliner correctly', () => {
  const order = createMockOrder('كرسي مريح', 'كرسي ليزي بوي جلد كابتونيه');
  assert.equal(getOrderCategory(order), 'lazy_boy');
});

test('classifies shoe cabinet and consoles correctly', () => {
  const order = createMockOrder('جزامة مدخل مودرن', 'خشب ام دي اف مع مرايا');
  assert.equal(getOrderCategory(order), 'shoe_cabinet');
});

test('classifies corner sofa correctly', () => {
  const order = createMockOrder('ركنة جاكوار حرف L', 'تنجيد قماش قطيفة رمادي');
  assert.equal(getOrderCategory(order), 'corner_sofa');
});

test('classifies dining room correctly', () => {
  const order = createMockOrder('سفرة جلاكسي 8 كراسي', 'طاولة سفرة خشب زان وبوفيه');
  assert.equal(getOrderCategory(order), 'dining_room');
});

test('classifies master bedroom correctly', () => {
  const order = createMockOrder('غرفة نوم كينج ماستر', 'سرير 180 ودولاب جرار وتسريحة');
  assert.equal(getOrderCategory(order), 'master_bedroom');
});
