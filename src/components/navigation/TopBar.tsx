import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Plus,
  ChevronLeft,
  User,
  LogOut,
  Cloud,
  HardDrive,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { JobOrderPopulated } from '../../types';
import { NotificationsDropdown } from '../NotificationsDropdown';
import { PWAInstallButton } from '../PWAInstallButton';
import { getNavItemById, getNavGroupForTab } from './navConfig';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_DISPLAY_NAMES } from '../../lib/permissions';

export type SyncStatus = 'connecting' | 'seeding' | 'synced' | 'error' | 'demo';

interface TopBarProps {
  activeTab: string;
  onOpenMobileMenu: () => void;
  onOpenNewOrderModal: () => void;
  onOpenProfileModal: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  orders: JobOrderPopulated[];
  onSelectOrder: (order: JobOrderPopulated) => void;
  syncStatus?: SyncStatus;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenNewOrderModal,
  onOpenProfileModal,
  darkMode,
  setDarkMode,
  orders,
  onSelectOrder,
  syncStatus = 'connecting',
}) => {
  const { userProfile, hasPerm, logout } = useAuth();
  const currentItem = getNavItemById(activeTab);
  const currentGroup = getNavGroupForTab(activeTab);

  const canCreateOrder = hasPerm('order:create');
  const roleName = userProfile?.role ? ROLE_DISPLAY_NAMES[userProfile.role]?.ar : 'غير محدد';

  const syncBadge = (() => {
    switch (syncStatus) {
      case 'synced':
        return {
          label: 'متصل بالسحابة',
          title: 'جميع التعديلات محفوظة لحظياً في قاعدة البيانات السحابية Firestore',
          className:
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          icon: <Cloud className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'demo':
        return {
          label: 'حفظ محلي (معاينة)',
          title: 'وضع معاينة التطوير: يتم حفظ جميع التعديلات محلياً في المتصفح وتبقى بعد التحديث',
          className:
            'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          icon: <HardDrive className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'error':
        return {
          label: 'تعذر المزامنة',
          title: 'حدث خطأ أثناء الاتصال أو الكتابة في قاعدة البيانات السحابية',
          className:
            'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
          icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
        };
      default:
        return {
          label: 'جاري المزامنة...',
          title: 'جاري تهيئة ومزامنة البيانات مع قاعدة البيانات السحابية',
          className:
            'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
          icon: <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />,
        };
    }
  })();

  return (
    <header className="no-print sticky top-0 z-20 h-16 sm:h-20 bg-white/95 dark:bg-[#16253B]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Zone 1: Mobile Hamburger & Contextual Corporate Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Mobile Drawer Trigger (md:hidden) */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-[#EBF3FA] hover:text-[#233B5D] dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 shadow-xs"
            aria-label="فتح القائمة الرئيسية"
            title="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb & Title */}
          <div className="min-w-0">
            {/* Breadcrumb path for desktop */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mb-0.5">
              <span className="text-[#233B5D] dark:text-[#4B83B8] font-bold">النجار فيرنتشر</span>
              <ChevronLeft className="w-3.5 h-3.5 shrink-0 rtl:rotate-0 ltr:rotate-180 text-slate-400" />
              <span>{currentGroup?.title || 'النظام'}</span>
            </div>

            {/* Current View Title */}
            <h1 className="text-sm sm:text-lg lg:text-xl font-black text-[#233B5D] dark:text-slate-100 truncate leading-tight">
              {currentItem?.label || 'أوامر الشغل'}
            </h1>
          </div>
        </div>

        {/* Zone 2: Utilities, Notifications, User Badge & Primary Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Sync Status Badge */}
          <div
            data-testid="sync-status-badge"
            title={syncBadge.title}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 h-9 rounded-xl border text-[11px] font-extrabold ${syncBadge.className}`}
          >
            {syncBadge.icon}
            <span>{syncBadge.label}</span>
          </div>

          {/* User Profile Pill */}
          {userProfile && (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2 px-2.5 sm:px-3 h-9 sm:h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-[#4B83B8] transition-all cursor-pointer"
              title="عرض بيانات الحساب والصلاحيات"
            >
              <div className="w-6 h-6 rounded-lg bg-[#233B5D] text-white flex items-center justify-center text-xs font-black shrink-0">
                {userProfile.name.charAt(0) || <User className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden md:block text-right leading-none">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[100px]">
                  {userProfile.name}
                </span>
                <span className="text-[10px] text-[#4B83B8] font-bold block mt-0.5">
                  {roleName}
                </span>
              </div>
            </button>
          )}

          {/* PWA Install */}
          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>

          {/* Notifications Dropdown */}
          <NotificationsDropdown orders={orders} onSelectOrder={onSelectOrder} />

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-xs"
            title={darkMode ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
            aria-label="تبديل وضع العرض"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#233B5D]" />
            )}
          </button>

          {/* Primary Action Button (+ New Order) - Protected by order:create permission */}
          {canCreateOrder && (
            <button
              onClick={onOpenNewOrderModal}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 sm:h-11 rounded-xl text-xs sm:text-sm font-black text-white bg-[#233B5D] hover:bg-[#1E3352] active:bg-[#16253B] shadow-sm hover:shadow-md transition-all active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer border border-[#233B5D]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">أمر شغل جديد</span>
              <span className="sm:hidden">أمر جديد</span>
            </button>
          )}

          {/* Quick Logout Button */}
          <button
            onClick={logout}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            title="تسجيل الخروج من النظام"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
