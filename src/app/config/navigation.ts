<<<<<<< HEAD
import { demoMode } from '../../services/supabaseClient';
=======
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
import type React from 'react';
import {
  LayoutGrid,
  GraduationCap,
  Users,
  CalendarCheck,
  CalendarDays,
  BarChart3,
  Settings,
  BookOpen,
  BookMarked,
  Layers,
  ClipboardList,
  History,
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  SlidersHorizontal,
  AlertTriangle,
  Bell,
  UserRound,
  Inbox,
} from 'lucide-react';
import type { UserRole } from '../../types';

export const ROUTES = {
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',

  ADMIN_ROOT: '/admin',
  ADMIN_OVERVIEW: '/admin/overview',
  ADMIN_SCHEMES: '/admin/schemes',
  ADMIN_ACADEMICS: '/admin/academics',
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_TIMETABLE: '/admin/timetable',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_ATTENDANCE: '/admin/attendance',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_AUDIT: '/admin/audit',
  ADMIN_CORRECTIONS: '/admin/corrections',

  TEACHER_ROOT: '/teacher',
  TEACHER_OVERVIEW: '/teacher/overview',
  TEACHER_TIMETABLE: '/teacher/timetable',
  TEACHER_MARK: '/teacher/mark',
  TEACHER_HISTORY: '/teacher/history',
  TEACHER_LOW_ATTENDANCE: '/teacher/low-attendance',
  TEACHER_CORRECTIONS: '/teacher/corrections',
  TEACHER_REPORTS: '/teacher/reports',

  STUDENT_ROOT: '/student',
  STUDENT_OVERVIEW: '/student/overview',
  STUDENT_TIMETABLE: '/student/timetable',
  STUDENT_HISTORY: '/student/history',
  STUDENT_CORRECTIONS: '/student/corrections',
  STUDENT_NOTIFICATIONS: '/student/notifications',
} as const;

export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  admin: ROUTES.ADMIN_OVERVIEW,
  hod: ROUTES.ADMIN_OVERVIEW,
  teacher: ROUTES.TEACHER_OVERVIEW,
  student: ROUTES.STUDENT_OVERVIEW,
};

export type NavIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;
export type NavBadgeKey = 'pendingCorrections' | 'unreadNotifications';

export interface NavItemConfig {
  path: string;
  label: string;
  icon: NavIcon;
  badgeKey?: NavBadgeKey;
}

export interface NavGroupConfig {
  groupLabel: string;
  items: NavItemConfig[];
}

/** A primary module: one icon in the rail, with its own contextual sidebar. */
export interface NavModuleConfig {
  id: string;
  label: string;
  icon: NavIcon;
  /** Pinned to the bottom of the rail (settings / administration). */
  placement?: 'top' | 'bottom';
  groups: NavGroupConfig[];
}

