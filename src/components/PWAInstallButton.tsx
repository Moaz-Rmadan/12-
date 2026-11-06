import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, Sparkles } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If app is already installed and running as standalone PWA, hide install button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop install button flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-amber-950 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 hover:from-amber-200 hover:to-amber-300 shadow-md hover:shadow-lg transition-all cursor-pointer border border-amber-400/80 shrink-0 active:scale-95"
        title="تثبيت التطبيق على جهاز الكمبيوتر أو الموبايل للعمل أوفلاين"
      >
        <Download className="w-4 h-4 text-amber-900 animate-bounce" />
        <span className="hidden sm:inline">تثبيت التطبيق على الجهاز</span>
        <span className="sm:hidden">تثبيت التطبيق</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors cursor-pointer shrink-0"
        >
          <Smartphone className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>تثبيت على الآيفون</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black font-serif">تثبيت التطبيق على iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed font-bold">
                <div className="p-3 bg-amber-50 dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-slate-700 space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-800 text-amber-100 flex items-center justify-center font-mono font-black shrink-0 text-[10px]">1</span>
                    <span>اضغط على زر <strong>مشاركة (Share ⎋)</strong> في أسفل متصفح Safari.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-800 text-amber-100 flex items-center justify-center font-mono font-black shrink-0 text-[10px]">2</span>
                    <span>مرر للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen ➕)</strong>.</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                تم، فهمت الخطوات
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
