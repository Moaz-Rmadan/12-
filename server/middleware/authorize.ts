import { Request, Response, NextFunction } from 'express';
import { TechnicalRole, AuthErrorResponse } from '../types/auth';

function sendForbidden(res: Response, code: string, message: string): Response {
  const payload: AuthErrorResponse = {
    code,
    error: 'Forbidden',
    message,
  };
  return res.status(403).json(payload);
}

/**
 * Middleware: Ensure request was authenticated and user is active
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.isActive !== true) {
    sendForbidden(res, 'AUTHENTICATION_REQUIRED', 'Valid active user authentication context is required.');
    return;
  }
  next();
}

/**
 * Factory for role-based authorization guards
 * Checks if req.user has one of the allowed technical roles.
 */
export function requireRole(allowedRoles: TechnicalRole | readonly TechnicalRole[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return function roleGuard(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.isActive !== true) {
      sendForbidden(res, 'AUTHENTICATION_REQUIRED', 'Valid active user authentication context is required.');
      return;
    }

    if (!rolesArray.includes(req.user.role)) {
      sendForbidden(
        res,
        'FORBIDDEN_ROLE',
        `Access denied. Required role: [${rolesArray.join(', ')}]. Current role: ${req.user.role}.`
      );
      return;
    }

    next();
  };
}

/**
 * Helper: Strictly requires admin technical role
 */
export const requireAdmin = requireRole('admin');

/**
 * Helper: Strictly requires accounting technical role (accounting only)
 */
export const requireAccounting = requireRole('accounting');

/**
 * Helper: Strictly requires operations technical role (ordinary or delegated operations)
 * NOTE: Does NOT check or grant delegated manager privileges.
 */
export const requireOperations = requireRole('operations');

/**
 * Helper: Strictly requires sales technical role
 */
export const requireSales = requireRole('sales');

/**
 * Helper: Strict Delegated Operations Manager
 * CRITICAL SECURITY INVARIANT:
 * - User role MUST be strictly 'operations'.
 * - Trusted Firestore profile MUST have 'isDelegatedManager === true'.
 * - Ordinary operations users are REJECTED.
 * - Admin does NOT implicitly satisfy this requirement (Admin is not a delegated manager).
 */
export function requireDelegatedOperationsManager(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.isActive !== true) {
    sendForbidden(res, 'AUTHENTICATION_REQUIRED', 'Valid active user authentication context is required.');
    return;
  }

  // Admin is NOT implicitly a delegated operations manager
  if (req.user.role !== 'operations' || req.user.isDelegatedManager !== true) {
    sendForbidden(
      res,
      'DELEGATED_OPERATIONS_REQUIRED',
      'Access denied. This requirement strictly mandates an operations user with isDelegatedManager === true.'
    );
    return;
  }

  next();
}

/**
 * Explicit Composite Rule: Admin OR Delegated Operations Manager
 * Used for business workflows (e.g., Draft Approval) that explicitly permit
 * either the System Admin OR a Delegated Operations Manager.
 */
export function requireAdminOrDelegatedOperationsManager(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.isActive !== true) {
    sendForbidden(res, 'AUTHENTICATION_REQUIRED', 'Valid active user authentication context is required.');
    return;
  }

  // 1. Explicitly permit Admin
  if (req.user.role === 'admin') {
    return next();
  }

  // 2. Explicitly permit Delegated Operations Manager
  if (req.user.role === 'operations' && req.user.isDelegatedManager === true) {
    return next();
  }

  sendForbidden(
    res,
    'ADMIN_OR_DELEGATED_OPERATIONS_REQUIRED',
    'Access denied. Requires either System Admin or Delegated Operations Manager privilege.'
  );
}
