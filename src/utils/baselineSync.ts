import { Customer, JobOrderPopulated } from '../types';

const isImageAttachmentUrl = (url: string): boolean => /\.(jpe?g|png|webp)$/i.test(url || '');

const isBrokenAttachmentUrl = (url: string): boolean => {
  const trimmed = (url || '').trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/public/')) return true;
  if (trimmed.includes('...')) return true;
  if (!trimmed.startsWith('/assets/') && !trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
    return true;
  }
  return false;
};

/**
 * Canonical JSON serialization invariant to object key insertion order
 * (Firestore returns map keys sorted alphabetically rather than insertion order)
 * and stripping undefined properties to match persisted Firestore JSON.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/**
 * Pure helper to determine whether an existing Firestore baseline document needs
 * non-destructive repair of attachments, job_details, or baseline specs without
 * overwriting live operational status, stage, archive flag, or financials.
 */
export function buildRepairedBaselineOrderUpdate(
  existingDoc: Partial<JobOrderPopulated> | undefined,
  baselineOrder: JobOrderPopulated,
  nowIso: string = new Date().toISOString()
): Partial<JobOrderPopulated> | null {
  if (!existingDoc) return null;

  const updates: Partial<JobOrderPopulated> = {};
  const existingAtts = Array.isArray(existingDoc.attachments) ? existingDoc.attachments : [];
  const baselineAtts = Array.isArray(baselineOrder.attachments) ? baselineOrder.attachments : [];

  const hasCustomUserAttachments = existingAtts.some((a) => /^att-\d{13}/.test(a.id || ''));
  const hasAnyBrokenUrl = existingAtts.some((a) => isBrokenAttachmentUrl(a.file_url));

  const existingImageCount = existingAtts.filter((a) => isImageAttachmentUrl(a.file_url)).length;
  const baselineImageCount = baselineAtts.filter((a) => isImageAttachmentUrl(a.file_url)).length;

  const existingUrlSignature = existingAtts.map((a) => a.file_url).join('|');
  const baselineUrlSignature = baselineAtts.map((a) => a.file_url).join('|');

  const needsAttachmentRepair =
    baselineAtts.length > 0 &&
    (hasAnyBrokenUrl ||
      existingAtts.length === 0 ||
      (!hasCustomUserAttachments &&
        (existingImageCount < baselineImageCount || existingUrlSignature !== baselineUrlSignature)));

  if (needsAttachmentRepair) {
    updates.attachments = JSON.parse(JSON.stringify(baselineAtts));
  }

  const isCustomUserEditedDetails =
    Boolean(existingDoc.job_details?.id) &&
    /^det-\d{13}/.test(existingDoc.job_details?.id || '');

  const needsDetailsRepair =
    Boolean(baselineOrder.job_details) &&
    !isCustomUserEditedDetails &&
    (!existingDoc.job_details ||
      stableStringify(existingDoc.job_details) !== stableStringify(baselineOrder.job_details));

  if (needsDetailsRepair && baselineOrder.job_details) {
    updates.job_details = JSON.parse(JSON.stringify(baselineOrder.job_details));
  }

  if (
    !isCustomUserEditedDetails &&
    existingDoc.general_specs !== baselineOrder.general_specs &&
    (!existingDoc.general_specs || existingDoc.id === 'ord-salma-2')
  ) {
    updates.general_specs = baselineOrder.general_specs;
  }

  if (
    baselineOrder.customer &&
    (!existingDoc.customer ||
      existingDoc.customer.phone === '' ||
      (existingDoc.customer.phone === '01011223344' &&
        baselineOrder.customer.phone !== '01011223344'))
  ) {
    updates.customer = JSON.parse(JSON.stringify(baselineOrder.customer));
  }

  if (Object.keys(updates).length === 0) {
    return null;
  }

  updates.updated_at = nowIso;
  return updates;
}

const SHARED_LEGACY_PLACEHOLDER_PHONES = new Set(['', '01011223344']);

/**
 * Pure helper to repair empty or shared placeholder customer phones in Firestore
 * without overwriting real customer updates.
 */
export function buildRepairedBaselineCustomerUpdate(
  existingCustomer: Partial<Customer> | undefined,
  baselineCustomer: Customer,
  nowIso: string = new Date().toISOString()
): Partial<Customer> | null {
  if (!existingCustomer) return null;

  const existingPhone = (existingCustomer.phone || '').trim();
  if (
    SHARED_LEGACY_PLACEHOLDER_PHONES.has(existingPhone) &&
    baselineCustomer.phone !== existingPhone
  ) {
    return {
      phone: baselineCustomer.phone,
      updated_at: nowIso,
    };
  }

  return null;
}
