import React, { useState, useEffect, useRef } from 'react';
import { Hammer, X, ChevronDown, Sparkles } from 'lucide-react';
import { NAV_GROUPS, NavGroupConfig, NavItemConfig, getNavGroupForTab } from './navConfig';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  urgentOrdersCount?: number;
}

export const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  urgentOrdersCount = 0,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const currentParentGroup = getNavGroupForTab(activeTab);

  // Single-Open Accordion state for mobile drawer
  const [openGroupId, setOpenGroupId] = useState<string | null>(
    () => currentParentGroup?.id || 'operations'
  );

  // Auto-expand active group when activeTab changes
  useEffect(() => {
    const parent = getNavGroupForTab(activeTab);
    if (parent && parent.id !== openGroupId) {
      setOpenGroupId(parent.id);
    }
  }, [activeTab]);

  // Close on Escape key & Lock background scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 z-50 md:hidden flex justify-end">
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        aria-hidden="true"
      />

      {/* 2. Slide-over Drawer (Right side for RTL) */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة التنقل للأجهزة الذكية"
        className="relative w-[85%] max-w-sm h-full bg-[#16253B] text-slate-100 shadow-2xl flex flex-col z-10 border-l border-[#233B5D] transform transition-transform duration-300 ease-out animate-slide-left rtl:animate-slide-left"
      >
        {/* Drawer Header */}
        <div className="h-18 flex items-center justify-between px-5 border-b border-[#233B5D] bg-[#121E30] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4B83B8] via-[#335C8A] to-[#1E3A61] flex items-center justify-center text-white shadow-md border border-[#4B83B8]/40">
              <Hammer className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <span className="text-base font-black text-white block leading-tight">
                النجار فيرنتشر
              </span>
              <span className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase">
                EL-NAGGAR ERP
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-[#1E3352] hover:bg-[#233B5D] transition-colors cursor-pointer border border-[#233B5D]"
            aria-label="إغلاق القائمة"
            title="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Single-Open Accordion Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-3">
          {NAV_GROUPS.map((group: NavGroupConfig) => {
            const GroupIcon = group.icon;
            const isGroupOpen = openGroupId === group.id;
            const hasActiveChild = group.items.some((item) => item.id === activeTab);
            const hasUrgent = group.items.some((item) => item.badgeKey === 'urgentOrders') && urgentOrdersCount > 0;

            return (
              <div key={group.id} className="rounded-xl border border-[#233B5D]/60 overflow-hidden bg-[#121E30]/60">
                {/* Accordion Group Header */}
                <button
                  onClick={() => setOpenGroupId((prev) => (prev === group.id ? null : group.id))}
                  className={`w-full flex items-center justify-between p-3.5 text-right font-black text-sm cursor-pointer transition-colors ${
                    hasActiveChild ? 'bg-[#233B5D] text-white' : 'text-slate-200 hover:bg-[#1E3352]'
                  }`}
                  aria-expanded={isGroupOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon className={`w-5 h-5 shrink-0 ${hasActiveChild ? 'text-[#4B83B8]' : 'text-slate-400'}`} />
                    <span className="truncate">{group.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasUrgent && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black font-mono rounded-full bg-rose-500 text-white">
                        {urgentOrdersCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isGroupOpen ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Submenu Items */}
                {isGroupOpen && (
                  <div className="p-2 space-y-1 bg-[#16253B]/90 border-t border-[#233B5D]/60">
                    {group.items.map((item: NavItemConfig) => {
                      const ItemIcon = item.icon;
                      const isActive = activeTab === item.id;
                      const badgeVal = item.badgeKey === 'urgentOrders' ? urgentOrdersCount : 0;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            onClose();
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold text-xs transition-all text-right cursor-pointer ${
                            isActive
                              ? 'bg-[#4B83B8] text-white shadow-sm font-black'
                              : 'text-slate-300 hover:text-white hover:bg-[#1E3352]'
                          }`}
                        >
                          <ItemIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badgeVal > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black font-mono rounded-full bg-rose-600 text-white shrink-0">
                              {badgeVal}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#233B5D] bg-[#121E30] shrink-0">
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#16253B] border border-[#233B5D]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4B83B8]" />
              <span className="text-xs font-bold text-white">
                نظام إدارة مصنع النجار
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">v2.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};