const baseModules: Record<Exclude<UserRole, 'hod'>, NavModuleConfig[]> = {
  admin: [
    {
      id: 'overview',
      label: 'Workspace',
      icon: LayoutGrid,
      groups: [
        {
          groupLabel: 'Workspace',
          items: [{ path: ROUTES.ADMIN_OVERVIEW, label: 'Institution overview', icon: LayoutGrid }, { path: ROUTES.ADMIN_REPORTS, label: 'Reports & export', icon: FileSpreadsheet }],
        },
      ],
    },
    {
      id: 'academics',
      label: 'Academic Management',
      icon: GraduationCap,
      groups: [
        {
          groupLabel: 'Curriculum',
          items: [
            { path: ROUTES.ADMIN_SCHEMES, label: 'Academic schemes', icon: BookMarked },
            { path: ROUTES.ADMIN_SUBJECTS, label: 'Subjects', icon: BookOpen },
          ],
        },
        {
          groupLabel: 'Structure',
          items: [{ path: '/admin/catalog', label: 'Academic hierarchy', icon: Layers }, { path: ROUTES.ADMIN_TIMETABLE, label: 'Master timetable', icon: CalendarDays }, { path: ROUTES.ADMIN_ACADEMICS, label: 'Departments & classes', icon: Layers }],
        },
      ],
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
      groups: [
        {
          groupLabel: 'Directory',
          items: [
            { path: ROUTES.ADMIN_STUDENTS, label: 'Students', icon: UserRound },
            { path: ROUTES.ADMIN_TEACHERS, label: 'Faculty', icon: Users },
            { path: '/admin/register', label: 'Enrollment & import', icon: Inbox },
            { path: '/admin/workload', label: 'Faculty workload', icon: CalendarDays },
          ],
        },
      ],
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarCheck,
      groups: [
        {
          groupLabel: 'Records',
          items: [{ path: '/admin/submissions', label: 'Pending submissions', icon: CalendarCheck }, { path: ROUTES.ADMIN_ATTENDANCE, label: 'Attendance records', icon: ClipboardList },
            { path: '/admin/shortages', label: 'Attendance shortages', icon: AlertTriangle },
            { path: ROUTES.ADMIN_CORRECTIONS, label: 'Correction requests', icon: ClipboardList }],
        },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      icon: Settings,
      placement: 'bottom',
      groups: [
        {
          groupLabel: 'Configuration',
          items: [{ path: '/admin/policy', label: 'Branding & permissions', icon: Settings }, { path: ROUTES.ADMIN_SETTINGS, label: 'Thresholds & rules', icon: SlidersHorizontal }],
        },
        {
          groupLabel: 'Governance',
          items: [{ path: ROUTES.ADMIN_AUDIT, label: 'Audit trail', icon: ShieldCheck }],
        },
      ],
    },
  ],
  teacher: [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutGrid,
      groups: [
        {
          groupLabel: 'Workspace',
          items: [{ path: ROUTES.TEACHER_OVERVIEW, label: 'Overview', icon: LayoutGrid }],
        },
      ],
    },
    {
      id: 'classes',
      label: 'My classes',
      icon: Users,
      groups: [
        {
          groupLabel: 'Students',
          items: [
            { path: ROUTES.TEACHER_LOW_ATTENDANCE, label: 'Low attendance', icon: AlertTriangle },
          ],
        },
      ],
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarCheck,
      groups: [
        {
          groupLabel: 'Workspace',
          items: [
<<<<<<< HEAD
            ...(demoMode ? [] : [{path:'/teacher/classrooms',label:'My classrooms',icon:BookOpen}]),
=======
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
            { path: ROUTES.TEACHER_MARK, label: 'Mark attendance', icon: CalendarCheck },
            { path: ROUTES.TEACHER_HISTORY, label: 'Attendance records', icon: History },
          ],
        },
      ],
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: CalendarDays,
      groups: [
        {
          groupLabel: 'Schedule',
          items: [{ path: ROUTES.TEACHER_TIMETABLE, label: 'My timetable', icon: CalendarDays }],
        },
      ],
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: Inbox,
      groups: [
        {
          groupLabel: 'Review',
          items: [
            {
              path: ROUTES.TEACHER_CORRECTIONS,
              label: 'Correction requests',
              icon: FileCheck2,
              badgeKey: 'pendingCorrections',
            },
          ],
        },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      groups: [
        {
          groupLabel: 'Reporting',
          items: [{ path: ROUTES.TEACHER_REPORTS, label: 'Course reports', icon: FileSpreadsheet }],
        },
      ],
    },
  ],
  student: [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutGrid,
      groups: [
        {
          groupLabel: 'Workspace',
          items: [{ path: ROUTES.STUDENT_OVERVIEW, label: 'Overview', icon: LayoutGrid }],
        },
      ],
    },
    {
      id: 'attendance',
      label: 'My attendance',
      icon: CalendarCheck,
      groups: [
        {
          groupLabel: 'Records',
<<<<<<< HEAD
          items: [...(demoMode ? [] : [{path:'/student/classrooms',label:'My classrooms',icon:BookOpen}, { path:'/student/check-in',label:'Lecture check-in',icon:CalendarCheck }]), { path: ROUTES.STUDENT_HISTORY, label: 'Attendance records', icon: History }],
=======
          items: [{ path: ROUTES.STUDENT_HISTORY, label: 'Attendance records', icon: History }],
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
        },
      ],
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: CalendarDays,
      groups: [
        {
          groupLabel: 'Schedule',
          items: [{ path: ROUTES.STUDENT_TIMETABLE, label: 'Class timetable', icon: CalendarDays }],
        },
      ],
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: Inbox,
      groups: [
        {
          groupLabel: 'Support',
          items: [{ path: ROUTES.STUDENT_CORRECTIONS, label: 'Correction requests', icon: FileCheck2 }],
        },
      ],
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      groups: [
        {
          groupLabel: 'Inbox',
          items: [
            {
              path: ROUTES.STUDENT_NOTIFICATIONS,
              label: 'Notifications',
              icon: Bell,
              badgeKey: 'unreadNotifications',
            },
          ],
        },
      ],
    },
  ],
};

