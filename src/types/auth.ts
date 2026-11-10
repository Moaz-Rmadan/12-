export type UserRole = 'admin' | 'accounting' | 'operations' | 'sales';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  isDelegatedManager?: boolean; // For operations role: specifically delegated manager
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: string;
}

export type PermissionKey =
  | 'dashboard:read'
  | 'customer:read'
  | 'customer:create'
  | 'customer:update'
  | 'customer:delete'
  | 'order:read'
  | 'order:create'
  | 'order:update_sales_fields'
  | 'order:update_production_fields'
  | 'order:approve_draft'
  | 'order:cancel'
  | 'order:update_stage'
  | 'template:manage'
  | 'finance:read'
  | 'finance:update'
  | 'finance:approve_cost'
  | 'finance:propose_price'
  | 'finance:approve_price' // Unresolved -> DENY BY DEFAULT for all
  | 'delivery:manage'
  | 'manifest:manage'
  | 'users:manage'
  | 'audit:read';

export interface AuditLogEntry {
  id: string;
  user_uid: string;
  user_email: string;
  user_role: UserRole;
  action: string;
  entity_type: 'job_order' | 'user' | 'customer' | 'manifest' | 'auth';
  entity_id: string;
  timestamp: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  reason?: string;
  approval_reference?: string;
}
