import React from 'react';
import { useApp } from '../context/AppContext.js';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toast, hideToast } = useApp();

  if (!toast || !toast.visible) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getBorder = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-200 dark:border-emerald-900';
      case 'error':
        return 'border-red-200 dark:border-red-900';
      default:
        return 'border-blue-200 dark:border-blue-900';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-70 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
      <div
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border ${getBorder()} shadow-2xl flex items-start gap-3`}
      >
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <strong className="block text-xs font-bold text-slate-900 dark:text-white">
            {toast.title}
          </strong>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {toast.message}
          </p>
        </div>
        <button
          onClick={hideToast}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
