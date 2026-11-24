import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { notificationsService } from '../../../services/notifications.service';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Tabs,
} from '../../../components/ui';
import {
  ROUTES,
  resolveNotificationLink,
} from '../../../app/config/navigation';
import { cn } from '../../../lib/cn';

export const StudentNotificationsPage: React.FC = () => {
  useDatabaseVersion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');

  const notifications = currentUser
    ? notificationsService.getNotifications(currentUser.id)
    : [];
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const displayed =
    filterTab === 'unread' ? unreadNotifications : notifications;

  const markRead = async (id?: string) => {
    if (!currentUser) return;
    try {
      if (id) await notificationsService.markAsRead(id);
      else await notificationsService.markAllAsRead(currentUser.id);
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to update notifications', description: err instanceof Error ? err.message : undefined });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-brand-500 shrink-0" />;
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Notifications & Academic Alerts"
        description="Official attendance shortage warnings, timetable rescheduling alerts, and dispute updates"
        actions={
          unreadNotifications.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Check className="w-3.5 h-3.5" />}
              onClick={() => void markRead()}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        options={[
          { value: 'all', label: 'All Notices', count: notifications.length },
          {
            value: 'unread',
            label: 'Unread',
            count: unreadNotifications.length,
          },
        ]}
        value={filterTab}
        onChange={setFilterTab}
      />

      <Card className="overflow-hidden">
        {displayed.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-5 h-5" />}
            title={
              filterTab === 'unread'
                ? 'No unread notifications'
                : 'No notifications available'
            }
            description={
              filterTab === 'unread'
                ? 'You are all caught up on academic alerts and schedule updates.'
                : 'Official advisories and class updates will appear here.'
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {displayed.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => {
                  void markRead(notif.id);
                  if (notif.link) {
                    navigate(
                      resolveNotificationLink(notif.link) ||
                        ROUTES.STUDENT_OVERVIEW
                    );
                  }
                }}
                className={cn(
                  'w-full text-left px-5 py-4 flex items-start gap-3.5 hover:bg-subtle/60 transition-colors',
                  !notif.is_read && 'bg-brand-50/40'
                )}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle border border-border">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                      <h4 className="text-xs sm:text-sm font-semibold text-primary truncate">
                        {notif.title}
                      </h4>
                    </div>
                    <span className="text-[11px] text-muted font-mono tabular-nums shrink-0">
                      {new Date(notif.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-secondary mt-1 leading-relaxed whitespace-pre-line">
                    {notif.message}
                  </p>

                  {notif.link && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 mt-2">
                      <span>Open related page</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
