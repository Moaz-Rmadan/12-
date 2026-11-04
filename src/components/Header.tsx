import React from 'react';
import {
  Hammer,
  ClipboardList,
  Users,
  Plus,
  Sun,
  Moon,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { JobOrderPopulated } from '../types';
import { NotificationsDropdown } from './NotificationsDropdown';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewOrderModal: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  orders: JobOrderPopulated[];
  onSelectOrder: (order: JobOrderPopulated) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewOrderModal,
  darkMode,
  setDarkMode,
  orders,
  onSelectOrder,
}) => {
  const navItems = [
    { id: 'template-studio', label: 'مولد أمر الشغل', icon: Sparkles },
    { id: 'orders', label: 'أوامر الشغل', icon: ClipboardList },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'receipt', label: 'إقرار استلام عميل', icon: FileCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-amber-900/10 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-6">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 flex items-center justify-center text-amber-100 shadow-md border border-amber-600/30">
              <Hammer className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('orders');
                }}
                className="text-base sm:text-xl font-extrabold tracking-tight text-amber-950 dark:text-amber-100 font-serif whitespace-nowrap block"
              >
                النجار فيرنتشر
              </a>
              <span className="text-[9px] sm:text-[11px] text-amber-800/80 dark:text-amber-400 font-medium block -mt-0.5 tracking-wider uppercase">
                El-Naggar Furniture
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions & Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <NotificationsDropdown orders={orders} onSelectOrder={onSelectOrder} />

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={darkMode ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              onClick={onOpenNewOrderModal}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 hover:from-amber-900 hover:to-slate-900 shadow-sm hover:shadow transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">أمر شغل جديد</span>
              <span className="xs:hidden">جديد</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-1 border-t border-slate-200/80 dark:border-slate-800 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[38px] ${
                  isActive
                    ? 'bg-amber-950 text-amber-200 dark:bg-amber-950 dark:text-amber-200 font-extrabold shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-slate-750'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
