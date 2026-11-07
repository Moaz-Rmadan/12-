import { JobOrderPopulated } from '../types';

export type FurnitureCategory =
  | 'all'
  | 'master_bedroom' // غرفة نوم كبيرة
  | 'living_room'    // انتريه
  | 'youth_bedroom'  // غرفة شبابي
  | 'corner_sofa'    // ركنة
  | 'lazy_boy'       // كرسي ليزي بوي
  | 'shoe_cabinet'   // جزامة ومكملات
  | 'dining_room'    // سفرة
  | 'other';         // أخرى

export interface CategoryInfo {
  id: FurnitureCategory;
  name: string;
  shortName: string;
  iconType: string;
  colorBorder: string;
  activeClass: string;
  badgeClass: string;
  dotColor: string;
}

export const FURNITURE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'master_bedroom',
    name: 'غرفة نوم كبيرة (ماستر)',
    shortName: 'نوم كبيرة',
    iconType: 'bed-double',
    colorBorder: 'border-amber-400 dark:border-amber-600',
    activeClass: 'bg-amber-900 text-amber-100 ring-2 ring-amber-500 shadow-md',
    badgeClass: 'bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'living_room',
    name: 'انتريه وصالون',
    shortName: 'انتريه',
    iconType: 'armchair',
    colorBorder: 'border-blue-400 dark:border-blue-600',
    activeClass: 'bg-blue-900 text-blue-100 ring-2 ring-blue-500 shadow-md',
    badgeClass: 'bg-blue-100 text-blue-950 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'youth_bedroom',
    name: 'غرفة شبابي / أطفال',
    shortName: 'غرفة شبابي',
    iconType: 'bed',
    colorBorder: 'border-indigo-400 dark:border-indigo-600',
    activeClass: 'bg-indigo-900 text-indigo-100 ring-2 ring-indigo-500 shadow-md',
    badgeClass: 'bg-indigo-100 text-indigo-950 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'corner_sofa',
    name: 'ركنة مودرن وزاوية',
    shortName: 'ركنة',
    iconType: 'sofa',
    colorBorder: 'border-emerald-400 dark:border-emerald-600',
    activeClass: 'bg-emerald-900 text-emerald-100 ring-2 ring-emerald-500 shadow-md',
    badgeClass: 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'lazy_boy',
    name: 'كرسي ليزي بوي ريلاينر',
    shortName: 'ليزي بوي',
    iconType: 'rotate',
    colorBorder: 'border-rose-400 dark:border-rose-600',
    activeClass: 'bg-rose-900 text-rose-100 ring-2 ring-rose-500 shadow-md',
    badgeClass: 'bg-rose-100 text-rose-950 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'shoe_cabinet',
    name: 'جزامة ومكتبات ومكملات',
    shortName: 'جزامة ومكملات',
    iconType: 'boxes',
    colorBorder: 'border-purple-400 dark:border-purple-600',
    activeClass: 'bg-purple-900 text-purple-100 ring-2 ring-purple-500 shadow-md',
    badgeClass: 'bg-purple-100 text-purple-950 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'dining_room',
    name: 'غرفة سفرة وبوفيه',
    shortName: 'سفرة',
    iconType: 'utensils',
    colorBorder: 'border-teal-400 dark:border-teal-600',
    activeClass: 'bg-teal-900 text-teal-100 ring-2 ring-teal-500 shadow-md',
    badgeClass: 'bg-teal-100 text-teal-950 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    dotColor: 'bg-teal-500',
  },
];

export function getOrderCategory(order: JobOrderPopulated): FurnitureCategory {
  const text = `${order.room_model_code} ${order.general_specs} ${order.job_details?.installation_notes || ''}`.toLowerCase();

  // 1. كرسي ليزي بوي (الأولوية الأولى)
  if (text.includes('ليزي') || text.includes('ليزى') || text.includes('ريلاينر') || text.includes('lazy')) {
    return 'lazy_boy';
  }

  // 2. جزامة ومكملات ومكتبات
  if (text.includes('جزام') || text.includes('مكتبة') || text.includes('مكتبه') || text.includes('منجاوي')) {
    return 'shoe_cabinet';
  }

  // 3. ركنة
  if (
    text.includes('ركنة') ||
    text.includes('ركنه') ||
    text.includes('جاكوار') ||
    text.includes('جاجور') ||
    text.includes('اوميجا') ||
    (text.includes('فينيسيا') && text.includes('بفات'))
  ) {
    return 'corner_sofa';
  }

  // 4. غرفة شبابي / أطفال
  if (
    text.includes('شبابي') ||
    text.includes('شبابى') ||
    text.includes('أطفال') ||
    text.includes('اطفال') ||
    text.includes('روجينا') ||
    text.includes('ريماس') ||
    text.includes('اكسات') ||
    text.includes('2 سرير 1.20') ||
    text.includes('سرير 1.20')
  ) {
    return 'youth_bedroom';
  }

  // 5. غرفة سفرة
  if (
    text.includes('سفرة') ||
    text.includes('سفره') ||
    text.includes('شجره') ||
    text.includes('شجرة') ||
    text.includes('جلاكسي') ||
    text.includes('جالاكسي') ||
    text.includes('كراسي سفرة') ||
    text.includes('بوفيه')
  ) {
    return 'dining_room';
  }

  // 6. انتريه
  if (
    text.includes('انتريه') ||
    text.includes('انترية') ||
    text.includes('لوجي') ||
    text.includes('فاصوليا') ||
    text.includes('مارفيل') ||
    text.includes('طقم انتريه') ||
    ((text.includes('كنبه') || text.includes('كنبة')) && !text.includes('ركن'))
  ) {
    return 'living_room';
  }

  // 7. غرفة نوم كبيرة (ماستر)
  if (
    text.includes('نوم') ||
    text.includes('روما') ||
    text.includes('ميلانو') ||
    text.includes('فينيسيا') ||
    text.includes('فينسا') ||
    text.includes('دولاب') ||
    text.includes('دريسنج') ||
    text.includes('كمود') ||
    text.includes('سرير') ||
    text.includes('فرج')
  ) {
    return 'master_bedroom';
  }

  return 'other';
}

export function getCategoryCounts(orders: JobOrderPopulated[]): Record<FurnitureCategory, number> {
  const counts: Record<FurnitureCategory, number> = {
    all: orders.length,
    master_bedroom: 0,
    living_room: 0,
    youth_bedroom: 0,
    corner_sofa: 0,
    lazy_boy: 0,
    shoe_cabinet: 0,
    dining_room: 0,
    other: 0,
  };

  orders.forEach((o) => {
    const cat = getOrderCategory(o);
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return counts;
}

export function getCategoryBadge(category: FurnitureCategory): CategoryInfo | undefined {
  return FURNITURE_CATEGORIES.find((c) => c.id === category);
}