/** Flattened views, derived from the module config (used by search and legacy callers). */
export const NAV_MODULES_BY_ROLE: Record<UserRole, NavModuleConfig[]> = {
  ...baseModules,
  hod: baseModules.admin.filter((module) => module.id !== 'administration').map((module) => ({
    ...module,
    groups: module.groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.path !== ROUTES.ADMIN_SCHEMES).map((item) =>
        item.path === ROUTES.ADMIN_OVERVIEW ? { ...item, label: 'Department overview' } : item),
    })),
  })),
};

export const NAV_GROUPS_BY_ROLE: Record<UserRole, NavGroupConfig[]> = {
  admin: NAV_MODULES_BY_ROLE.admin.flatMap((m) => m.groups),
  hod: NAV_MODULES_BY_ROLE.hod.flatMap((m) => m.groups),
  teacher: NAV_MODULES_BY_ROLE.teacher.flatMap((m) => m.groups),
  student: NAV_MODULES_BY_ROLE.student.flatMap((m) => m.groups),
};

export const NAV_BY_ROLE: Record<UserRole, NavItemConfig[]> = {
  admin: NAV_GROUPS_BY_ROLE.admin.flatMap((g) => g.items),
  hod: NAV_GROUPS_BY_ROLE.hod.flatMap((g) => g.items),
  teacher: NAV_GROUPS_BY_ROLE.teacher.flatMap((g) => g.items),
  student: NAV_GROUPS_BY_ROLE.student.flatMap((g) => g.items),
};

export const ROLE_CONSOLE_META: Record<UserRole, { title: string; shortLabel: string }> = {
  admin: { title: 'Administration', shortLabel: 'Administrator' },
  hod: { title: 'Department', shortLabel: 'Head of department' },
  teacher: { title: 'Faculty', shortLabel: 'Faculty' },
  student: { title: 'Student', shortLabel: 'Student' },
};

export function getModuleForPath(pathname: string, role: UserRole): NavModuleConfig {
  const modules = NAV_MODULES_BY_ROLE[role];
  return (
    modules.find((m) => m.groups.some((g) => g.items.some((i) => (i.path === pathname || pathname.startsWith(i.path + '/'))))) ||
    modules[0]
  );
}

export function getModuleEntryPath(module: NavModuleConfig): string {
  return module.groups[0]?.items[0]?.path || '/';
}

export function getPageTitleForPath(pathname: string, role?: UserRole): string {
  const roles: UserRole[] = role ? [role] : ['admin', 'hod', 'teacher', 'student'];
  for (const r of roles) {
    const item = NAV_BY_ROLE[r].find((i) => i.path === pathname);
    if (item) return item.label;
  }
  return 'Academic Portal';
}

export function getBreadcrumbsForPath(
  pathname: string,
  role: UserRole
): { moduleLabel: string; modulePath: string; pageLabel: string } {
  const module = getModuleForPath(pathname, role);
  return {
    moduleLabel: module.label,
    modulePath: getModuleEntryPath(module),
    pageLabel: getPageTitleForPath(pathname, role),
  };
}

export function resolveNotificationLink(link?: string): string | null {
  if (!link) return null;
  if (link.includes('teacher/corrections')) return ROUTES.TEACHER_CORRECTIONS;
  if (link.includes('admin/timetable')) return ROUTES.ADMIN_TIMETABLE;
  if (link.includes('student/dashboard') || link.includes('student/overview')) {
    return ROUTES.STUDENT_OVERVIEW;
  }
  if (link.includes('student/timetable') || link.includes('student/checkin')) {
    return ROUTES.STUDENT_TIMETABLE;
  }
  if (link.includes('student/correction')) return ROUTES.STUDENT_CORRECTIONS;
  if (link.includes('student/history')) return ROUTES.STUDENT_HISTORY;
  if (link.includes('student/notifications')) return ROUTES.STUDENT_NOTIFICATIONS;
  return null;
}
