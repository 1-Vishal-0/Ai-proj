import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDatabaseVersion } from '../../hooks/useDatabase';
import { useToast } from '../../hooks/useToast';
import { notificationsService } from '../../services/notifications.service';
import {
  ROUTES,
  getBreadcrumbsForPath,
  resolveNotificationLink,
} from '../../app/config/navigation';
import { Avatar } from '../ui/Avatar';
import { DropdownMenu } from '../ui/Select';
import { Tooltip } from '../ui/Tooltip';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarCollapsed,
  onToggleCollapse,
  onToggleMobileMenu,
}) => {
  useDatabaseVersion();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, selectDemoAccount } = useAuth();
  const { toast } = useToast();

  const role = currentUser?.role || 'admin';
  const crumbs = getBreadcrumbsForPath(location.pathname, role);
  const notifications = currentUser
    ? notificationsService.getNotifications(currentUser.id)
    : [];
  const unreadNotifs = notifications.filter((n) => !n.is_read);

  const markRead = async (id?: string) => {
    if (!currentUser) return false;
    try {
      if (id) await notificationsService.markAsRead(id);
      else await notificationsService.markAllAsRead(currentUser.id);
      return true;
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to update notifications', description: err instanceof Error ? err.message : undefined });
      return false;
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Drawer Trigger, Collapsed Sidebar Expand, Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-md p-1.5 text-secondary hover:bg-subtle hover:text-primary md:hidden"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>

        {isSidebarCollapsed && (
          <Tooltip content="Expand sidebar" side="bottom">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand contextual sidebar"
              className="hidden md:inline-flex rounded-md p-1.5 text-secondary hover:bg-subtle hover:text-primary transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </Tooltip>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] min-w-0">
          <Link
            to={crumbs.modulePath}
            className="text-secondary hover:text-primary transition-colors truncate"
          >
            {crumbs.moduleLabel}
          </Link>
          {crumbs.pageLabel.toLowerCase() !== crumbs.moduleLabel.toLowerCase() && (
            <>
              <span className="text-muted select-none">/</span>
              <span className="font-medium text-primary truncate">
                {crumbs.pageLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Notifications & Profile Menu */}
      <div className="flex items-center gap-2 shrink-0">
        <DropdownMenu
          widthClassName="w-80 sm:w-96"
          trigger={
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:text-primary hover:bg-subtle transition-colors"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
              )}
            </button>
          }
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">
                    Notifications
                  </span>
                  {unreadNotifs.length > 0 && (
                    <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-brand-50 text-brand-700 tabular-nums">
                      {unreadNotifs.length} unread
                    </span>
                  )}
                </div>
                {unreadNotifs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void markRead()}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-xs text-secondary">
                    No notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={async () => {
                        if (!await markRead(notif.id)) return;
                        const target = resolveNotificationLink(notif.link);
                        close();
                        if (target) navigate(target);
                      }}
                      className={`w-full text-left flex items-start gap-3 p-3.5 hover:bg-subtle transition-colors ${
                        !notif.is_read ? 'bg-brand-50/50' : ''
                      }`}
                    >
                      {getNotifIcon(notif.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-primary truncate">
                            {notif.title}
                          </p>
                          <span className="text-[11px] text-muted tabular-nums shrink-0">
                            {new Date(notif.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-secondary mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </DropdownMenu>

        {selectDemoAccount && <span className="text-xs font-medium text-secondary">Fictional demo</span>}
        {/* Account menu */}
        <DropdownMenu
          widthClassName="w-72"
          trigger={
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center rounded-full focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <Avatar
                src={currentUser?.avatar_url}
                name={currentUser?.name}
                size="sm"
              />
            </button>
          }
        >
          {(close) => (
            <div className="divide-y divide-border text-xs">
              <div className="px-4 py-3">
                <p className="font-semibold text-primary truncate">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-secondary truncate mt-0.5">
                  {currentUser?.email}
                </p>
              </div>

              <div className="py-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await logout();
                      close();
                      navigate(ROUTES.LOGIN, { replace: true });
                    } catch (err) {
                      toast({ variant: 'error', title: 'Unable to sign out', description: err instanceof Error ? err.message : undefined });
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-red-600 hover:bg-subtle transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </DropdownMenu>
      </div>
    </header>
  );
};
