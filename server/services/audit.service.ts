import admin from 'firebase-admin';
import { getFirebaseFirestore } from '../lib/firebase-admin';
import { AuthenticatedUser } from '../types/auth';
import { sanitizeLogData } from '../logging/logger';
import { InternalServerError, ValidationError } from '../errors/app-error';

/**
 * =============================================================================
 * AL-NAJJAR DESIGN — SERVER-SIDE AUDIT LOGGING SERVICE (PHASE 3.1)
 * =============================================================================
 * Append-only immutable audit logger for security, authorization, and financial events.
 *
 * Requirements & Boundaries:
 * 1. Collection: 'audit_logs'
 * 2. Immutable: Read and Append ONLY. No update or delete methods exist or are exposed.
 * 3. Trusted Identity: Actor UID, email, and role are strictly derived from
 *    the authenticated backend user context (`AuthenticatedUser`), NEVER from client request bodies.
 * 4. Deep Redaction: Redacts passwords, tokens, API keys, credentials, and connection strings.
 * 5. Server Timestamp: Employs FieldValue.serverTimestamp() for authoritative time.
 * 6. Minimal Deltas: Prevents dumping entire monolithic documents into metadata.
 * 7. Transaction Integration: Supports embedding inside an ongoing business transaction
 *    so audit log and entity mutation commit atomically together.
 */

export const AUDIT_LOGS_COLLECTION = 'audit_logs';

export type AuditEntityType = 'job_order' | 'user' | 'customer' | 'manifest' | 'auth';

export interface AuditEventParams {
  actor: AuthenticatedUser;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  reason?: string;
  approvalReference?: string;
  metadata?: Record<string, any> | null;
}

export interface StoredAuditEvent {
  user_uid: string;
  user_email: string;
  user_role: string;
  action: string;
  entity_type: AuditEntityType;
  entity_id: string;
  timestamp: admin.firestore.FieldValue | string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  reason: string;
  approval_reference: string;
  metadata: Record<string, any> | null;
}

/**
 * Prepare and sanitize an audit event document payload
 */
export function buildSanitizedAuditPayload(params: AuditEventParams): StoredAuditEvent {
  if (!params.actor || !params.actor.uid || !params.actor.role) {
    throw new ValidationError(
      'بيانات المستخدم الموثوق مطلوبة لإنشاء سجل تدقيق (Trusted actor identity is required for audit)',
      [{ path: 'actor', message: 'Missing authenticated user' }],
      'MISSING_AUDIT_ACTOR'
    );
  }

  if (!params.action || typeof params.action !== 'string') {
    throw new ValidationError(
      'اسم الإجراء مطلوب لسجل التدقيق (Action is required for audit)',
      [{ path: 'action', message: 'Action name cannot be empty' }],
      'MISSING_AUDIT_ACTION'
    );
  }

  if (!params.entityId || typeof params.entityId !== 'string') {
    throw new ValidationError(
      'معرف الكيان المستهدف مطلوب لسجل التدقيق (Entity ID is required for audit)',
      [{ path: 'entityId', message: 'Entity ID cannot be empty' }],
      'MISSING_AUDIT_ENTITY_ID'
    );
  }

  return {
    user_uid: params.actor.uid,
    user_email: params.actor.email,
    user_role: params.actor.role,
    action: params.action.trim(),
    entity_type: params.entityType,
    entity_id: params.entityId.trim(),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    before: params.before ? sanitizeLogData(params.before) : null,
    after: params.after ? sanitizeLogData(params.after) : null,
    reason: params.reason ? params.reason.trim() : '',
    approval_reference: params.approvalReference ? params.approvalReference.trim() : '',
    metadata: params.metadata ? sanitizeLogData(params.metadata) : null,
  };
}

/**
 * Record an audit event inside an existing Firestore transaction.
 * Guarantees that the business mutation and its audit trail record commit atomically.
 *
 * @param transaction Active Firestore Admin transaction
 * @param params Event parameters with trusted actor
 * @param firestore Optional Firestore instance
 * @returns The generated audit document reference
 */
export function recordAuditEventInTransaction(
  transaction: admin.firestore.Transaction,
  params: AuditEventParams,
  firestore?: admin.firestore.Firestore
): admin.firestore.DocumentReference {
  const db = firestore || getFirebaseFirestore();
  const auditDocRef = db.collection(AUDIT_LOGS_COLLECTION).doc();
  const payload = buildSanitizedAuditPayload(params);

  transaction.set(auditDocRef, payload);
  return auditDocRef;
}

/**
 * Record an audit event standalone (outside a parent transaction).
 * Used for authentication failures, diagnostic checkpoints, or standalone admin operations.
 *
 * @param params Event parameters with trusted actor
 * @param firestore Optional Firestore instance
 * @returns The ID of the newly created audit record
 */
export async function recordAuditEvent(
  params: AuditEventParams,
  firestore?: admin.firestore.Firestore
): Promise<string> {
  const db = firestore || getFirebaseFirestore();
  const auditDocRef = db.collection(AUDIT_LOGS_COLLECTION).doc();
  const payload = buildSanitizedAuditPayload(params);

  try {
    await auditDocRef.set(payload);
    return auditDocRef.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AuditService] Failed to record standalone audit event:', message);
    throw new InternalServerError(
      'فشل تسجيل عملية التدقيق الأمني على الخادم (Failed to record audit event)',
      { error: message, action: params.action, entityId: params.entityId },
      'AUDIT_LOGGING_FAILED'
    );
  }
}
