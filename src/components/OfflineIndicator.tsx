import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-950 text-amber-100 border border-amber-500/50 px-4 py-2.5 text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce">
      <div className="p-1 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
        <WifiOff className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="font-extrabold text-amber-200">وضع أوفلاين (بدون إنترنت)</span>
        <span className="text-[10px] text-amber-300/80 font-medium">يتم الحفظ محلياً وسوف يتم التزامن فور الاتصال</span>
      </div>
      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0 mr-1" />
    </div>
  );
};
