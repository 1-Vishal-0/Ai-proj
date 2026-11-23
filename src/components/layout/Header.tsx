import React, { useState } from 'react';
import {
  Menu,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Database,
  UserCheck,
  ChevronDown,
  RotateCcw,
  Check,
  Sparkles,
  School
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db/database';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  currentTitle: string;
  onNavigate?: (viewId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  currentTitle,
  onNavigate,
}) => {
  const { currentUser, loginAsUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  const notifications = currentUser ? db.getNotifications(currentUser.id) : [];
  const unreadNotifs = notifications.filter((n) => !n.is_read);
  const settings = db.getSettings();

  const handleMarkAllRead = () => {
    if (currentUser) {
      db.markAllNotificationsAsRead(currentUser.id);
    }
  };

  const handleResetDb = () => {
    if (window.confirm('Reset database back to initial clean academic seed records?')) {
      db.resetToSeed();
      window.location.reload();
    }
  };

  // Only the 3 demo users
  const seedUsers = db.getUsers();

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur">
      {/* Left: Mobile Menu & Institution Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {currentTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-bold text-slate-800">{settings.short_name}</span>
            <span>•</span>
            <span className="text-blue-700 font-semibold">{settings.affiliation.split(',')[0]}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {settings.academic_term}
            </span>
          </div>
        </div>
      </div>

      {/* Right: DB Badge, 3 Demo Personas, Notifications */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* DB Connection Status Badge */}
        <div
          title={isSupabaseConfigured ? 'Connected to Supabase PostgreSQL' : 'Local Relational Database Store Active'}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-slate-50 text-slate-600 border-slate-200"
        >
          <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured ? 'text-emerald-500' : 'text-blue-500'}`} />
          <span>{isSupabaseConfigured ? 'Supabase Postgres' : 'Local Relational Store'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Reset Database Button */}
        <button
          onClick={handleResetDb}
          title="Reset database to initial clean seed records"
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Data</span>
        </button>

        {/* Quick Demo Persona Switcher (Exactly 3 Users) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserSwitcher(!showUserSwitcher);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline font-semibold text-slate-600">Active:</span>
            <span className="font-bold text-slate-900 max-w-[120px] truncate">
              {currentUser?.name.split(' ')[0]} ({currentUser?.role})
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserSwitcher && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Demonstration Personas
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {seedUsers.map((u) => {
                  const isSelected = u.id === currentUser?.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        loginAsUser(u.id);
                        setShowUserSwitcher(false);
                        if (onNavigate) {
                          if (u.role === 'admin') onNavigate('admin-overview');
                          else if (u.role === 'teacher') onNavigate('teacher-overview');
                          else onNavigate('student-overview');
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition ${
                        isSelected ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                          alt={u.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{u.name}</p>
                          <p className="text-[10px] text-slate-500 capitalize">
                            {u.role === 'admin' ? 'HOD / Admin' : u.role === 'teacher' ? 'Assistant Professor' : 'Student (1AM22CS089)'}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserSwitcher(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800">System Notifications</h4>
                  {unreadNotifs.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      {unreadNotifs.length} new
                    </span>
                  )}
                </div>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications right now.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        db.markNotificationAsRead(notif.id);
                        if (notif.link && onNavigate) {
                          setShowNotifications(false);
                          if (notif.link.includes('teacher/corrections')) onNavigate('teacher-corrections');
                          else if (notif.link.includes('student/dashboard')) onNavigate('student-overview');
                          else if (notif.link.includes('student/timetable')) onNavigate('student-timetable');
                          else if (notif.link.includes('student/checkin')) onNavigate('student-timetable');
                        }
                      }}
                      className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 cursor-pointer transition ${
                        !notif.is_read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {getNotifIcon(notif.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(notif.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
