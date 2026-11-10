import React from 'react';
import { ShieldAlert, ArrowRight, LogOut, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_DISPLAY_NAMES } from '../../lib/permissions';

interface AccessDeniedProps {
  onGoHome: () => void;
  requiredPermission?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onGoHome, requiredPermission }) => {
  const { userProfile, logout } = useAuth();
  const roleName = userProfile?.role ? ROLE_DISPLAY_NAMES[userProfile.role]?.ar : 'غير محدد';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#16253B] rounded-3xl p-6 sm:p-8 text-center space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl">
        
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            غير مصرح بالدخول (Access Denied)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            حسابك الحالي لا يمتلك الصلاحيات الكافية للوصول إلى هذه الشاشة أو تنفيذ هذا الإجراء.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 space-y-1 text-right">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">الدور الوظيفي الحالي:</span>
            <span className="px-2 py-0.5 rounded-full bg-[#4B83B8]/20 text-[#233B5D] dark:text-[#8CB4D9] font-black">
              {roleName}
            </span>
          </div>
          {requiredPermission && (
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">الصلاحية المطلوبة:</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">{requiredPermission}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={onGoHome}
            className="flex-1 h-11 rounded-xl bg-[#233B5D] hover:bg-[#1E3352] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </button>
          
          <button
            onClick={logout}
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تبديل الحساب</span>
          </button>
        </div>

      </div>
    </div>
  );
};
