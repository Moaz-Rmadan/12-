import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { JobOrderPopulated } from '../../types';
import { NotificationsDropdown } from '../NotificationsDropdown';
import { PWAInstallButton } from '../PWAInstallButton';
import { getNavItemById, getNavGroupForTab } from './navConfig';

interface TopBarProps {
  activeTab: string;
  onOpenMobileMenu: () => void;
  onOpenNewOrderModal: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  orders: JobOrderPopulated[];
  onSelectOrder: (order: JobOrderPopulated) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenNewOrderModal,
  darkMode,
  setDarkMode,
  orders,
  onSelectOrder,
}) => {
  const currentItem = getNavItemById(activeTab);
  const currentGroup = getNavGroupForTab(activeTab);

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

        {/* Zone 2: Utilities, Notifications & Primary Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

          {/* Primary Action Button (+ New Order) */}
          <button
            onClick={onOpenNewOrderModal}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 sm:h-11 rounded-xl text-xs sm:text-sm font-black text-white bg-[#233B5D] hover:bg-[#1E3352] active:bg-[#16253B] shadow-sm hover:shadow-md transition-all active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer border border-[#233B5D]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">أمر شغل جديد</span>
            <span className="sm:hidden">أمر جديد</span>
          </button>
        </div>

      </div>
    </header>
  );
};
