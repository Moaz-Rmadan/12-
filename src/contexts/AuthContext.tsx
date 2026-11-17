import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, testFirestoreConnection } from '../lib/firebase';
import { UserProfile, PermissionKey, UserRole } from '../types/auth';
import { hasPermission } from '../lib/permissions';
import { logAuditEvent } from '../lib/audit';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isDeactivated: boolean;
  isDemoMode: boolean;
  canUseDevDemo: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
  hasPerm: (permission: PermissionKey) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Verified system owner bootstrap email
export const BOOTSTRAP_ADMIN_EMAIL = 'cfo.moaz@gmail.com';

// Dev-only demo mode availability (never exposed in production builds)
const CAN_USE_DEV_DEMO = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_DEMO !== 'false';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Load and subscribe to user's authorization profile from Firestore
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (isDemoMode) return;

      setLoading(true);
      setAuthError(null);
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setIsDeactivated(false);
        setLoading(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        return;
      }

      // Verify connectivity to configured Firestore database instance
      testFirestoreConnection().catch(() => {});

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
              name: 'معاذ (مدير النظام الرئيسي)',
              role: 'admin',
              isActive: true,
              createdAt: nowIso,
              updatedAt: nowIso,
              lastLoginAt: nowIso,
            };
            await setDoc(userDocRef, initialAdminProfile);
            setUserProfile(initialAdminProfile);
            setIsDeactivated(false);
            await logAuditEvent({
              user_uid: user.uid,
              user_email: user.email || '',
              user_role: 'admin',
              action: 'AUTH_FIRST_ADMIN_BOOTSTRAP',
              entity_type: 'user',
              entity_id: user.uid,
              after: initialAdminProfile,
              reason: 'Automatic trusted bootstrap for primary project owner',
            });
          } else if (emailLower) {
            // 2. Check for pending admin-provisioned invite keyed by email
            const inviteRef = doc(db, 'user_invites', emailLower);
            const inviteSnap = await getDoc(inviteRef);

            if (inviteSnap.exists()) {
              const invite = inviteSnap.data() as Partial<UserProfile>;
              if (invite.isActive === false) {
                setAuthError('تم تعطيل هذه الدعوة من قبل الإدارة.');
                setUserProfile(null);
                setIsDeactivated(true);
              } else {
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
                await logAuditEvent({
                  user_uid: user.uid,
                  user_email: emailLower,
                  user_role: claimedProfile.role,
                  action: 'USER_INVITE_CLAIMED',
                  entity_type: 'user',
                  entity_id: user.uid,
                  after: claimedProfile,
                  reason: 'Staff member claimed admin-provisioned invite on first sign-in',
                });
              }
            } else {
              // New user without provisioned profile or invite -> Denied by default
              setAuthError('حسابك غير مهيأ بالصلاحيات اللازمة. يرجى التواصل مع مدير النظام.');
              setUserProfile(null);
              setIsDeactivated(false);
            }
          } else {
            setAuthError('حسابك غير مهيأ بالصلاحيات اللازمة. يرجى التواصل مع مدير النظام.');
            setUserProfile(null);
            setIsDeactivated(false);
          }
        } else {
          const profile = snap.data() as UserProfile;
          setUserProfile(profile);
          setIsDeactivated(!profile.isActive);

          setDoc(
            userDocRef,
            { lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch((e) => console.warn('Update last login warning:', e));
        }

        // Live listener for real-time deactivation and role updates
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
      } catch (err: any) {
        console.error('Error fetching user authorization profile:', err);
        setAuthError('تعذر التحقق من صلاحيات الحساب. يرجى إعادة تسجيل الدخول.');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [isDemoMode]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setAuthError(null);

    try {
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

      await logAuditEvent({
        user_uid: cred.user.uid,
        user_email: cred.user.email || email,
        user_role: resolvedRole,
        action: 'AUTH_LOGIN_SUCCESS',
        entity_type: 'auth',
        entity_id: cred.user.uid,
        reason: 'User logged in successfully via Firebase Auth',
      });

      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      let clientMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';

      if (err.code === 'auth/user-disabled') {
        clientMsg = 'تم تعطيل هذا الحساب. يرجى التواصل مع مدير النظام.';
      } else if (err.code === 'auth/network-request-failed') {
        clientMsg = 'تعذر الاتصال بالخادم السحابي. يرجى التحقق من اتصال الإنترنت.';
      } else if (err.code === 'auth/too-many-requests') {
        clientMsg = 'تم حظر تسجيل الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. انتظر لحظات.';
      }

      setAuthError(clientMsg);
      return { success: false, error: clientMsg };
    } finally {
      setLoading(false);
    }
  };

  const enterDemoMode = () => {
    if (!CAN_USE_DEV_DEMO) {
      setAuthError('وضع المعاينة غير متاح في بيئة الإنتاج.');
      return;
    }
    setIsDemoMode(true);
    setCurrentUser(null);
    setUserProfile({
      uid: 'dev-demo-uid',
      email: BOOTSTRAP_ADMIN_EMAIL,
      name: 'معاذ (معاينة التطوير)',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setLoading(false);
    setAuthError(null);
  };

  const logout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUserProfile(null);
      return;
    }

    if (currentUser && userProfile) {
      await logAuditEvent({
        user_uid: currentUser.uid,
        user_email: currentUser.email || '',
        user_role: userProfile.role,
        action: 'AUTH_LOGOUT',
        entity_type: 'auth',
        entity_id: currentUser.uid,
      });
    }
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setIsDeactivated(false);
    setAuthError(null);
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return {
        success: true,
        message: 'إذا كان البريد مسجلاً بالنظام، فقد تم إرسال رابط إعادة تعيين كلمة المرور.',
      };
    } catch {
      return {
        success: true,
        message: 'إذا كان البريد مسجلاً بالنظام، فقد تم إرسال رابط إعادة تعيين كلمة المرور.',
      };
    }
  };

  const refreshProfile = async () => {
    if (isDemoMode || !currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        setUserProfile(profile);
        setIsDeactivated(!profile.isActive);
      }
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
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
        isDeactivated,
        isDemoMode,
        canUseDevDemo: CAN_USE_DEV_DEMO,
        login,
        logout,
        enterDemoMode,
        sendPasswordReset,
        refreshProfile,
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
