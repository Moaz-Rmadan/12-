import React, { useState, useEffect, useRef } from 'react';
import {
  Hammer,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { NAV_GROUPS, NavGroupConfig, NavItemConfig, getNavGroupForTab } from './navConfig';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessTab } from '../../lib/permissions';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  urgentOrdersCount?: number;
  totalOrdersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  urgentOrdersCount = 0,
}) => {
  // Single-Open Accordion State: only one group is open at a time
  const currentParentGroup = getNavGroupForTab(activeTab);
  const [openGroupId, setOpenGroupId] = useState<string | null>(
    () => currentParentGroup?.id || 'operations'
  );

  // Popover state for collapsed mode
  const [activePopoverGroupId, setActivePopoverGroupId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { userProfile } = useAuth();
  const visibleGroups = React.useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessTab(userProfile, item.id)),
    })).filter((group) => group.items.length > 0);
  }, [userProfile]);

  // Automatically expand the parent group of the active tab whenever activeTab changes
  useEffect(() => {
    const parent = getNavGroupForTab(activeTab);
    if (parent && parent.id !== openGroupId) {
      setOpenGroupId(parent.id);
    }
  }, [activeTab]);

  // Close collapsed popover on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopoverGroupId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopoverGroupId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Accordion click handler: single-open logic
  const handleGroupHeaderClick = (groupId: string) => {
    if (isCollapsed) {
      // In collapsed mode, toggle the floating popover submenu
      setActivePopoverGroupId((prev) => (prev === groupId ? null : groupId));
    } else {
      // In expanded mode: if already open, collapse it; if different group, open it and close previous
      setOpenGroupId((prev) => (prev === groupId ? null : groupId));
    }
  };

  return (
    <aside
      className={`no-print hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#16253B] text-slate-100 border-l border-[#233B5D]/80 select-none ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
      aria-label="القائمة الجانبية للنظام"
    >
      {/* 1. Sidebar Header */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-[#233B5D]/80 shrink-0 bg-[#121E30]">
        <div
          onClick={() => setActiveTab('executive-dashboard')}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
          title="الذهاب للداشبورد الرئيسي"
        >
          {/* Brand Logo Icon */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4B83B8] via-[#335C8A] to-[#1E3A61] flex items-center justify-center text-white shadow-md shadow-[#4B83B8]/20 border border-[#4B83B8]/40 shrink-0 group-hover:scale-105 transition-transform">
            <Hammer className="w-5 h-5 stroke-[2.4]" />
          </div>

          {/* Brand Text (when expanded) */}
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <span className="text-base font-black tracking-tight text-white block leading-snug truncate group-hover:text-[#4B83B8] transition-colors">
                النجار فيرنتشر
              </span>
              <span className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase truncate">
                EL-NAGGAR ERP
              </span>
            </div>
          )}
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            setActivePopoverGroupId(null);
          }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#233B5D] transition-colors cursor-pointer shrink-0 border border-[#233B5D] ${
            isCollapsed ? 'mx-auto mt-0' : ''
          }`}
          title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          aria-label={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
          ) : (
            <ChevronRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
          )}
        </button>
      </div>

      {/* 2. Navigation Accordion Groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-2.5 scrollbar-thin">
        {visibleGroups.map((group: NavGroupConfig) => {
          const GroupIcon = group.icon;
          const isGroupOpen = openGroupId === group.id;
          const hasActiveChild = group.items.some((item) => item.id === activeTab);
          const hasUrgent = group.items.some((item) => item.badgeKey === 'urgentOrders') && urgentOrdersCount > 0;
          const isPopoverOpen = activePopoverGroupId === group.id;

          return (
            <div key={group.id} className="relative">
              {/* Accordion Group Header Button */}
              <button
                onClick={() => handleGroupHeaderClick(group.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer text-right group ${
                  hasActiveChild
                    ? 'bg-[#233B5D] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-[#1E3352]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                aria-expanded={!isCollapsed ? isGroupOpen : isPopoverOpen}
                aria-controls={`accordion-group-${group.id}`}
              >
                {/* Group Icon */}
                <div
                  className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                    hasActiveChild ? 'text-[#4B83B8]' : 'text-slate-400 group-hover:text-[#4B83B8]'
                  }`}
                >
                  <GroupIcon className="w-5 h-5 stroke-[2]" />
                </div>

                {/* Group Title and Chevron (when expanded) */}
                {!isCollapsed && (
                  <>
                    <div className="flex-1 text-right min-w-0">
                      <span className="truncate block font-black text-xs text-slate-100">
                        {group.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasUrgent && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black font-mono rounded-full bg-rose-500 text-white animate-pulse">
                          {urgentOrdersCount}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          isGroupOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </div>
                  </>
                )}

                {/* Collapsed Mode Badge Indicator */}
                {isCollapsed && hasUrgent && (
                  <span className="absolute top-1.5 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#16253B]" />
                )}
              </button>

              {/* Accordion Child Items (Expanded Desktop Mode) */}
              {!isCollapsed && isGroupOpen && (
                <div
                  id={`accordion-group-${group.id}`}
                  className="mt-1 mr-4 pr-3 border-r-2 border-[#233B5D] space-y-1 py-1 transition-all duration-200"
                >
                  {group.items.map((item: NavItemConfig) => {
                    const ItemIcon = item.icon;
                    const isActive = activeTab === item.id;
                    const badgeVal = item.badgeKey === 'urgentOrders' ? urgentOrdersCount : 0;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-right cursor-pointer group ${
                          isActive
                            ? 'bg-[#4B83B8] text-white shadow-sm font-black'
                            : 'text-slate-300 hover:text-white hover:bg-[#1E3352]/70'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
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

              {/* Floating Submenu Popover for Collapsed Mode (Positioned toward center/left in RTL) */}
              {isCollapsed && isPopoverOpen && (
                <div
                  ref={popoverRef}
                  className="absolute z-50 top-0 right-full mr-3 w-64 bg-[#121E30] text-slate-100 rounded-xl shadow-2xl border border-[#233B5D] p-3 space-y-2 animate-fade-in"
                  role="menu"
                >
                  <div className="pb-2 border-b border-[#233B5D]/80 flex items-center justify-between">
                    <span className="text-xs font-black text-[#4B83B8]">{group.title}</span>
                    <span className="text-[10px] text-slate-400">{group.items.length} عناصر</span>
                  </div>

                  <div className="space-y-1">
                    {group.items.map((item: NavItemConfig) => {
                      const ItemIcon = item.icon;
                      const isActive = activeTab === item.id;
                      const badgeVal = item.badgeKey === 'urgentOrders' ? urgentOrdersCount : 0;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setActivePopoverGroupId(null);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-right cursor-pointer ${
                            isActive
                              ? 'bg-[#4B83B8] text-white shadow-sm font-black'
                              : 'text-slate-300 hover:text-white hover:bg-[#1E3352]'
                          }`}
                          role="menuitem"
                        >
                          <ItemIcon className="w-4 h-4 shrink-0 text-slate-400" />
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
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. Sidebar Footer */}
      <div className="p-3 border-t border-[#233B5D]/80 bg-[#121E30] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#16253B] border border-[#233B5D]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#4B83B8]/20 flex items-center justify-center text-[#4B83B8] shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block leading-tight truncate">
                  مصنع النجار للأثاث
                </span>
                <span className="text-[10px] text-slate-400 block truncate font-mono">
                  ERP Suite v2.5
                </span>
              </div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" title="النظام متصل سحابياً" />
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" title="النظام متصل سحابياً" />
          </div>
        )}
      </div>
    </aside>
  );
};
