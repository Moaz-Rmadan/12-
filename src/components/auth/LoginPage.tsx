import React, { useState } from 'react';
import { Hammer, Lock, Mail, Eye, EyeOff, AlertCircle, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, sendPasswordReset, enterDemoMode, authError, isDeactivated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Password reset modal state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const isAdminEmail = email.trim().toLowerCase() === 'cfo.moaz@gmail.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success && result.error) {
      setLocalError(result.error);
    }
  };

  const handleDemoLogin = () => {
    enterDemoMode();
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetLoading(true);
    const res = await sendPasswordReset(resetEmail);
    setResetLoading(false);
    setResetMessage(res.message);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors font-sans" dir="rtl">
      
      {/* Background Corporate Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-[#4B83B8]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-[#233B5D]/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#16253B] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        
        {/* Header & Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#4B83B8] via-[#335C8A] to-[#1E3A61] flex items-center justify-center text-white shadow-lg shadow-[#4B83B8]/25 border border-[#4B83B8]/30">
            <Hammer className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#16253B] dark:text-white tracking-tight">
              النجار فيرنتشر
            </h1>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
              EL-NAGGAR ERP SYSTEM
            </p>
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1E3352] text-[#233B5D] dark:text-[#8CB4D9] text-[11px] font-bold border border-slate-200 dark:border-[#2E4B75]">
            تسجيل الدخول للنظام المركزي
          </div>
        </div>

        {/* Deactivated Notice */}
        {isDeactivated && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 text-xs font-bold">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <p className="font-black">تم تعطيل الحساب</p>
              <p className="text-[11px] mt-0.5 opacity-90">هذا الحساب تم إيقافه من قبل مدير النظام. يرجى مراجعة الإدارة.</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {(localError || authError) && !isDeactivated && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 flex items-center gap-2.5 text-xs font-bold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email / Username Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              البريد الإلكتروني المهني
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@elnaggar-design.com"
                className="w-full h-11 pr-10 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#4B83B8] transition-all"
                dir="ltr"
              />
              <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                كلمة المرور
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsResetOpen(true);
                }}
                className="text-[11px] font-bold text-[#4B83B8] hover:text-[#335C8A] hover:underline cursor-pointer"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pr-10 pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#4B83B8] transition-all"
                dir="ltr"
              />
              <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="space-y-3 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#233B5D] hover:bg-[#1E3352] active:bg-[#16253B] text-white text-sm font-black transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>دخول النظام</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>

            {/* Emergency Bypass for Admin */}
            {isAdminEmail && (
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full h-11 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>الدخول الطارئ (تجاوز السحابة)</span>
              </button>
            )}
          </div>
        </form>

        {/* Security Notice */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center space-y-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            النظام مغلق وغير متاح للتسجيل العام. يتم إنشاء الحسابات عبر مدير النظام فقط.
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            AL-NAJJAR ENTERPRISE SECURITY RBAC v2.0
          </p>
        </div>

      </div>

      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              استعادة كلمة المرور
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أدخل البريد الإلكتروني المسجل لإرسال رابط إعادة التعيين الآمن.
            </p>

            {resetMessage ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetMessage}</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@elnaggar-design.com"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  dir="ltr"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 h-9 rounded-lg bg-[#233B5D] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading ? 'جاري الإرسال...' : 'إرسال الرابط'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetOpen(false);
                      setResetMessage(null);
                    }}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {resetMessage && (
              <button
                type="button"
                onClick={() => {
                  setIsResetOpen(false);
                  setResetMessage(null);
                }}
                className="w-full h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
