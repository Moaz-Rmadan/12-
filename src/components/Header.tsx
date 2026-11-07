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
  Truck,
  FileText,
  Award,
  ShieldAlert,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import { JobOrderPopulated } from '../types';
import { NotificationsDropdown } from './NotificationsDropdown';
import { PWAInstallButton } from './PWAInstallButton';

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
    { id: 'executive-dashboard', label: 'الداشبورد والاستعلام الشامل', icon: LayoutDashboard },
    { id: 'template-studio', label: 'مولد أمر الشغل', icon: Sparkles },
    { id: 'orders', label: 'أوامر الشغل', icon: ClipboardList },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'receipt', label: 'إقرار استلام عميل', icon: FileCheck },
    { id: 'truck-manifest', label: 'حمولة العربية', icon: Truck },
    { id: 'top-models', label: 'أكثر الموديلات مبيعاً', icon: Award },
    { id: 'critical-report', label: 'الأوامر الحرجة والمتأخرة', icon: ShieldAlert },
    { id: 'bottleneck-report', label: 'تقرير مراحل الإنتاج', icon: Activity },
    { id: 'delivery-report', label: 'تقرير التسليمات', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-amber-900/10 dark:border-slate-800 shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20 gap-2 sm:gap-6">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 flex items-center justify-center text-amber-100 shadow-md border border-amber-600/30 transition-transform duration-200 hover:scale-105">
              <Hammer className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div className="hidden xs:block">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('orders');
                }}
                className="text-sm sm:text-xl font-black tracking-tight text-amber-950 dark:text-amber-100 whitespace-nowrap block leading-none"
              >
                النجار فيرنتشر
              </a>
              <span className="text-[8px] sm:text-[11px] text-amber-800/80 dark:text-amber-400 font-bold block mt-0.5 tracking-wider uppercase opacity-80">
                El-Naggar Furniture
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60 shadow-xs'
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
            <div className="flex items-center gap-1 sm:gap-2">
              <PWAInstallButton />
              <NotificationsDropdown orders={orders} onSelectOrder={onSelectOrder} />
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={darkMode ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>

            <button
              onClick={onOpenNewOrderModal}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 sm:h-11 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 hover:from-amber-800 hover:to-slate-900 shadow-sm hover:shadow-md transition-all active:scale-[0.96] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">أمر شغل جديد</span>
              <span className="sm:hidden">جديد</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row (Tab-style, ergonomic) */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 scrollbar-none snap-x">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all cursor-pointer min-h-[38px] snap-start active:scale-95 ${
                  isActive
                    ? 'bg-amber-950 text-amber-200 dark:bg-amber-950 dark:text-amber-200 shadow-md ring-1 ring-amber-800/50'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850/80 hover:bg-amber-50 dark:hover:bg-slate-800'
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
