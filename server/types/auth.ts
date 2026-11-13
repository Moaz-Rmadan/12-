import { Request } from 'express';

export type TechnicalRole = 'admin' | 'accounting' | 'operations' | 'sales';

export const TECHNICAL_ROLES: readonly TechnicalRole[] = [
  'admin',
  'accounting',
  'operations',
  'sales',
] as const;

export function isValidTechnicalRole(role: unknown): role is TechnicalRole {
  return typeof role === 'string' && (TECHNICAL_ROLES as readonly string[]).includes(role);
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: TechnicalRole;
  isActive: boolean;
  isDelegatedManager: boolean;
  name?: string;
  tokenClaims?: Record<string, any>;
}

export interface AuthErrorResponse {
  code: string;
  error: string;
  message: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
