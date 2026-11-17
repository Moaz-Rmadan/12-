import {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Users,
  FileCheck,
  Truck,
  Award,
  ShieldAlert,
  Activity,
  FileText,
  Hammer,
  BarChart3,
  ShieldCheck,
  Search,
  Bot,
  PackageCheck,
  Archive,
  LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  badgeKey?: 'urgentOrders' | 'ordersCount' | 'deliveredCount';
  description?: string;
}

export interface NavGroupConfig {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
  items: NavItemConfig[];
}

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'overview',
    title: 'الرئيسية والمؤشرات',
    icon: LayoutDashboard,
    description: 'لوحة القيادة ومؤشرات الأداء العامة',
    items: [
      {
        id: 'executive-dashboard',
        label: 'لوحة القيادة التنفيذية',
        shortLabel: 'لوحة القيادة',
        icon: LayoutDashboard,
        description: 'نبض المصنع اللحظي، مؤشرات الأداء، اختناقات الورش، والوصول السريع',
      },
      {
        id: 'smart-search',
        label: 'البحث الشامل وحصر الغرف والشهور',
        shortLabel: 'البحث الشامل',
        icon: Search,
        description: 'مركز استعلام الشهور، حصر وتصنيف غرف الورشة، والتدقيق المالي والتسليمات',
      },
    ],
  },
  {
    id: 'operations',
    title: 'التصنيع وأوامر الشغل',
    icon: Hammer,
    description: 'إدارة الإنتاج، التسليمات، والأرشيف',
    items: [
      {
        id: 'orders',
        label: 'أوامر الشغل الجارية',
        shortLabel: 'الأوامر الجارية',
        icon: ClipboardList,
        description: 'أوامر الورش المفتوحة حالياً بالمصنع (يختفي منها الأمر فور تسليمه)',
      },
      {
        id: 'deliveries',
        label: 'التسليمات ومتابعة التحصيل',
        shortLabel: 'التسليمات',
        icon: PackageCheck,
        badgeKey: 'deliveredCount',
        description: 'الأوامر المسلمة قيد متابعة باقي الحساب وإقرارات الاستلام قبل الأرشفة',
      },
      {
        id: 'archive',
        label: 'الأرشيف والسجل التاريخي',
        shortLabel: 'الأرشيف',
        icon: Archive,
        description: 'السجل التاريخي للأوامر المغلقة نهائياً والمواصفات الفنية السابقة',
      },
      {
        id: 'template-studio',
        label: 'مولد كروت أمر الشغل',
        shortLabel: 'مولد الأوامر',
        icon: Sparkles,
        description: 'توليد كروت الورش وتنسيق مواصفات الموديل',
      },
      {
        id: 'bottleneck-report',
        label: 'مراحل الإنتاج والاختناقات',
        shortLabel: 'مراحل الإنتاج',
        icon: Activity,
        description: 'توزيع القطع على غرف النجارة والأستر والتنجيد',
      },
      {
        id: 'ai-assistant',
        label: 'مساعد الورشة الذكي',
        shortLabel: 'مساعد الجودة',
        icon: Bot,
        description: 'تدقيق المواصفات والمقاسات وأكواد الأقمشة والـ Batch بالذكاء الاصطناعي',
      },
    ],
  },
  {
    id: 'logistics',
    title: 'العملاء واللوجستيات',
    icon: Truck,
    description: 'سجلات العملاء، التسليمات، وشيتات الشحن',
    items: [
      {
        id: 'customers',
        label: 'دليل وسجل العملاء',
        shortLabel: 'العملاء',
        icon: Users,
        description: 'سجل العملاء وبيانات التواصل وعقودهم',
      },
      {
        id: 'receipt',
        label: 'إقرار استلام عميل',
        shortLabel: 'إقرار استلام',
        icon: FileCheck,
        description: 'نموذج محضر تسليم العميل النهائي',
      },
      {
        id: 'truck-manifest',
        label: 'حمولة العربية (شيت الشحن)',
        shortLabel: 'حمولة العربية',
        icon: Truck,
        description: 'كشف شحن البضائع وتسليمات السائقين',
      },
    ],
  },
  {
    id: 'reports',
    title: 'التقارير التحليلية',
    icon: BarChart3,
    description: 'تقارير التسليمات، المتأخرات، والمبيعات',
    items: [
      {
        id: 'critical-report',
        label: 'الأوامر الحرجة والمتأخرة',
        shortLabel: 'الأوامر الحرجة',
        icon: ShieldAlert,
        badgeKey: 'urgentOrders',
        description: 'أوامر الشغل المستحقة خلال 48 ساعة أو المتأخرة',
      },
      {
        id: 'top-models',
        label: 'أكثر الموديلات مبيعاً',
        shortLabel: 'الأكثر مبيعاً',
        icon: Award,
        description: 'إحصائيات المبيعات والغرف الأكثر طلباً',
      },
      {
        id: 'delivery-report',
        label: 'تقرير التسليمات الشهرية',
        shortLabel: 'التسليمات',
        icon: FileText,
        description: 'سجل التسليمات والأرشفة الشهرية',
      },
    ],
  },
  {
    id: 'administration',
    title: 'الإدارة والحوكمة',
    icon: ShieldCheck,
    description: 'إدارة المستخدمين والصلاحيات وسجلات التدقيق',
    items: [
      {
        id: 'user-management',
        label: 'إدارة المستخدمين والصلاحيات',
        shortLabel: 'المستخدمين',
        icon: Users,
        description: 'إدارة أدوار النظام الأربعة والتفويضات وسجل التدقيق',
      },
    ],
  },
];

// Flat list for easy lookup
export const ALL_NAV_ITEMS: NavItemConfig[] = NAV_GROUPS.flatMap((group) => group.items);

export function getNavItemById(id: string): NavItemConfig | undefined {
  return ALL_NAV_ITEMS.find((item) => item.id === id);
}

export function getNavGroupForTab(tabId: string): NavGroupConfig | undefined {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.id === tabId));
}
