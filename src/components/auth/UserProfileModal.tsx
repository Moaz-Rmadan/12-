import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Key,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_DISPLAY_NAMES, ROLE_PERMISSIONS_BASE } from '../../lib/permissions';
import firebaseConfig from '../../../firebase-applet-config.json';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, currentUser, isDemoMode, linkedProviders, linkOrUpdatePassword, logout } =
    useAuth();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    code?: string;
  } | null>(null);

  if (!isOpen || !userProfile) return null;

  const roleMeta = ROLE_DISPLAY_NAMES[userProfile.role] || {
    ar: userProfile.role,
    en: userProfile.role,
  };
  const permissions = ROLE_PERMISSIONS_BASE[userProfile.role] || [];
  const hasGoogleLinked = linkedProviders.includes('google.com');
  const hasPasswordLinked = linkedProviders.includes('password');
  const firebaseProvidersUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

  const handleLinkPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.trim().length < 6) {
      setPasswordFeedback({
        type: 'error',
        text: 'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        text: 'كلمتا المرور غير متطابقتين.',
      });
      return;
    }

    setSavingPassword(true);
    const res = await linkOrUpdatePassword(newPassword);
    setSavingPassword(false);

    if (res.success) {
      setPasswordFeedback({ type: 'success', text: res.message });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordFeedback({ type: 'error', text: res.message, code: res.code });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#16253B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#121E30] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4B83B8]/20 text-[#4B83B8] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ملف المستخدم والصلاحيات
              </h3>
              <p className="text-[11px] text-slate-500">
                تفاصيل الحساب وطرق الدخول والأذونات النشطة في النظام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Identity Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {userProfile.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5" dir="ltr">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{userProfile.email}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-left">
                {userProfile.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>نشط</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-black">
                    <AlertTriangle className="w-3 h-3" />
                    <span>معطل</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">الدور الوظيفي المعتمد:</span>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#233B5D] text-white font-black text-xs">
                  {roleMeta.ar}
                </span>
                {userProfile.role === 'operations' && userProfile.isDelegatedManager && (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-[11px]">
                    مدير تشغيل مفوّض (اعتماد الأوامر)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Linked Sign-In Methods & Password Setup */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-[#4B83B8]" />
                <span>طرق تسجيل الدخول المرتبطة بالحساب</span>
              </div>
              {!isDemoMode && currentUser?.email && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm((prev) => !prev);
                    setPasswordFeedback(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#233B5D] hover:bg-[#1E3352] text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>{hasPasswordLinked ? 'تغيير كلمة المرور' : 'ربط كلمة مرور للحساب'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                  hasGoogleLinked || isDemoMode
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>حساب جوجل (Google)</span>
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                  hasPasswordLinked
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>
                  {hasPasswordLinked
                    ? 'البريد وكلمة المرور (مفعّلة)'
                    : 'البريد وكلمة المرور (غير مربوطة بعد)'}
                </span>
              </span>
            </div>

            {isDemoMode ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                في وضع المعاينة المحلية يتم استخدام جلسة تجريبية. بعد الدخول بحساب جوجل في النسخة السحابية يمكنك ربط كلمة مرور مباشرة من هنا.
              </p>
            ) : (
              !hasPasswordLinked &&
              !showPasswordForm && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  للدخول بالبريد (<span dir="ltr" className="font-mono">{userProfile.email}</span>) وكلمة مرور لاحقاً: فعّل مزود Email/Password في Firebase Console ثم اضغط «ربط كلمة مرور للحساب» لتعيين كلمة سر لهذا الحساب.
                </p>
              )
            )}

            {showPasswordForm && !isDemoMode && currentUser?.email && (
              <form
                onSubmit={handleLinkPasswordSubmit}
                className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                {passwordFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] font-bold space-y-2 ${
                      passwordFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <p>{passwordFeedback.text}</p>
                    {passwordFeedback.code === 'auth/operation-not-allowed' && (
                      <a
                        href={firebaseProvidersUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#233B5D] text-white font-black text-[11px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح مزودات الدخول في Firebase Console</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      كلمة المرور الجديدة (6+ أحرف)
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-9 pr-3 pl-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((v) => !v)}
                        className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPasswords ? 'إخفاء' : 'إظهار'}
                      >
                        {showPasswords ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      تأكيد كلمة المرور
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-4 h-9 rounded-lg bg-[#233B5D] hover:bg-[#1E3352] text-white text-xs font-black cursor-pointer disabled:opacity-50"
                  >
                    {savingPassword ? 'جاري الحفظ...' : 'حفظ كلمة المرور للحساب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordFeedback(null);
                    }}
                    className="px-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Permitted Actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
              <Key className="w-3.5 h-3.5 text-[#4B83B8]" />
              <span>الصلاحيات الوظيفية الممنوحة:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {permissions.map((perm) => (
                <div
                  key={perm}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#4B83B8] shrink-0" />
                  <span className="truncate">{perm}</span>
                </div>
              ))}
              {userProfile.role === 'operations' && userProfile.isDelegatedManager && (
                <>
                  <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-[11px] font-mono text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>order:approve_draft (تفويض)</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-[11px] font-mono text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>order:cancel (تفويض)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#121E30] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-black transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#233B5D] hover:bg-[#1E3352] text-white text-xs font-black transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
