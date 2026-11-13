import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  X,
  Bell,
  CheckCircle,
  Package,
  Wrench,
  Tag,
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';

export const NotificationsDrawer: React.FC = () => {
  const {
    isNotificationsOpen,
    setIsNotificationsOpen,
    notifications,
    markNotifAsRead,
    markAllNotifsAsRead,
    deleteNotification,
    clearAllNotifications
  } = useApp();

  if (!isNotificationsOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'repair':
        return <Wrench className="w-4 h-4 text-emerald-500" />;
      case 'promo':
        return <Tag className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end animate-in fade-in"
      onClick={() => setIsNotificationsOpen(false)}
    >
      <div
        className="w-full max-w-sm h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Notifications & Alerts
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllNotifsAsRead}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  title="Mark all as read"
                >
                  <Check className="w-3.5 h-3.5" /> Read all
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              </>
            )}
            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="font-medium text-slate-500 dark:text-slate-400">No active notifications</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Alerts for repairs and orders will appear here</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markNotifAsRead(notif.id)}
                className={`group relative p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  notif.read
                    ? 'bg-slate-50 dark:bg-[#151515] border-slate-200 dark:border-[#222] text-slate-500 dark:text-[#888]'
                    : 'bg-white dark:bg-[#1a1a1a] border-cyan-200 dark:border-cyan-900/60 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-cyan-500/10'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5">
                      <strong className="truncate font-semibold text-slate-900 dark:text-white">
                        {notif.title}
                      </strong>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1.5 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Individual (X) Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Clear this notification"
                  aria-label="Clear notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
