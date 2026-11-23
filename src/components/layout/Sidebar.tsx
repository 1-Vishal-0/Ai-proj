import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  AlertTriangle,
  FileCheck2,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Bell,
  LogOut,
  School,
  X,
  Clock,
  Layers,
  BookMarked
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db/database';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onCloseMobile,
}) => {
  const { currentUser, logout, switchRole } = useAuth();
  const role = currentUser?.role || 'admin';

  const pendingCorrectionsCount = db
    .getCorrectionRequests()
    .filter((r) => r.status === 'pending').length;

  const unreadCount = currentUser
    ? db.getNotifications(currentUser.id).filter((n) => !n.is_read).length
    : 0;

  const adminNav: NavItem[] = [
    { id: 'admin-overview', label: 'Institutional Dashboard', icon: LayoutDashboard },
    { id: 'admin-schemes', label: 'Academic Regulations', icon: BookMarked },
    { id: 'admin-academics', label: 'Departments & Programmes', icon: Layers },
    { id: 'admin-subjects', label: 'Course Subject Catalogue', icon: BookOpen },
    { id: 'admin-timetable', label: 'Master Timetables', icon: Clock },
    { id: 'admin-students', label: 'Student Directory', icon: Users },
    { id: 'admin-teachers', label: 'Faculty & Allocations', icon: GraduationCap },
    { id: 'admin-attendance', label: 'Master Attendance Log', icon: CalendarCheck },
    { id: 'admin-reports', label: 'Attendance Reports & CSV', icon: FileSpreadsheet },
    { id: 'admin-settings', label: 'Thresholds & Settings', icon: Settings },
    { id: 'admin-audit', label: 'Audit Trail & Logs', icon: ShieldCheck },
  ];

  const teacherNav: NavItem[] = [
    { id: 'teacher-overview', label: 'Faculty Dashboard', icon: LayoutDashboard },
    { id: 'teacher-timetable', label: 'My Timetable & Reschedule', icon: Clock },
    { id: 'teacher-mark', label: 'Take Attendance', icon: CalendarCheck },
    { id: 'teacher-history', label: 'Attendance Records', icon: BookOpen },
    { id: 'teacher-low', label: 'Low Attendance Alert', icon: AlertTriangle },
    {
      id: 'teacher-corrections',
      label: 'Dispute Corrections',
      icon: FileCheck2,
      badge: pendingCorrectionsCount > 0 ? pendingCorrectionsCount : undefined,
    },
    { id: 'teacher-reports', label: 'Course Reports & CSV', icon: FileSpreadsheet },
  ];

  const studentNav: NavItem[] = [
    { id: 'student-overview', label: 'Student Dashboard', icon: LayoutDashboard },
    { id: 'student-timetable', label: 'Weekly Class Timetable', icon: Clock },
    { id: 'student-history', label: 'Attendance Records', icon: CalendarCheck },
    { id: 'student-correction', label: 'Dispute Requests', icon: FileCheck2 },
    {
      id: 'student-notifications',
      label: 'Notifications & Updates',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  const roleLabels: Record<string, { title: string; color: string }> = {
    admin: { title: 'Admin / HOD Console', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
    teacher: { title: 'Faculty Console', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
    student: { title: 'Student Portal', color: 'bg-sky-950 text-sky-300 border-sky-800' },
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0f172a] text-slate-300 border-r border-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Institutional Brand Header */}
        <div className="flex h-20 items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0a0f1d]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white font-bold shadow border border-blue-500/30">
              <School className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold tracking-tight text-white uppercase leading-snug">
                Academic Portal
              </h1>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Smart Attendance Management
              </p>
              <p className="text-[9px] text-blue-400 font-semibold truncate">
                Engineering & Technology Campus
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Indicator */}
        <div className="px-4 pt-3 pb-1">
          <div
            className={`flex items-center justify-between px-3 py-1.5 rounded border text-xs font-medium ${
              roleLabels[role]?.color || ''
            }`}
          >
            <span className="flex items-center gap-2 uppercase tracking-wider text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {roleLabels[role]?.title || 'Portal'}
            </span>
            <span className="text-[10px] text-slate-400">Active</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-blue-700'
                        : 'bg-rose-900/60 text-rose-300 border border-rose-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Demo Account Switcher (Only 3 accounts) */}
        <div className="p-3 border-t border-slate-800 bg-[#0a0f1d]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Demo Persona Switch
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <button
              onClick={() => {
                switchRole('admin');
                onNavigate('admin-overview');
              }}
              className={`py-1.5 px-1 rounded font-semibold text-center transition truncate ${
                role === 'admin'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              HOD / Admin
            </button>
            <button
              onClick={() => {
                switchRole('teacher');
                onNavigate('teacher-overview');
              }}
              className={`py-1.5 px-1 rounded font-semibold text-center transition truncate ${
                role === 'teacher'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => {
                switchRole('student');
                onNavigate('student-overview');
              }}
              className={`py-1.5 px-1 rounded font-semibold text-center transition truncate ${
                role === 'student'
                  ? 'bg-sky-700 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Student
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-[#0f172a]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={currentUser?.name}
              className="h-8 w-8 rounded object-cover ring-1 ring-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="rounded p-1.5 text-slate-400 hover:bg-rose-900/40 hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
