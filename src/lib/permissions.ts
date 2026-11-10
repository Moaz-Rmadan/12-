import { UserProfile, UserRole, PermissionKey } from '../types/auth';

/**
 * MASTER RBAC PERMISSION MATRIX
 * Fail-Closed: Unknown roles or missing permissions return false.
 * Unresolved business decisions (e.g. finance:approve_price) are DENIED BY DEFAULT for all roles.
 */
export const ROLE_PERMISSIONS_BASE: Record<UserRole, PermissionKey[]> = {
  admin: [
    'dashboard:read',
    'customer:read',
    'customer:create',
    'customer:update',
    'customer:delete',
    'order:read',
    'order:create',
    'order:update_sales_fields',
    'order:update_production_fields',
    'order:approve_draft',
    'order:cancel',
    'order:update_stage',
    'template:manage',
    'finance:read',
    'finance:update',
    'finance:approve_cost',
    'finance:propose_price',
    // 'finance:approve_price' -> NOT YET DECIDED (DENY BY DEFAULT)
    'delivery:manage',
    'manifest:manage',
    'users:manage',
    'audit:read',
  ],
  accounting: [
    'dashboard:read',
    'customer:read',
    'order:read',
    'finance:read',
    'finance:update',
    'finance:approve_cost',
    'delivery:manage', // receipt view
  ],
  operations: [
    'dashboard:read',
    'order:read',
    'order:update_production_fields',
    'order:update_stage',
    'template:manage',
    'manifest:manage',
    'delivery:manage',
    // Draft approval and cancel are ONLY granted if isDelegatedManager === true
  ],
  sales: [
    'dashboard:read',
    'customer:read',
    'customer:create',
    'customer:update',
    'order:read',
    'order:create',
    'order:update_sales_fields',
    'finance:propose_price',
    'delivery:manage',
  ],
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, { ar: string; en: string }> = {
  admin: { ar: 'مدير النظام', en: 'System Admin' },
  accounting: { ar: 'الحسابات', en: 'Accounting' },
  operations: { ar: 'التشغيل', en: 'Operations' },
  sales: { ar: 'المبيعات', en: 'Sales' },
};

/**
 * Check if a user profile has a specific permission.
 * Fails closed if user is null, inactive, or has an invalid role.
 */
export function hasPermission(user: UserProfile | null | undefined, permission: PermissionKey): boolean {
  if (!user || !user.isActive || !user.role) {
    return false;
  }

  // Check unresolved business decision - deny by default
  if (permission === 'finance:approve_price') {
    return false;
  }

  // Handle delegated operations manager assignment
  if (user.role === 'operations' && user.isDelegatedManager) {
    if (permission === 'order:approve_draft' || permission === 'order:cancel') {
      return true;
    }
  }

  const basePermissions = ROLE_PERMISSIONS_BASE[user.role];
  if (!basePermissions) {
    return false;
  }

  return basePermissions.includes(permission);
}

/**
 * Helper to check if user can approve Draft orders
 */
export function canApproveDraft(user: UserProfile | null | undefined): boolean {
  return hasPermission(user, 'order:approve_draft');
}

/**
 * Helper to check if user can cancel orders
 */
export function canCancelOrder(user: UserProfile | null | undefined): boolean {
  return hasPermission(user, 'order:cancel');
}

/**
 * Map application view tab to required permissions
 */
export const TAB_PERMISSION_MAP: Record<string, PermissionKey[]> = {
  'executive-dashboard': ['dashboard:read'],
  'orders': ['order:read'],
  'template-studio': ['template:manage'],
  'bottleneck-report': ['order:read'],
  'customers': ['customer:read'],
  'receipt': ['delivery:manage'],
  'truck-manifest': ['manifest:manage'],
  'critical-report': ['order:read'],
  'top-models': ['dashboard:read'],
  'delivery-report': ['finance:read'],
  'user-management': ['users:manage'],
  'audit-logs': ['audit:read'],
};

/**
 * Verify if user can access a specific tab
 */
export function canAccessTab(user: UserProfile | null | undefined, tabId: string): boolean {
  if (!user || !user.isActive) return false;
  const required = TAB_PERMISSION_MAP[tabId];
  if (!required || required.length === 0) return true;
  return required.some((perm) => hasPermission(user, perm));
}

// -----------------------------------------------------------------------------
// SALES ALLOWLIST ENFORCEMENT (ORDER-DRAFT-001)
// -----------------------------------------------------------------------------

export const SALES_CREATE_ALLOWED_FIELDS = [
  'order_number',
  'customer_id',
  'room_model_code',
  'contract_date',
  'delivery_date',
  'general_specs',
] as const;

export const SALES_CREATE_FORBIDDEN_FIELDS = [
  'status',
  'total_price',
  'deposit_paid',
  'current_stage',
  'stage_updated_at',
  'is_archived',
  'created_at',
  'updated_at',
] as const;

export const SALES_UPDATE_ALLOWED_FIELDS = [
  'room_model_code',
  'general_specs',
  'delivery_date',
] as const;

/**
 * Strict validator for Sales Create Payload
 */
export function validateSalesCreatePayload(payload: Record<string, any>): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be a non-null object' };
  }

  // Check forbidden fields
  for (const field of SALES_CREATE_FORBIDDEN_FIELDS) {
    if (field in payload) {
      return { valid: false, error: `Sales cannot provide forbidden field: ${field}` };
    }
  }

  // Check required fields
  const requiredFields = ['customer_id', 'room_model_code', 'contract_date', 'delivery_date', 'general_specs'];
  for (const field of requiredFields) {
    if (!payload[field] || typeof payload[field] !== 'string' || !payload[field].trim()) {
      return { valid: false, error: `Missing or empty required field: ${field}` };
    }
  }

  return { valid: true };
}

