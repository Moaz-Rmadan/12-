import React, { useState, useEffect } from 'react';
import {
  DEFAULT_FACTORY_SETTINGS,
  FactorySettings,
  getStoredFactorySettings,
  saveStoredFactorySettings,
} from '../utils/settingsStore';
import { UserProfile } from '../types/auth';
import { useFeedback } from '../contexts/FeedbackContext';
import {
  Settings,
  Building2,
  Sliders,
  Database,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  RotateCcw,
  Download,
} from 'lucide-react';

interface SettingsViewProps {
  userProfile: UserProfile | null;
  syncedSettings?: FactorySettings | null;
  onSaveSettingsToCloud?: (settings: FactorySettings) => Promise<void>;
  onExportBackup?: () => void;
  onImportBackup?: (jsonData: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  syncedSettings,
  onSaveSettingsToCloud,
  onExportBackup,
}) => {
  const { confirmAction } = useFeedback();
  const [settings, setSettings] = useState<FactorySettings>(() =>
    syncedSettings || getStoredFactorySettings()
  );
  const [newBranchInput, setNewBranchInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (syncedSettings) {
      setSettings(syncedSettings);
    }
  }, [syncedSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      saveStoredFactorySettings(settings);
      if (onSaveSettingsToCloud) {
        await onSaveSettingsToCloud(settings);
      }
      setFeedback({
        type: 'success',
        message: 'تم حفظ إعدادات المصنع والتطبيق بنجاح وتحديث النظام.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر حفظ الإعدادات.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBranch = () => {
    const trimmed = newBranchInput.trim();
    if (!trimmed) return;
    if (settings.branchesList.includes(trimmed)) return;
    setSettings((prev) => ({
      ...prev,
      branchesList: [...prev.branchesList, trimmed],
    }));
    setNewBranchInput('');
  };

  const handleRemoveBranch = (branchToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      branchesList: prev.branchesList.filter((b) => b !== branchToRemove),
    }));
  };

  const handleResetToDefault = async () => {
    const confirmed = await confirmAction({
      title: 'استعادة الإعدادات الافتراضية',
      message: 'هل أنت متأكد من استعادة إعدادات المصنع الافتراضية؟',
      confirmLabel: 'استعادة الافتراضي',
      tone: 'warning',
    });
    if (!confirmed) return;

    saveStoredFactorySettings(DEFAULT_FACTORY_SETTINGS);
    if (onSaveSettingsToCloud) {
      await onSaveSettingsToCloud(DEFAULT_FACTORY_SETTINGS).catch(() => {});
    }
    setSettings(DEFAULT_FACTORY_SETTINGS);
    setFeedback({
      type: 'success',
      message: 'تمت استعادة الإعدادات الافتراضية بنجاح.',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3352] text-white p-6 sm:p-8 rounded-3xl border border-[#4B83B8]/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-[#4B83B8]/15 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-bold tracking-wide mb-2">
            <Settings className="w-4 h-4" />
            <span>Enterprise Settings & Configuration Hub</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black font-serif text-white tracking-tight">
            إعدادات النظام والتحكم المركزي
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl">
            إدارة بيانات المصنع، فروع التسليم الرسمية، قواعد التكويد الآلي، وصلاحيات النظام.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer border border-white/15"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-bold shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Factory Branding & Identity */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                هوية المصنع والترويسة الرسمية
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                الاسم والعنوان الذي يظهر في أعلى العقود، كروت الورش، وإقرارات الاستلام.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                اسم المصنع / الشركة الرئيسي:
              </label>
              <input
                type="text"
                value={settings.factoryName}
                onChange={(e) => setSettings({ ...settings, factoryName: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                العنوان الفرعي (Subtitle):
              </label>
              <input
                type="text"
                value={settings.factorySubtitle}
                onChange={(e) => setSettings({ ...settings, factorySubtitle: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Branches and Delivery Points */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                فروع ومقرات الاستلام المعتمدة
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                الفروع التي يتم الاختيار منها عند إصدار إقرار استلام العميل أو حمولة العربية.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newBranchInput}
                onChange={(e) => setNewBranchInput(e.target.value)}
                placeholder="أضف فرعاً جديداً (مثلاً: فرع سموحة - الإسكندرية)..."
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddBranch}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-md shadow-indigo-950/30"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فرع</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {settings.branchesList.map((branch) => (
                <div
                  key={branch}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {branch}
                  </span>
                  {settings.branchesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(branch)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="حذف الفرع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Numbering Prefixes */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                بادئات التكويد الآلي للمستندات
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                تحكم في نمط الأكواد التسلسلية لأوامر الشغل وإقرارات الاستلام.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                بادئة رقم أمر الشغل (Order Prefix):
              </label>
              <input
                type="text"
                value={settings.orderNumberPrefix}
                onChange={(e) => setSettings({ ...settings, orderNumberPrefix: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                بادئة إقرار الاستلام (Receipt Prefix):
              </label>
              <input
                type="text"
                value={settings.receiptNumberPrefix}
                onChange={(e) => setSettings({ ...settings, receiptNumberPrefix: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-4 pt-4">
          {onExportBackup && (
            <button
              type="button"
              onClick={onExportBackup}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-black transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-xl shadow-emerald-950/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ واعتماد التغييرات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
