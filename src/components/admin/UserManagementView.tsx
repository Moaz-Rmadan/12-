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
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile, UserRole, PermissionKey, AuditLogEntry } from '../../types/auth';
import {
  ROLE_DISPLAY_NAMES,
  ROLE_PERMISSIONS_BASE,
  hasPermission,
} from '../../lib/permissions';
import { logAuditEvent, fetchRecentAuditLogs } from '../../lib/audit';

export const UserManagementView: React.FC = () => {
  const { userProfile: currentUserProfile, sendPasswordReset } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'matrix' | 'audit'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for New User Provisioning
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sales');
  const [newIsDelegated, setNewIsDelegated] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for Changing Role
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('sales');
  const [selectedDelegation, setSelectedDelegation] = useState(false);
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setUsers(list);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    const logs = await fetchRecentAuditLogs(50);
    setAuditLogs(logs);
  };

  useEffect(() => {
    loadUsers();
    loadAudit();
  }, []);

  // Handle Toggle Active/Inactive Status
  const handleToggleActive = async (targetUser: UserProfile) => {
    if (targetUser.uid === currentUserProfile?.uid) {
      alert('لا يمكنك تعطيل حسابك الخاص.');
      return;
    }

    const nextState = !targetUser.isActive;
    const confirmMsg = nextState
      ? `هل تريد تنشيط حساب ${targetUser.name}؟`
      : `هل تريد إيقاف وتجميد حساب ${targetUser.name} فوراً؟`;

    if (!window.confirm(confirmMsg)) return;

    try {
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

      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, isActive: nextState } : u))
      );
      loadAudit();
    } catch (e) {
      console.error('Failed to update status:', e);
      alert('حدث خطأ أثناء تعديل حالة الحساب.');
    }
  };

  // Handle Save Role Changes
  const handleSaveRole = async () => {
    if (!editingUser) return;
    if (editingUser.uid === currentUserProfile?.uid && selectedRole !== 'admin') {
      alert('لا يمكنك تخفيض صلاحيات حسابك الخاص كمدير نظام.');
      return;
    }

    setRoleChangeLoading(true);
    try {
      const userRef = doc(db, 'users', editingUser.uid);
      const updates = {
        role: selectedRole,
        isDelegatedManager: selectedRole === 'operations' ? selectedDelegation : false,
        updatedAt: new Date().toISOString(),
      };

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

      setUsers((prev) =>
        prev.map((u) => (u.uid === editingUser.uid ? { ...u, ...updates } : u))
      );
      setEditingUser(null);
      setRoleChangeReason('');
      loadAudit();
    } catch (e) {
      console.error('Failed to update role:', e);
      alert('حدث خطأ أثناء تعديل الدور.');
    } finally {
      setRoleChangeLoading(false);
    }
  };

  // Handle Provisioning New User Profile
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    setCreateLoading(true);

    try {
      // In Firebase Client without Admin SDK, we provision the user's authorization document
      // and trigger password reset / invitation email so they securely set their own password
      const newUid = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const profile: UserProfile = {
        uid: newUid,
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        isActive: true,
        isDelegatedManager: newRole === 'operations' ? newIsDelegated : false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUserProfile?.email,
      };

      await setDoc(doc(db, 'users', newUid), profile);

      // Attempt to send password reset / invitation email
      await sendPasswordReset(newEmail.trim());

      await logAuditEvent({
        user_uid: currentUserProfile?.uid || '',
        user_email: currentUserProfile?.email || '',
        user_role: currentUserProfile?.role || 'admin',
        action: 'USER_PROVISIONED',
        entity_type: 'user',
        entity_id: newUid,
        after: profile,
        reason: 'New user provisioned by administrator',
      });

      setUsers((prev) => [profile, ...prev]);
      setCreateMsg({
        type: 'success',
        text: `تم إنشاء الملف وإرسال رابط تعيين كلمة المرور إلى ${newEmail}`,
      });
      setNewName('');
      setNewEmail('');
      loadAudit();
    } catch (err: any) {
      console.error('Error provisioning user:', err);
      setCreateMsg({ type: 'error', text: 'فشل إنشاء المستخدم: ' + err.message });
    } finally {
      setCreateLoading(false);
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
                onClick={() => setIsCreateModalOpen(true)}
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
                                  if (window.confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${u.email}؟`)) {
                                    await sendPasswordReset(u.email);
                                    alert(`تم إرسال رابط إعادة التعيين إلى ${u.email}`);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
                className={`p-3 rounded-xl text-xs font-bold ${
                  createMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {createMsg.text}
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
                  {createLoading ? 'جاري الإنشاء...' : 'إنشاء الحساب وإرسال الدعوة'}
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
