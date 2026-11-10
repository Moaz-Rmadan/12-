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
  LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  badgeKey?: 'urgentOrders' | 'ordersCount';
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
        label: 'الداشبورد والاستعلام الشامل',
        shortLabel: 'الداشبورد',
        icon: LayoutDashboard,
        description: 'مؤشرات الأداء العامة والبحث الشامل',
      },
    ],
  },
  {
    id: 'operations',
    title: 'التصنيع وأوامر الشغل',
    icon: Hammer,
    description: 'إدارة الإنتاج، الورش، ومتابعة المراحل',
    items: [
      {
        id: 'orders',
        label: 'أوامر الشغل والورش',
        shortLabel: 'الأوامر',
        icon: ClipboardList,
        description: 'متابعة وتحديث أوامر الورش والتصنيع',
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
