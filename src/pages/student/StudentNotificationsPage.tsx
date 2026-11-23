import React from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  ArrowRight,
  Check
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';

interface StudentNotificationsPageProps {
  onNavigate: (viewId: string) => void;
}

export const StudentNotificationsPage: React.FC<StudentNotificationsPageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const notifications = currentUser ? db.getNotifications(currentUser.id) : [];

  const handleMarkAll = () => {
    if (currentUser) {
      db.markAllNotificationsAsRead(currentUser.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Notifications & Academic Alerts</h2>
          <p className="text-xs text-slate-500">
            Official attendance notifications, low percentage warnings, and lecture updates
          </p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <Check className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No notifications available.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                db.markNotificationAsRead(notif.id);
                if (notif.link) {
                  if (notif.link.includes('dashboard')) onNavigate('student-overview');
                  else if (notif.link.includes('timetable')) onNavigate('student-timetable');
                  else if (notif.link.includes('correction')) onNavigate('student-correction');
                  else onNavigate('student-overview');
                }
              }}
              className={`p-4 flex items-start gap-4 hover:bg-slate-50 cursor-pointer transition ${
                !notif.is_read ? 'bg-blue-50/30' : ''
              }`}
            >
              {getIcon(notif.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(notif.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                  {notif.message}
                </p>
                {notif.link && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-2">
                    Open related page <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
