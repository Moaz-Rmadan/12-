import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'warning';
}

interface FeedbackContextType {
  showToast: (message: string, tone?: ToastTone, durationMs?: number) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const timersRef = useRef<Record<string, number>>({});

  const dismissToast = useCallback((id: string) => {
    if (timersRef.current[id]) {
      window.clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs = 4200) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);

      timersRef.current[id] = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast]
  );

  const confirmAction = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmClose = (accepted: boolean) => {
    if (!confirmState) return;
    const { resolve } = confirmState;
    setConfirmState(null);
    resolve(accepted);
  };

  return (
    <FeedbackContext.Provider value={{ showToast, confirmAction }}>
      {children}

      {/* Non-blocking RTL Toast Stack */}
      <div
        className="no-print fixed bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-[120] flex flex-col gap-2 pointer-events-none"
        dir="rtl"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const styles =
            toast.tone === 'success'
              ? 'bg-emerald-950/95 text-emerald-50 border-emerald-600/60'
              : toast.tone === 'error'
              ? 'bg-rose-950/95 text-rose-50 border-rose-600/60'
              : toast.tone === 'warning'
              ? 'bg-amber-950/95 text-amber-50 border-amber-500/60'
              : 'bg-[#16253B]/95 text-slate-50 border-[#4B83B8]/60';

          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'error'
              ? XCircle
              : toast.tone === 'warning'
              ? AlertTriangle
              : Info;

          const iconColor =
            toast.tone === 'success'
              ? 'text-emerald-400'
              : toast.tone === 'error'
              ? 'text-rose-400'
              : toast.tone === 'warning'
              ? 'text-amber-400'
              : 'text-[#4B83B8]';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-bold transition-all animate-fade-in ${styles}`}
              role="status"
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <span className="flex-1 leading-relaxed">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-300 hover:text-white p-0.5 rounded-lg cursor-pointer shrink-0"
                aria-label="إغلاق الإشعار"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmState && (
        <div
          className="no-print fixed inset-0 z-[130] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          dir="rtl"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#16253B] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.options.tone === 'danger'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                    : confirmState.options.tone === 'warning'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    : 'bg-[#EBF3FA] text-[#233B5D] dark:bg-slate-800 dark:text-[#4B83B8]'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {confirmState.options.cancelLabel || 'إلغاء'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm cursor-pointer transition-colors ${
                  confirmState.options.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmState.options.tone === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#233B5D] hover:bg-[#1E3352]'
                }`}
              >
                {confirmState.options.confirmLabel || 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export function useFeedback(): FeedbackContextType {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return ctx;
}
