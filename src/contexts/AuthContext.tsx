import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleAuthProvider, testFirestoreConnection } from '../lib/firebase';
import { UserProfile, PermissionKey, UserRole } from '../types/auth';
import { hasPermission } from '../lib/permissions';
import { logAuditEvent } from '../lib/audit';
import {
  loadPersistedDemoSessionFlag,
  savePersistedDemoSessionFlag,
} from '../utils/persistenceHelpers';
import { parseFirebaseAuthError } from '../utils/authErrorMessages';

export interface LoginAttemptResult {
  success: boolean;
  error?: string;
  hint?: string;
  canRetryWithRedirect?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  authErrorHint: string | null;
  canRetryWithRedirect: boolean;
  isDeactivated: boolean;
  isDemoMode: boolean;
  canUseDevDemo: boolean;
  isStandalonePwa: boolean;
  login: (email: string, pass: string) => Promise<LoginAttemptResult>;
  loginWithGoogle: () => Promise<LoginAttemptResult>;
  loginWithGoogleRedirect: () => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
  hasPerm: (permission: PermissionKey) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Verified system owner bootstrap email
export const BOOTSTRAP_ADMIN_EMAIL = 'cfo.moaz@gmail.com';

// Dev-only demo mode availability (never exposed in production builds)
const CAN_USE_DEV_DEMO = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_DEMO !== 'false';

const DEMO_USER_PROFILE: UserProfile = {
  uid: 'dev-demo-uid',
  email: BOOTSTRAP_ADMIN_EMAIL,
  name: 'معاذ (معاينة التطوير)',
  role: 'admin',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function detectStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialDemoActive = CAN_USE_DEV_DEMO && loadPersistedDemoSessionFlag();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    initialDemoActive ? DEMO_USER_PROFILE : null
  );
  const [loading, setLoading] = useState(!initialDemoActive);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorHint, setAuthErrorHint] = useState<string | null>(null);
  const [canRetryWithRedirect, setCanRetryWithRedirect] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(initialDemoActive);
  const [isStandalonePwa, setIsStandalonePwa] = useState(detectStandalonePwa);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(display-mode: standalone)');
    const update = () => setIsStandalonePwa(detectStandalonePwa());
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setAuthErrorHint(null);
    setCanRetryWithRedirect(false);
  }, []);

  const resolveOrBootstrapProfile = useCallback(async (user: User): Promise<boolean> => {
    const userDocRef = doc(db, 'users', user.uid);
    const emailLower = (user.email || '').toLowerCase().trim();

    try {
      const snap = await getDoc(userDocRef);

      if (!snap.exists()) {
        // 1. Primary owner automatic bootstrap
        if (emailLower === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
          const nowIso = new Date().toISOString();
          const initialAdminProfile: UserProfile = {
            uid: user.uid,
            email: user.email || BOOTSTRAP_ADMIN_EMAIL,
            name: user.displayName || 'معاذ (مدير النظام الرئيسي)',
            role: 'admin',
            isActive: true,
            createdAt: nowIso,
            updatedAt: nowIso,
            lastLoginAt: nowIso,
          };
          await setDoc(userDocRef, initialAdminProfile);
          setUserProfile(initialAdminProfile);
          setIsDeactivated(false);
          clearAuthError();
          logAuditEvent({
            user_uid: user.uid,
            user_email: user.email || '',
            user_role: 'admin',
            action: 'AUTH_FIRST_ADMIN_BOOTSTRAP',
            entity_type: 'user',
            entity_id: user.uid,
            after: initialAdminProfile,
            reason: 'Automatic trusted bootstrap for primary project owner',
          }).catch(() => {});
          return true;
        }

        if (emailLower) {
          // 2. Check for pending admin-provisioned invite keyed by email
          const inviteRef = doc(db, 'user_invites', emailLower);
          const inviteSnap = await getDoc(inviteRef);

          if (inviteSnap.exists()) {
            const invite = inviteSnap.data() as Partial<UserProfile>;
            if (invite.isActive === false) {
              setAuthError('تم تعطيل هذه الدعوة من قبل الإدارة.');
              setAuthErrorHint('تواصل مع مدير النظام لإعادة تفعيل صلاحياتك.');
              setUserProfile(null);
              setIsDeactivated(true);
              return false;
            }

            const nowIso = new Date().toISOString();
            const claimedProfile: UserProfile = {
              uid: user.uid,
              email: emailLower,
              name: invite.name || user.displayName || emailLower.split('@')[0],
              role: (invite.role as UserRole) || 'sales',
              isActive: true,
              isDelegatedManager:
                invite.role === 'operations' ? Boolean(invite.isDelegatedManager) : false,
              createdAt: invite.createdAt || nowIso,
              updatedAt: nowIso,
              lastLoginAt: nowIso,
              createdBy: invite.createdBy || '',
            };

            await setDoc(userDocRef, claimedProfile);
            deleteDoc(inviteRef).catch(() => {});

            setUserProfile(claimedProfile);
            setIsDeactivated(false);
            clearAuthError();
            logAuditEvent({
              user_uid: user.uid,
              user_email: emailLower,
              user_role: claimedProfile.role,
              action: 'USER_INVITE_CLAIMED',
              entity_type: 'user',
              entity_id: user.uid,
              after: claimedProfile,
              reason: 'Staff member claimed admin-provisioned invite on first sign-in',
            }).catch(() => {});
            return true;
          }
        }

        setAuthError(`الحساب (${emailLower || user.uid}) غير مهيأ بالصلاحيات اللازمة.`);
        setAuthErrorHint(
          `اطلب من مدير النظام (${BOOTSTRAP_ADMIN_EMAIL}) إرسال دعوة لهذا البريد الإلكتروني من تبويب إدارة المستخدمين، أو قم بتسجيل الدخول بحساب المالك.`
        );
        setUserProfile(null);
        setIsDeactivated(false);
        return false;
      }

      const profile = snap.data() as UserProfile;
      setUserProfile(profile);
      setIsDeactivated(!profile.isActive);
      if (profile.isActive) {
        clearAuthError();
      }

      setDoc(
        userDocRef,
        { lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch((e) => console.warn('Update last login warning:', e));
      return true;
    } catch (err: unknown) {
      console.error('Error fetching user authorization profile:', err);
      const isOffline =
        err instanceof Error &&
        (err.message.toLowerCase().includes('offline') ||
          err.message.toLowerCase().includes('unavailable'));
      setAuthError(
        isOffline
          ? 'الجهاز غير متصل بالإنترنت لتأكيد صلاحيات الحساب لأول مرة.'
          : 'تعذر التحقق من صلاحيات الحساب من قاعدة البيانات. يرجى إعادة المحاولة.'
      );
      setAuthErrorHint(
        isOffline
          ? 'تأكد من اتصال الكمبيوتر بالإنترنت ثم اضغط «إعادة التحقق من الصلاحيات».'
          : 'اضغط «إعادة التحقق من الصلاحيات» أو أعد تسجيل الدخول بحساب جوجل.'
      );
      setUserProfile(null);
      return false;
    }
  }, [clearAuthError]);

  // Load and subscribe to user's authorization profile from Firestore
  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;
    let isMounted = true;

    // Surface any error from a standalone PWA redirect sign-in
    getRedirectResult(auth)
      .then((res) => {
        if (!isMounted || !res?.user) return;
        logAuditEvent({
          user_uid: res.user.uid,
          user_email: res.user.email || '',
          user_role: 'sales',
          action: 'AUTH_LOGIN_SUCCESS',
          entity_type: 'auth',
          entity_id: res.user.uid,
          reason: 'User signed in via Google redirect',
        }).catch(() => {});
      })
      .catch((err) => {
        if (!isMounted) return;
        const parsed = parseFirebaseAuthError(err, {
          provider: 'google',
          isStandalonePwa: detectStandalonePwa(),
          isEmbeddedIframe: detectEmbeddedIframe(),
          hostname: typeof window !== 'undefined' ? window.location.hostname : '',
          ownerEmail: BOOTSTRAP_ADMIN_EMAIL,
        });
        setAuthError(parsed.message);
        setAuthErrorHint(parsed.detailHint || null);
        setCanRetryWithRedirect(false);
      });

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (isDemoMode || !isMounted) return;

      setLoading(true);
      setCurrentUser(user);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!user) {
        setUserProfile(null);
        setIsDeactivated(false);
        setLoading(false);
        return;
      }

      // Verify connectivity to configured Firestore database instance
      testFirestoreConnection().catch(() => {});

      const ok = await resolveOrBootstrapProfile(user);
      if (!isMounted) return;

      if (ok) {
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const updated = docSnap.data() as UserProfile;
              setUserProfile(updated);
              setIsDeactivated(!updated.isActive);
            }
          },
          (err) => {
            console.warn('User profile listener warning:', err);
          }
        );
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [isDemoMode, resolveOrBootstrapProfile]);

  const loginWithGoogle = async (): Promise<LoginAttemptResult> => {
    clearAuthError();
    savePersistedDemoSessionFlag(false);
    setIsDemoMode(false);

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      const cred = await signInWithPopup(auth, googleAuthProvider);

      const userDocRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userDocRef);
      let resolvedRole: UserRole =
        (cred.user.email || '').toLowerCase().trim() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
          ? 'admin'
          : 'sales';

      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        resolvedRole = profile.role || resolvedRole;
        if (!profile.isActive) {
          await signOut(auth);
          setUserProfile(null);
          setIsDeactivated(true);
          const errorMsg = 'تم تعطيل هذا الحساب من قبل الإدارة. يرجى مراجعة مدير النظام.';
          setAuthError(errorMsg);
          return { success: false, error: errorMsg };
        }
      }

      logAuditEvent({
        user_uid: cred.user.uid,
        user_email: cred.user.email || '',
        user_role: resolvedRole,
        action: 'AUTH_LOGIN_SUCCESS',
        entity_type: 'auth',
        entity_id: cred.user.uid,
        reason: 'User logged in successfully via Google Sign-In',
      }).catch(() => {});

      return { success: true };
    } catch (err: unknown) {
      console.error('Google login error:', err);
      const parsed = parseFirebaseAuthError(err, {
        provider: 'google',
        isStandalonePwa: detectStandalonePwa(),
        isEmbeddedIframe: detectEmbeddedIframe(),
        hostname: typeof window !== 'undefined' ? window.location.hostname : '',
        ownerEmail: BOOTSTRAP_ADMIN_EMAIL,
      });
      setAuthError(parsed.message);
      setAuthErrorHint(parsed.detailHint || null);
      setCanRetryWithRedirect(parsed.canRetryWithRedirect);
      return {
        success: false,
        error: parsed.message,
        hint: parsed.detailHint,
        canRetryWithRedirect: parsed.canRetryWithRedirect,
      };
    }
  };

  const loginWithGoogleRedirect = async (): Promise<void> => {
    clearAuthError();
    savePersistedDemoSessionFlag(false);
    setIsDemoMode(false);

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      await signInWithRedirect(auth, googleAuthProvider);
    } catch (err: unknown) {
      console.error('Google redirect login error:', err);
      const parsed = parseFirebaseAuthError(err, {
        provider: 'google',
        isStandalonePwa: detectStandalonePwa(),
        isEmbeddedIframe: detectEmbeddedIframe(),
        hostname: typeof window !== 'undefined' ? window.location.hostname : '',
        ownerEmail: BOOTSTRAP_ADMIN_EMAIL,
      });
      setAuthError(parsed.message);
      setAuthErrorHint(parsed.detailHint || null);
      setCanRetryWithRedirect(false);
    }
  };

  const login = async (email: string, pass: string): Promise<LoginAttemptResult> => {
    clearAuthError();
    savePersistedDemoSessionFlag(false);
    setIsDemoMode(false);

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const userDocRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userDocRef);

      let resolvedRole: UserRole = 'sales';
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        resolvedRole = profile.role || 'sales';
        if (!profile.isActive) {
          await signOut(auth);
          setUserProfile(null);
          setIsDeactivated(true);
          const errorMsg = 'تم تعطيل هذا الحساب من قبل الإدارة. يرجى مراجعة مدير النظام.';
          setAuthError(errorMsg);
          return { success: false, error: errorMsg };
        }
      }

      logAuditEvent({
        user_uid: cred.user.uid,
        user_email: cred.user.email || email,
        user_role: resolvedRole,
        action: 'AUTH_LOGIN_SUCCESS',
        entity_type: 'auth',
        entity_id: cred.user.uid,
        reason: 'User logged in successfully via Email/Password',
      }).catch(() => {});

      return { success: true };
    } catch (err: unknown) {
      console.error('Login error:', err);
      const parsed = parseFirebaseAuthError(err, {
        provider: 'password',
        isStandalonePwa: detectStandalonePwa(),
        isEmbeddedIframe: detectEmbeddedIframe(),
        hostname: typeof window !== 'undefined' ? window.location.hostname : '',
        ownerEmail: BOOTSTRAP_ADMIN_EMAIL,
      });

      setAuthError(parsed.message);
      setAuthErrorHint(parsed.detailHint || null);
      setCanRetryWithRedirect(false);
      return { success: false, error: parsed.message, hint: parsed.detailHint };
    }
  };

  const enterDemoMode = () => {
    if (!CAN_USE_DEV_DEMO) {
      setAuthError('وضع المعاينة غير متاح في بيئة الإنتاج.');
      setAuthErrorHint('يرجى استخدام زر «تسجيل الدخول بحساب جوجل» للدخول إلى حسابك السحابي.');
      return;
    }
    savePersistedDemoSessionFlag(true);
    setIsDemoMode(true);
    setCurrentUser(null);
    setUserProfile(DEMO_USER_PROFILE);
    setLoading(false);
    clearAuthError();
  };

  const logout = async () => {
    if (isDemoMode) {
      savePersistedDemoSessionFlag(false);
      setIsDemoMode(false);
      setUserProfile(null);
      clearAuthError();
      return;
    }

    if (currentUser && userProfile) {
      logAuditEvent({
        user_uid: currentUser.uid,
        user_email: currentUser.email || '',
        user_role: userProfile.role,
        action: 'AUTH_LOGOUT',
        entity_type: 'auth',
        entity_id: currentUser.uid,
      }).catch(() => {});
    }
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setIsDeactivated(false);
    clearAuthError();
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return {
        success: true,
        message: 'إذا كان البريد مسجلاً بالنظام بكلمة مرور، فقد تم إرسال رابط إعادة التعيين.',
      };
    } catch {
      return {
        success: true,
        message:
          'إذا كان البريد مسجلاً بكلمة مرور فقد تم إرسال الرابط. (ملاحظة: حسابات جوجل تدخل مباشرة عبر زر Google أعلاه).',
      };
    }
  };

  const refreshProfile = async () => {
    if (isDemoMode || !currentUser) return;
    setLoading(true);
    await resolveOrBootstrapProfile(currentUser);
    setLoading(false);
  };

  const hasPerm = (permission: PermissionKey): boolean => {
    return hasPermission(userProfile, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        authError,
        authErrorHint,
        canRetryWithRedirect,
        isDeactivated,
        isDemoMode,
        canUseDevDemo: CAN_USE_DEV_DEMO,
        isStandalonePwa,
        login,
        loginWithGoogle,
        loginWithGoogleRedirect,
        logout,
        enterDemoMode,
        sendPasswordReset,
        refreshProfile,
        clearAuthError,
        hasPerm,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

