export interface FactorySettings {
  factoryName: string;
  factorySubtitle: string;
  defaultBranch: string;
  branchesList: string[];
  orderNumberPrefix: string;
  receiptNumberPrefix: string;
  enableUrgentAlerts: boolean;
  defaultTaxRate: number;
}

export const DEFAULT_FACTORY_SETTINGS: FactorySettings = {
  factoryName: 'النجار فيرنتشر',
  factorySubtitle: 'El-Naggar Furniture Factory & Design',
  defaultBranch: '84 جوزيف تيتو - النزهة الجديدة',
  branchesList: [
    '84 جوزيف تيتو - النزهة الجديدة',
    '29 مكرم عبيد - مدينة نصر',
    '51 نبيل الوقاد - أرض الجولف',
    'طريق بورسعيد - دمياط',
    'تسليم مباشر بموقع العميل',
  ],
  orderNumberPrefix: 'JO-2026-',
  receiptNumberPrefix: 'DR-2026-',
  enableUrgentAlerts: true,
  defaultTaxRate: 0,
};

export function getStoredFactorySettings(): FactorySettings {
  if (typeof window === 'undefined') return DEFAULT_FACTORY_SETTINGS;
  try {
    const raw = localStorage.getItem('elnaggar_factory_settings');
    if (!raw) return DEFAULT_FACTORY_SETTINGS;
    return { ...DEFAULT_FACTORY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FACTORY_SETTINGS;
  }
}

export function saveStoredFactorySettings(settings: FactorySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('elnaggar_factory_settings', JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}
