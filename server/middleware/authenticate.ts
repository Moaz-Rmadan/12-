import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth, getFirebaseFirestore } from '../lib/firebase-admin';
import {
  AuthenticatedUser,
  AuthErrorResponse,
  isValidTechnicalRole,
  TechnicalRole,
} from '../types/auth';

export interface TokenVerifier {
  verifyIdToken(token: string, checkRevoked?: boolean): Promise<{ uid: string; email?: string; [key: string]: any }>;
}

export interface ProfileLoader {
  collection(path: string): {
    doc(id: string): {
      get(): Promise<{ exists: boolean; data(): Record<string, any> | undefined }>;
    };
  };
}

export interface AuthenticateOptions {
  authService?: TokenVerifier;
  firestoreService?: ProfileLoader;
  allowDevDemo?: boolean;
}

/**
 * Standardized sanitization of error responses to avoid leaking secrets or stack traces
 */
function sendAuthError(
  res: Response,
  status: number,
  code: string,
  message: string,
  error = 'Unauthorized'
): Response {
  const payload: AuthErrorResponse = {
    code,
    error,
    message,
  };
  return res.status(status).json(payload);
}

/**
 * Factory for Authentication Middleware
 * Validates Bearer token, fetches authoritative profile from Firestore, and sets req.user
 */
export function createAuthenticateMiddleware(options: AuthenticateOptions = {}) {
  return async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    // 1. Missing or malformed header check
    if (!authHeader) {
      sendAuthError(
        res,
        401,
        'MISSING_AUTHORIZATION_HEADER',
        'Authorization header is required (format: Bearer <token>)'
      );
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      sendAuthError(
        res,
        401,
        'MALFORMED_AUTHORIZATION_HEADER',
        'Malformed Authorization header. Format must be: Bearer <token>'
      );
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      sendAuthError(
        res,
        401,
        'EMPTY_TOKEN',
        'Bearer token string cannot be empty'
      );
      return;
    }

    // 2. Demo Mode restrictions
    if (token === 'DEMO_MODE_TOKEN') {
      const isProduction = process.env.NODE_ENV === 'production';
      const allowDevDemo =
        options.allowDevDemo ?? (process.env.ENABLE_DEV_DEMO_AUTH === 'true' && !isProduction);

      if (isProduction || !allowDevDemo) {
        sendAuthError(
          res,
          401,
          'DEMO_TOKEN_PROHIBITED',
          'Demo authentication tokens are strictly prohibited in production and unconfigured environments'
        );
        return;
      }

      // Explicit, isolated dev-only context. Does NOT impersonate real production users.
      req.user = {
        uid: 'dev-demo-uid',
        email: 'dev-demo@elnaggar.local',
        role: 'admin',
        isActive: true,
        isDelegatedManager: false,
        name: 'Local Dev Demo User',
        tokenClaims: { demo: true, environment: 'development' },
      };
      return next();
    }

    // 3. Verify Firebase ID Token via Admin SDK
    const auth = options.authService || getFirebaseAuth();
    const db = options.firestoreService || getFirebaseFirestore();

    let decodedToken: { uid: string; email?: string; [key: string]: any };

    try {
      decodedToken = await auth.verifyIdToken(token, true);
    } catch (err: any) {
      const errorCode = err?.code || '';
      const rawMessage = err instanceof Error ? err.message : String(err);

      // Safe sanitized server-side log (no raw token)
      console.warn('[Auth Middleware] Token verification failed:', {
        code: errorCode,
        reason: rawMessage.replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [REDACTED]'),
      });

      if (errorCode === 'auth/id-token-expired') {
        sendAuthError(res, 401, 'TOKEN_EXPIRED', 'Authentication token has expired. Please sign in again.');
        return;
      }

      if (errorCode === 'auth/id-token-revoked') {
        sendAuthError(res, 401, 'TOKEN_REVOKED', 'Authentication token has been revoked. Please sign in again.');
        return;
      }

      if (errorCode === 'auth/argument-error') {
        sendAuthError(res, 401, 'TOKEN_MALFORMED', 'Invalid authentication token structure.');
        return;
      }

      sendAuthError(res, 401, 'INVALID_TOKEN', 'Authentication token is invalid or signature could not be verified.');
      return;
    }

    // 4. Extract verified UID exclusively from the token
    const verifiedUid = decodedToken.uid;
    if (!verifiedUid) {
      sendAuthError(res, 401, 'TOKEN_MISSING_UID', 'Verified token does not contain a valid user identifier.');
      return;
    }

    // 5. Load authoritative user profile from Firestore `users/{uid}`
    let userDoc: { exists: boolean; data(): Record<string, any> | undefined };
    try {
      userDoc = await db.collection('users').doc(verifiedUid).get();
    } catch (dbErr) {
      console.error('[Auth Middleware] Database lookup error for UID:', verifiedUid, dbErr);
      sendAuthError(res, 500, 'AUTH_LOOKUP_FAILED', 'Failed to retrieve user authorization profile.', 'Internal Server Error');
      return;
    }

    // 6. Reject missing profiles
    if (!userDoc.exists) {
      sendAuthError(
        res,
        403,
        'USER_PROFILE_NOT_FOUND',
        'User authorization profile does not exist in the database.',
        'Forbidden'
      );
      return;
    }

    const profileData = userDoc.data();
    if (!profileData) {
      sendAuthError(
        res,
        403,
        'USER_PROFILE_EMPTY',
        'User authorization record is empty or corrupted.',
        'Forbidden'
      );
      return;
    }

    // 7. Reject inactive accounts
    if (profileData.isActive !== true) {
      sendAuthError(
        res,
        403,
        'ACCOUNT_DEACTIVATED',
        'Your user account has been deactivated. Please contact the system administrator.',
        'Forbidden'
      );
      return;
    }

    // 8. Validate role strictly from authoritative database profile
    const rawRole = profileData.role;
    if (!isValidTechnicalRole(rawRole)) {
      sendAuthError(
        res,
        403,
        'INVALID_TECHNICAL_ROLE',
        'User profile has an invalid or unrecognized technical role.',
        'Forbidden'
      );
      return;
    }

    // 9. Read isDelegatedManager exclusively from database and bind strictly to operations
    const isDelegatedManager =
      rawRole === 'operations' && profileData.isDelegatedManager === true;

    // 10. Attach verified context to request
    req.user = {
      uid: verifiedUid,
      email: decodedToken.email || profileData.email || '',
      role: rawRole,
      isActive: true,
      isDelegatedManager,
      name: profileData.name || '',
      tokenClaims: decodedToken,
    };

    next();
  };
}

/**
 * Default singleton instance of the authenticate middleware
 */
export const authenticate = createAuthenticateMiddleware();
