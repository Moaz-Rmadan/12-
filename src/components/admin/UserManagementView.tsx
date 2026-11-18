import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Mail,
  Calendar,
  Lock,
  Plus,
  Search,
  Check,
  X,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import firebaseConfig from '../../../firebase-applet-config.json';
import { extractFirebaseErrorCode } from '../../utils/authErrorMessages';
import { useAuth } from '../../contexts/AuthContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { UserProfile, UserRole, PermissionKey, AuditLogEntry } from '../../types/auth';
import {
  ROLE_DISPLAY_NAMES,
  ROLE_PERMISSIONS_BASE,
} from '../../lib/permissions';
import { logAuditEvent, fetchRecentAuditLogs } from '../../lib/audit';

interface PendingInvite {
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  isDelegatedManager?: boolean;
  createdAt?: string;
  createdBy?: string;
}

export const UserManagementView: React.FC = () => {
  const { currentUser, userProfile: currentUserProfile, sendPasswordReset, isDemoMode, logout } = useAuth();
  const { showToast, confirmAction } = useFeedback();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'matrix' | 'audit'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for New User Provisioning
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('sales');
  const [newIsDelegated, setNewIsDelegated] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    showProvidersLink?: boolean;
    showUsersLink?: boolean;
  } | null>(null);

  // Modal State for Changing Role
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('sales');
  const [selectedDelegation, setSelectedDelegation] = useState(false);
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        setUsers(currentUserProfile ? [currentUserProfile] : []);
        setPendingInvites([]);
        return;
      }

      const [usersSnap, invitesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'user_invites')),
      ]);

      const list: UserProfile[] = [];
      usersSnap.forEach((d) => list.push(d.data() as UserProfile));
      setUsers(list);

      const invites: PendingInvite[] = [];
      invitesSnap.forEach((d) => invites.push(d.data() as PendingInvite));
      setPendingInvites(invites);
    } catch (e) {
      console.error('Failed to load users:', e);
      showToast('تعذر تحميل سجل المستخدمين من قاعدة البيانات.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    if (isDemoMode) return;
    const logs = await fetchRecentAuditLogs(50);
    setAuditLogs(logs);
  };

  useEffect(() => {
    loadUsers();
    loadAudit();
  }, [isDemoMode]);

  // Handle Toggle Active/Inactive Status
  const handleToggleActive = async (targetUser: UserProfile) => {
    if (targetUser.uid === currentUserProfile?.uid) {
      showToast('لا يمكنك تعطيل حسابك الخاص.', 'warning');
      return;
    }

    const nextState = !targetUser.isActive;
    const confirmed = await confirmAction({
      title: nextState ? 'تنشيط حساب مستخدم' : 'إيقاف وتجميد حساب مستخدم',
      message: nextState
        ? `هل تريد تنشيط حساب ${targetUser.name}؟`
        : `هل تريد إيقاف وتجميد حساب ${targetUser.name} فوراً؟`,
      confirmLabel: nextState ? 'تنشيط' : 'تعطيل الحساب',
      tone: nextState ? 'primary' : 'danger',
    });

    if (!confirmed) return;

    try {
      if (!isDemoMode) {
        const userRef = doc(db, 'users', targetUser.uid);
        await updateDoc(userRef, {
          isActive: nextState,
          updatedAt: new Date().toISOString(),
        });

        await logAuditEvent({
          user_uid: currentUserProfile?.uid || '',
          user_email: currentUserProfile?.email || '',
          user_role: currentUserProfile?.role || 'admin',
          action: nextState ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          entity_type: 'user',
          entity_id: targetUser.uid,
          before: { isActive: targetUser.isActive },
          after: { isActive: nextState },
          reason: `Administrator status toggle to ${nextState ? 'active' : 'inactive'}`,
        });
      }

      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, isActive: nextState } : u))
      );
      showToast(
        nextState ? `تم تنشيط حساب ${targetUser.name}` : `تم تعطيل حساب ${targetUser.name}`,
        'success'
      );
      loadAudit();
    } catch (e) {
      console.error('Failed to update status:', e);
      showToast('حدث خطأ أثناء تعديل حالة الحساب.', 'error');
    }
  };

  // Handle Save Role Changes
  const handleSaveRole = async () => {
    if (!editingUser) return;
    if (editingUser.uid === currentUserProfile?.uid && selectedRole !== 'admin') {
      showToast('لا يمكنك تخفيض صلاحيات حسابك الخاص كمدير نظام.', 'warning');
      return;
    }

    setRoleChangeLoading(true);
    try {
      const updates = {
        role: selectedRole,
        isDelegatedManager: selectedRole === 'operations' ? selectedDelegation : false,
        updatedAt: new Date().toISOString(),
      };

      if (!isDemoMode) {
        const userRef = doc(db, 'users', editingUser.uid);
        await updateDoc(userRef, updates);

        await logAuditEvent({
          user_uid: currentUserProfile?.uid || '',
          user_email: currentUserProfile?.email || '',
          user_role: currentUserProfile?.role || 'admin',
          action: 'USER_ROLE_CHANGED',
          entity_type: 'user',
          entity_id: editingUser.uid,
          before: { role: editingUser.role, isDelegatedManager: editingUser.isDelegatedManager },
          after: updates,
          reason: roleChangeReason || 'Administrative role assignment',
        });
      }

      setUsers((prev) =>
        prev.map((u) => (u.uid === editingUser.uid ? { ...u, ...updates } : u))
      );
      setEditingUser(null);
      setRoleChangeReason('');
      showToast('تم تحديث الدور الوظيفي وحفظه في سجل الحوكمة.', 'success');
      loadAudit();
    } catch (e) {
      console.error('Failed to update role:', e);
      showToast('حدث خطأ أثناء تعديل الدور الوظيفي.', 'error');
    } finally {
      setRoleChangeLoading(false);
    }
  };

  // Handle Provisioning New User Profile (Admin SDK endpoint, Secondary Firebase Auth w/ password, or Firestore Invite)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    setCreateLoading(true);

    const emailLower = newEmail.trim().toLowerCase();
    const trimmedName = newName.trim();
    const trimmedPassword = newPassword.trim();
    const delegated = newRole === 'operations' ? newIsDelegated : false;

    if (trimmedPassword && trimmedPassword.length < 6) {
      setCreateMsg({
        type: 'error',
        text: 'كلمة المرور الابتدائية يجب أن تتكون من 6 أحرف على الأقل (أو اترك الحقل فارغاً للدعوة عبر جوجل).',
      });
      setCreateLoading(false);
      return;
    }

    try {
      if (!isDemoMode && currentUser && trimmedPassword) {
        try {
          const token = await currentUser.getIdToken();
          const apiRes = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: trimmedName,
              email: emailLower,
              role: newRole,
              isDelegatedManager: delegated,
              temporaryPassword: trimmedPassword,
            }),
          });

          if (apiRes.ok) {
            const payload = await apiRes.json();
            const provisionedUser = (payload.user || payload.profile) as UserProfile;

            setUsers((prev) => [
              provisionedUser,
              ...prev.filter((u) => u.uid !== provisionedUser.uid),
            ]);
            setCreateMsg({
              type: 'success',
              text: `تم إنشاء حساب المصادقة بكلمة المرور وتعيين الدور بنجاح لـ ${emailLower}.`,
            });
            showToast(`تم إنشاء حساب ${trimmedName} بنجاح`, 'success');
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            loadAudit();
            return;
          }

          // Only abort on explicit 400 validation errors; fall back cleanly to client SDK when Admin SDK / IAM isn't configured
          if (apiRes.status === 400) {
            const errJson = await apiRes.json().catch(() => ({}));
            throw new Error(errJson.message || 'بيانات المستخدم غير صالحة');
          }
        } catch (apiErr: unknown) {
          // Re-throw explicit validation errors; otherwise fall through to client-side provisioning
          if (apiErr instanceof Error && apiErr.message && !apiErr.message.includes('fetch')) {
            // Only abort if it was an explicit 400 validation error thrown above
            if (
              apiErr.message.includes('غير صالح') ||
              apiErr.message.includes('يرجى إدخال')
            ) {
              throw apiErr;
            }
          }
        }
      }

      const nowIso = new Date().toISOString();
      let restrictedToConsoleUsers = false;
      let existingAuthUserInvite = false;

      // Path A: Admin supplied an initial password -> provision Auth user using an isolated secondary Firebase App
      // so the Admin stays logged in on the primary Firebase Auth instance, then save users/{uid} under Admin rules.
      if (trimmedPassword && !isDemoMode) {
        const secondaryApp = initializeApp(firebaseConfig, `provision-${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);
        try {
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            emailLower,
            trimmedPassword
          );
          await firebaseSignOut(secondaryAuth).catch(() => {});

          const createdProfile: UserProfile = {
            uid: cred.user.uid,
            email: emailLower,
            name: trimmedName,
            role: newRole,
            isActive: true,
            isDelegatedManager: delegated,
            createdAt: nowIso,
            updatedAt: nowIso,
            createdBy: currentUserProfile?.email || '',
          };

          await setDoc(doc(db, 'users', cred.user.uid), createdProfile);

          await logAuditEvent({
            user_uid: currentUserProfile?.uid || '',
            user_email: currentUserProfile?.email || '',
            user_role: currentUserProfile?.role || 'admin',
            action: 'USER_CREATED_WITH_PASSWORD',
            entity_type: 'user',
            entity_id: cred.user.uid,
            after: createdProfile,
            reason: 'Admin provisioned new Email/Password user account via secondary auth session',
          }).catch(() => {});

          setUsers((prev) => [
            createdProfile,
            ...prev.filter((u) => u.uid !== createdProfile.uid),
          ]);
          setCreateMsg({
            type: 'success',
            text: `تم إنشاء حساب (${emailLower}) بكلمة المرور وتفعيله فوراً! يمكن للموظف الآن الدخول بالبريد وكلمة المرور أو بحساب جوجل.`,
          });
          showToast(`تم إنشاء حساب ${trimmedName} بكلمة مرور بنجاح`, 'success');
          setNewName('');
          setNewEmail('');
          setNewPassword('');
          loadAudit();
          return;
        } catch (provisionErr: unknown) {
          const code = extractFirebaseErrorCode(provisionErr);
          if (code === 'auth/operation-not-allowed') {
            setCreateMsg({
              type: 'error',
              showProvidersLink: true,
              text: 'مزود Email/Password غير مفعّل في Firebase Console بعد. فعّله أولاً لإنشاء حساب بكلمة مرور، أو اترك حقل كلمة المرور فارغاً لتسجيل دعوة دخول عبر جوجل.',
            });
            return;
          }
          if (code === 'auth/admin-restricted-operation') {
            // Client-side self-signup is locked down on this Firebase project; automatically save the Firestore invite
            // so the Admin only needs to add the email+password once in Firebase Console -> Authentication -> Users.
            restrictedToConsoleUsers = true;
          } else if (code === 'auth/email-already-in-use') {
            // User already signed in (e.g. via Google) without a Firestore profile; save the invite directly so they can claim it immediately.
            existingAuthUserInvite = true;
          } else {
            throw provisionErr;
          }
        } finally {
          await deleteApp(secondaryApp).catch(() => {});
        }
      }

      // Path B: Invite flow (for Google Sign-In, Console-added Email/Password users, or Demo Mode)
      const inviteRecord: PendingInvite = {
        email: emailLower,
        name: trimmedName,
        role: newRole,
        isActive: true,
        isDelegatedManager: delegated,
        createdAt: nowIso,
        createdBy: currentUserProfile?.email || '',
      };

      if (!isDemoMode) {
        await setDoc(doc(db, 'user_invites', emailLower), inviteRecord);

        await logAuditEvent({
          user_uid: currentUserProfile?.uid || '',
          user_email: currentUserProfile?.email || '',
          user_role: currentUserProfile?.role || 'admin',
          action: 'USER_INVITE_CREATED',
          entity_type: 'user_invite',
          entity_id: emailLower,
          after: inviteRecord,
          reason: restrictedToConsoleUsers
            ? 'Admin provisioned invite (client signup restricted; add Email/Password user in Firebase Console Users)'
            : existingAuthUserInvite
            ? 'Admin provisioned invite for already-registered Firebase Auth user'
            : 'Admin provisioned invite awaiting first Firebase Auth sign-in',
        });
      }

      setPendingInvites((prev) => [
        inviteRecord,
        ...prev.filter((inv) => inv.email !== emailLower),
      ]);
      setCreateMsg({
        type: 'success',
        showUsersLink: restrictedToConsoleUsers,
        text: restrictedToConsoleUsers
          ? `تم حفظ صلاحيات (${trimmedName}) للبريد (${emailLower}) في قاعدة البيانات! لأن إنشاء الحسابات من المتصفح مقيّد أمنياً في Firebase، أضف هذا البريد وكلمة المرور من Firebase Console ← Authentication ← Users ← Add user وسيفتح فوراً من أي جهاز.`
          : existingAuthUserInvite
          ? `البريد (${emailLower}) مسجل مسبقاً في المصادقة، وتم حفظ دعوة الصلاحيات له بنجاح! يمكنه الآن الضغط على «إعادة التحقق من الصلاحيات» أو الدخول بحساب جوجل فوراً.`
          : trimmedPassword
          ? `تم إنشاء سجل معاينة الحساب (${emailLower}) في الوضع المحلي بنجاح.`
          : `تم تسجيل دعوة الصلاحيات للبريد (${emailLower}). يمكن للموظف الآن الضغط على «تسجيل الدخول بحساب جوجل (Google)» بنفس البريد وسيتم تفعيل دوره وصلاحياته تلقائياً.`,
      });
      showToast(`تم تسجيل دعوة ${trimmedName} بنجاح`, 'success');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      loadAudit();
    } catch (err: unknown) {
      console.error('Error provisioning user:', err);
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      setCreateMsg({ type: 'error', text: 'فشل إنشاء المستخدم: ' + msg });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRevokeInvite = async (invite: PendingInvite) => {
    const confirmed = await confirmAction({
      title: 'إلغاء دعوة الصلاحيات',
      message: `هل تريد إلغاء الدعوة المعلقة للمستخدم ${invite.name} (${invite.email})؟`,
      confirmLabel: 'إلغاء الدعوة',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      if (!isDemoMode) {
        await deleteDoc(doc(db, 'user_invites', invite.email));
        await logAuditEvent({
          user_uid: currentUserProfile?.uid || '',
          user_email: currentUserProfile?.email || '',
          user_role: currentUserProfile?.role || 'admin',
          action: 'USER_INVITE_REVOKED',
          entity_type: 'user_invite',
          entity_id: invite.email,
          before: invite,
        });
      }
      setPendingInvites((prev) => prev.filter((i) => i.email !== invite.email));
      showToast(`تم إلغاء الدعوة لـ ${invite.email}`, 'success');
      loadAudit();
    } catch (err) {
      console.error('Failed to revoke invite:', err);
      showToast('تعذر إلغاء الدعوة. يرجى المحاولة مرة أخرى.', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const allPermissionKeys: PermissionKey[] = [
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
    'finance:approve_price',
    'delivery:manage',
    'manifest:manage',
    'users:manage',
    'audit:read',
  ];

  return (
    <div className="space-y-6 font-sans" dir="rtl">
      
      {/* View Header */}
      <div className="bg-white dark:bg-[#16253B] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#4B83B8] mb-1">
            <Shield className="w-4 h-4" />
            <span>لوحة الحوكمة والتحكم الأمني</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            إدارة المستخدمين والصلاحيات (RBAC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة الأدوار الوظيفية الأربعة المعتمدة، ضبط التفويضات، ومتابعة سجل التدقيق الأمني.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-[#233B5D] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>سجل المستخدمين</span>
          </button>

          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'matrix'
                ? 'bg-[#233B5D] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>مصفوفة الصلاحيات</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-[#233B5D] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل التدقيق</span>
          </button>
        </div>
      </div>

      {/* Demo Mode Warning Banner */}
      {isDemoMode && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-black text-sm">
                تنبيه: أنت الآن داخل «معاينة التطوير (حفظ محلي)» ولست متصلاً بالسحابة!
              </p>
              <p className="font-semibold text-amber-800 dark:text-amber-200 leading-relaxed">
                أي مستخدم أو دعوة يتم إضافتها في هذا الوضع تُحفظ محلياً للمعاينة فقط ولا تُسجّل في قاعدة البيانات السحابية Firestore أو Firebase Auth، ولن يتمكن الموظفون من الدخول بها. لتفعيل الدعوات فعلياً، اخرج من المعاينة وسجّل الدخول بحساب جوجل الحقيقي ({currentUserProfile?.email}).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 px-4 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-colors cursor-pointer shadow-xs"
          >
            الخروج والدخول بحساب Google الحقيقي
          </button>
        </div>
      )}

      {/* SUB-TAB 1: USERS DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث بالاسم أو البريد الإلكتروني..."
                className="w-full h-11 pr-10 pl-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16253B] text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#4B83B8]"
              />
              <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadUsers}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16253B] text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-xs"
                title="تحديث القائمة"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setCreateMsg(null);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 h-11 rounded-2xl bg-[#233B5D] hover:bg-[#1E3352] text-white text-xs font-black transition-all shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-[#16253B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-[#121E30] text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">المستخدم</th>
                    <th className="py-3.5 px-4">الدور المعتمد</th>
                    <th className="py-3.5 px-4">حالة الحساب</th>
                    <th className="py-3.5 px-4">التفويض</th>
                    <th className="py-3.5 px-4">تاريخ الإنشاء</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                        {loading ? 'جاري تحميل المستخدمين...' : 'لا يوجد مستخدمون مطابقون للبحث.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleMeta = ROLE_DISPLAY_NAMES[u.role] || { ar: u.role, en: u.role };
                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          
                          {/* User Name & Email */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900 dark:text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                              {u.email}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-3 py-1 rounded-xl bg-[#233B5D] text-white font-black text-[11px]">
                              {roleMeta.ar}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {u.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>نشط</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px]">
                                <XCircle className="w-3 h-3" />
                                <span>معطل</span>
                              </span>
                            )}
                          </td>

                          {/* Delegation */}
                          <td className="py-3.5 px-4">
                            {u.role === 'operations' ? (
                              u.isDelegatedManager ? (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold">
                                  مفوّض لاعتماد الأوامر
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">عادي (غير مفوّض)</span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>

                          {/* Created At */}
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {u.createdAt ? u.createdAt.split('T')[0] : '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Role Button */}
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setSelectedRole(u.role);
                                  setSelectedDelegation(Boolean(u.isDelegatedManager));
                                }}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                              >
                                تغيير الدور
                              </button>

                              {/* Toggle Active Button */}
                              <button
                                onClick={() => handleToggleActive(u)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                  u.isActive
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {u.isActive ? 'تعطيل' : 'تنشيط'}
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={async () => {
                                  const ok = await confirmAction({
                                    title: 'إرسال رابط استعادة كلمة المرور',
                                    message: `هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى ${u.email}؟`,
                                    confirmLabel: 'إرسال الرابط',
                                    tone: 'primary',
                                  });
                                  if (ok) {
                                    await sendPasswordReset(u.email);
                                    showToast(`تم إرسال رابط إعادة التعيين إلى ${u.email}`, 'success');
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                title="إرسال رابط استعادة كلمة المرور"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invites Table */}
          {pendingInvites.length > 0 && (
            <div className="bg-white dark:bg-[#16253B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#121E30] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
                  <Clock className="w-4 h-4 text-[#C6A355]" />
                  <span>دعوات الصلاحيات المعلقة (بانتظار أول تسجيل دخول)</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {pendingInvites.length} دعوة
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingInvites.map((inv) => {
                      const roleMeta = ROLE_DISPLAY_NAMES[inv.role] || { ar: inv.role, en: inv.role };
                      return (
                        <tr key={inv.email} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <div className="font-black text-slate-900 dark:text-white">{inv.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                              {inv.email}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-3 py-1 rounded-xl bg-[#233B5D] text-white font-black text-[11px]">
                              {roleMeta.ar}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px]">
                              بانتظار التفعيل
                            </span>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>إلغاء الدعوة</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SUB-TAB 2: PERMISSION MATRIX VIEW */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white dark:bg-[#16253B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                مصفوفة الصلاحيات المركزية (Role-Permission Matrix)
              </h3>
              <p className="text-xs text-slate-500">
                الحوكمة المعتمدة لتوزيع المهام. أي قرار غير محسوم يتم التعامل معه كـ Deny by Default.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-[#121E30] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">الصلاحية (Permission Key)</th>
                  <th className="py-3 px-4 text-center">مدير النظام (admin)</th>
                  <th className="py-3 px-4 text-center">الحسابات (accounting)</th>
                  <th className="py-3 px-4 text-center">التشغيل (operations)</th>
                  <th className="py-3 px-4 text-center">المبيعات (sales)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allPermissionKeys.map((key) => {
                  const hasAdmin = ROLE_PERMISSIONS_BASE.admin.includes(key);
                  const hasAccounting = ROLE_PERMISSIONS_BASE.accounting.includes(key);
                  const hasOps = ROLE_PERMISSIONS_BASE.operations.includes(key);
                  const hasSales = ROLE_PERMISSIONS_BASE.sales.includes(key);
                  const isOpsDelegatedNote = key === 'order:approve_draft' || key === 'order:cancel';
                  const isUnresolved = key === 'finance:approve_price';

                  return (
                    <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {key}
                        {isUnresolved && (
                          <span className="mr-2 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black">
                            لم يحسم بعد (Deny by Default)
                          </span>
                        )}
                        {isOpsDelegatedNote && (
                          <span className="mr-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black">
                            للمدير المفوض فقط
                          </span>
                        )}
                      </td>
                      
                      {/* Admin */}
                      <td className="py-2.5 px-4 text-center">
                        {hasAdmin ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>

                      {/* Accounting */}
                      <td className="py-2.5 px-4 text-center">
                        {hasAccounting ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>

                      {/* Operations */}
                      <td className="py-2.5 px-4 text-center">
                        {hasOps ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : isOpsDelegatedNote ? (
                          <span className="text-[10px] text-amber-600 font-bold">بتفويض</span>
                        ) : (
                          <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>

                      {/* Sales */}
                      <td className="py-2.5 px-4 text-center">
                        {hasSales ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUDIT LOGS VIEW */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-[#16253B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                سجل التدقيق الأمني (Append-Only Audit Trail)
              </h3>
              <p className="text-xs text-slate-500">
                تسجيل حي غير قابل للتعديل لجميع العمليات الحساسة وتغيير الأدوار وتعديل أوامر الشغل.
              </p>
            </div>
            <button
              onClick={loadAudit}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold">
                لا توجد سجلات تدقيق حتى الآن.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#233B5D] text-white font-mono text-[10px] font-black">
                        {log.action}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold">
                        {log.user_email}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {log.user_role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.timestamp}
                    </span>
                  </div>

                  {log.reason && (
                    <div className="text-[11px] text-slate-500">
                      السبب: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.reason}</span>
                    </div>
                  )}

                  {(log.before || log.after) && (
                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950/40 p-2 rounded-lg overflow-x-auto" dir="ltr">
                      {log.before && <div>BEFORE: {JSON.stringify(log.before)}</div>}
                      {log.after && <div>AFTER:  {JSON.stringify(log.after)}</div>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE USER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                تهيئة وإضافة مستخدم جديد
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold space-y-2 ${
                  createMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <p>{createMsg.text}</p>
                {createMsg.showProvidersLink && (
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#233B5D] text-white font-black text-[11px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>تفعيل Email/Password في Firebase Console</span>
                  </a>
                )}
                {createMsg.showUsersLink && (
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/users`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#233B5D] text-white font-black text-[11px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>إضافة المستخدم في Firebase Console (Users)</span>
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@elnaggar-design.com"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة مرور ابتدائية (اختياري للدخول بالإيميل)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="اتركه فارغاً للدخول بحساب جوجل فقط"
                    className="w-full h-10 pr-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? 'إخفاء' : 'إظهار'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  للدخول بالبريد وكلمة السر: أدخل 6 أحرف فأكثر (يتطلب تفعيل Email/Password في Firebase).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الدور الوظيفي
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="sales">المبيعات (sales)</option>
                  <option value="operations">التشغيل والورش (operations)</option>
                  <option value="accounting">الحسابات (accounting)</option>
                  <option value="admin">مدير النظام (admin)</option>
                </select>
              </div>

              {newRole === 'operations' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsDelegated}
                      onChange={(e) => setNewIsDelegated(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      تفويض هذا المستخدم كمدير تشغيل (اعتماد الأوامر)
                    </span>
                  </label>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mr-5">
                    يمنح صلاحية اعتماد مسودات أوامر الشغل Draft وإلغاء الأوامر دون منحه صلاحيات الإدارة الشاملة.
                  </p>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 h-10 rounded-xl bg-[#233B5D] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {createLoading
                    ? 'جاري الإنشاء...'
                    : newPassword.trim()
                    ? 'إنشاء الحساب بكلمة المرور'
                    : 'إنشاء الحساب وإرسال الدعوة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER ROLE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                تعديل الدور والصلاحيات لـ: {editingUser.name}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الدور الجديد
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="sales">المبيعات (sales)</option>
                  <option value="operations">التشغيل والورش (operations)</option>
                  <option value="accounting">الحسابات (accounting)</option>
                  <option value="admin">مدير النظام (admin)</option>
                </select>
              </div>

              {selectedRole === 'operations' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDelegation}
                      onChange={(e) => setSelectedDelegation(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      تفويض كمدير تشغيل (اعتماد الأوامر وإلغاؤها)
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل (مطلوب للتدقيق الأمني)
                </label>
                <textarea
                  required
                  rows={2}
                  value={roleChangeReason}
                  onChange={(e) => setRoleChangeReason(e.target.value)}
                  placeholder="مثال: ترقية وظيفية، تغيير مهام بالورشة..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={roleChangeLoading || !roleChangeReason.trim()}
                  className="flex-1 h-10 rounded-xl bg-[#233B5D] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {roleChangeLoading ? 'جاري الحفظ...' : 'حفظ التعديل في سجل الحوكمة'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
