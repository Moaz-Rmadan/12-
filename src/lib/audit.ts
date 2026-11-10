import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { AuditLogEntry, UserRole } from '../types/auth';

/**
 * Append-only audit logger for AL-NAJJAR DESIGN
 * Records all security, role, financial, and order-state modifications.
 * Never stores passwords, tokens, or credentials.
 */
export async function logAuditEvent(params: {
  user_uid: string;
  user_email: string;
  user_role: UserRole;
  action: string;
  entity_type: 'job_order' | 'user' | 'customer' | 'manifest' | 'auth';
  entity_id: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  reason?: string;
  approval_reference?: string;
}): Promise<string | null> {
  try {
    const entry: Omit<AuditLogEntry, 'id'> = {
      user_uid: params.user_uid,
      user_email: params.user_email,
      user_role: params.user_role,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      timestamp: new Date().toISOString(),
      before: sanitizePayload(params.before || null),
      after: sanitizePayload(params.after || null),
      reason: params.reason || '',
      approval_reference: params.approval_reference || '',
    };

    const docRef = await addDoc(collection(db, 'audit_logs'), entry);
    return docRef.id;
  } catch (error) {
    console.error('[Audit Log Error]: Failed to write audit event:', error);
    return null;
  }
}

/**
 * Sanitize sensitive fields (passwords, tokens) before logging
 */
function sanitizePayload(payload: Record<string, any> | null): Record<string, any> | null {
  if (!payload || typeof payload !== 'object') return payload;

  const sanitized = { ...payload };
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'tempPassword'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizePayload(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Fetch recent audit logs (Admin only)
 */
export async function fetchRecentAuditLogs(limitCount = 100): Promise<AuditLogEntry[]> {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AuditLogEntry, 'id'>),
    }));
  } catch (e) {
    console.error('Failed to fetch audit logs:', e);
    return [];
  }
}
