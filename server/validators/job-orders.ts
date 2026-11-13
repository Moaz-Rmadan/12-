import { z } from 'zod';

/**
 * =============================================================================
 * AL-NAJJAR DESIGN — JOB ORDERS VALIDATION SCHEMAS (PHASE 3.1)
 * =============================================================================
 * Strict Zod schemas enforcing the authoritative Phase 3C / Phase 4B security contract.
 * - Every request schema uses .strict() to reject unknown and forbidden fields.
 * - Privilege escalation guard: Rejects status, financial fields, and version from unauthorized callers.
 * - All new orders must start with status: 'Draft' (enforced on backend, not client-selectable).
 */

// -----------------------------------------------------------------------------
// Approved Technical Domain Constants
// -----------------------------------------------------------------------------

export const APPROVED_TECHNICAL_ROLES = [
  'admin',
  'accounting',
  'operations',
  'sales',
] as const;

export const APPROVED_ORDER_STATUSES = [
  'Draft',
  'قيد التشغيل',
  'تم التنفيذ',
  'تسليم',
] as const;

export const APPROVED_PRODUCTION_STAGES = [
  'لم يبدأ',
  'نجارة عفش',
  'نجارة انتريهات',
  'خدمة وتجهيز',
  'كابينة أستر',
  'كابينة دوكو',
  'تنجيد',
  'تشطيب وتغليف',
  'جاهز للتسليم',
] as const;

export const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// -----------------------------------------------------------------------------
// Component A.1: Sales Job Order Creation Schema
// -----------------------------------------------------------------------------
/**
 * Strict allowlist for Sales Create:
 * Allowed:
 *  - customer_id: string
 *  - room_model_code: string
 *  - contract_date: string (YYYY-MM-DD)
 *  - delivery_date: string (YYYY-MM-DD)
 *  - general_specs: string
 *
 * Forbidden (Strictly rejected via .strict()):
 *  - order_number (Generated exclusively by backend atomic service)
 *  - status (Always initialized to 'Draft' by backend)
 *  - total_price, deposit_paid (Financial fields forbidden to sales creation)
 *  - current_stage, stage_updated_at (Production fields forbidden to sales)
 *  - version (Managed exclusively by backend optimistic locking)
 *  - is_archived, created_at, updated_at
 *  - job_details, attachments, embedded customer (Not in approved sales allowlist)
 */
export const salesJobOrderCreateSchema = z
  .object({
    customer_id: z
      .string()
      .min(1, 'معرف العميل مطلوب (Customer ID is required)')
      .max(128, 'معرف العميل يتجاوز الحد المسموح'),

    room_model_code: z
      .string()
      .min(1, 'كود الموديل مطلوب (Room model code is required)')
      .max(200, 'كود الموديل يتجاوز الحد المسموح'),

    contract_date: z
      .string()
      .regex(DATE_ISO_REGEX, 'صيغة تاريخ التعاقد غير صحيحة، يجب أن تكون YYYY-MM-DD'),

    delivery_date: z
      .string()
      .regex(DATE_ISO_REGEX, 'صيغة تاريخ التسليم غير صحيحة، يجب أن تكون YYYY-MM-DD'),

    general_specs: z
      .string()
      .min(1, 'المواصفات العامة مطلوبة (General specifications are required)')
      .max(4000, 'المواصفات العامة تتجاوز الحد الأقصى (4000 حرف)'),
  })
  .strict();

export type SalesJobOrderCreateInput = z.infer<typeof salesJobOrderCreateSchema>;

// -----------------------------------------------------------------------------
// Component A.2: Sales Job Order Update Schema (Draft Mode Only)
// -----------------------------------------------------------------------------
/**
 * Strict allowlist for Sales Update:
 * Allowed:
 *  - expectedVersion: number (Required for optimistic concurrency)
 *  - room_model_code: optional string
 *  - general_specs: optional string
 *  - delivery_date: optional string (YYYY-MM-DD)
 *
 * Forbidden:
 *  - status, total_price, deposit_paid, current_stage, order_number, etc.
 *
 * Validation Rule:
 *  - At least one updatable field must be provided besides expectedVersion.
 *  - Draft status verification is enforced by the backend service.
 */
export const salesJobOrderUpdateSchema = z
  .object({
    expectedVersion: z
      .number()
      .int('رقم الإصدار يجب أن يكون عدداً صحيحاً')
      .positive('رقم الإصدار المتوقع مطلوب وموجب (Expected version is required)'),

    room_model_code: z
      .string()
      .min(1, 'كود الموديل لا يمكن أن يكون فارغاً')
      .max(200, 'كود الموديل يتجاوز الحد المسموح')
      .optional(),

    general_specs: z
      .string()
      .min(1, 'المواصفات العامة لا يمكن أن تكون فارغة')
      .max(4000, 'المواصفات العامة تتجاوز الحد الأقصى')
      .optional(),

    delivery_date: z
      .string()
      .regex(DATE_ISO_REGEX, 'صيغة تاريخ التسليم غير صحيحة، يجب أن تكون YYYY-MM-DD')
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.room_model_code !== undefined ||
      data.general_specs !== undefined ||
      data.delivery_date !== undefined,
    {
      message: 'يجب تقديم حقل واحد على الأقل للتعديل (At least one updatable field must be provided)',
      path: ['room_model_code'],
    }
  );

export type SalesJobOrderUpdateInput = z.infer<typeof salesJobOrderUpdateSchema>;

// -----------------------------------------------------------------------------
// Component A.3: Job Order Route Parameter Schema
// -----------------------------------------------------------------------------
export const jobOrderIdParamSchema = z
  .object({
    id: z
      .string()
      .min(3, 'معرف أمر الشغل غير صالح (Invalid job order ID)')
      .max(128, 'معرف أمر الشغل يتجاوز الحد المسموح')
      .regex(/^[a-zA-Z0-9_\-]+$/, 'معرف أمر الشغل يحتوي على رموز غير مسموحة'),
  })
  .strict();

export type JobOrderIdParam = z.infer<typeof jobOrderIdParamSchema>;