/**
 * Strict validator for Sales Update Payload
 * Only room_model_code, general_specs, delivery_date are allowed.
 * Must be Draft status.
 * Rejects mixed updates containing even one unauthorized field.
 */
export function validateSalesUpdatePayload(
  currentOrder: { status: string; [key: string]: any },
  updates: Record<string, any>
): { valid: boolean; error?: string } {
  if (currentOrder.status !== 'Draft') {
    return { valid: false, error: 'Sales can only update orders in Draft status' };
  }

  const updateKeys = Object.keys(updates);
  if (updateKeys.length === 0) {
    return { valid: false, error: 'No fields provided for update' };
  }

  for (const key of updateKeys) {
    if (!SALES_UPDATE_ALLOWED_FIELDS.includes(key as any)) {
      return { valid: false, error: `Unauthorized field in Sales update: ${key}` };
    }
  }

  return { valid: true };
}

/**
 * Status transition rules
 */
export function isValidStatusTransition(
  fromStatus: string,
  toStatus: string,
  user: UserProfile | null | undefined
): { allowed: boolean; error?: string } {
  if (!user || !user.isActive) {
    return { allowed: false, error: 'User is not authenticated or active' };
  }

  if (fromStatus === toStatus) {
    return { allowed: true };
  }

  // The only approved transition for Draft is Draft -> قيد التشغيل
  if (fromStatus === 'Draft') {
    if (toStatus === 'قيد التشغيل') {
      if (canApproveDraft(user)) {
        return { allowed: true };
      }
      return { allowed: false, error: 'Draft approval requires admin or delegated operations manager' };
    }
    return { allowed: false, error: `Invalid transition from Draft to ${toStatus}` };
  }

  // Existing production status transitions:
  // قيد التشغيل -> تم التنفيذ
  // تم التنفيذ -> تسليم
  if (fromStatus === 'قيد التشغيل' && toStatus === 'تم التنفيذ') {
    if (user.role === 'admin' || user.role === 'operations') {
      return { allowed: true };
    }
    return { allowed: false, error: 'Only operations or admin can mark order as executed' };
  }

  if (fromStatus === 'تم التنفيذ' && toStatus === 'تسليم') {
    if (user.role === 'admin' || user.role === 'operations' || user.role === 'accounting') {
      return { allowed: true };
    }
    return { allowed: false, error: 'Unauthorized to mark order as delivered' };
  }

  // Do not automatically reopen completed or canceled orders
  return { allowed: false, error: `Disallowed status transition: ${fromStatus} -> ${toStatus}` };
}
