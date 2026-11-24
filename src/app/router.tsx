import React, { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PageLoader } from '../components/common/PageLoader';
import { UnauthorizedPage } from '../components/feedback/UnauthorizedPage';
import { NotFoundPage } from '../components/feedback/NotFoundPage';
import { ROLE_DEFAULT_ROUTES, ROUTES } from './config/navigation';

// Lazy-loaded Feature Pages
const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((m) => ({
    default: m.LoginPage,
  }))
);

const PasswordSetupPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((m) => ({ default: m.PasswordSetupPage }))
);

const CatalogPage = lazy(() => import('../features/workspace/CatalogPage'));
const RegisterPage = lazy(() => import('../features/workspace/RegisterPage'));
const ProfilePage = lazy(() => import('../features/workspace/ProfilePage'));
const WorkloadPage = lazy(() => import('../features/workspace/WorkloadPage'));
const ShortagesPage = lazy(() => import('../features/workspace/ShortagesPage'));
const SubmissionsPage = lazy(() => import('../features/workspace/SubmissionsPage'));
const PolicyPage = lazy(() => import('../features/workspace/PolicyPage'));

// Admin Pages
const AdminOverviewPage = lazy(() =>
  import('../features/analytics/pages/AdminOverviewPage').then((m) => ({
    default: m.AdminOverviewPage,
  }))
);
const AdminSchemesPage = lazy(() =>
  import('../features/academics/pages/AdminSchemesPage').then((m) => ({
    default: m.AdminSchemesPage,
  }))
);
const AdminAcademicsPage = lazy(() =>
  import('../features/academics/pages/AdminAcademicsPage').then((m) => ({
    default: m.AdminAcademicsPage,
  }))
);
const AdminSubjectsPage = lazy(() =>
  import('../features/academics/pages/AdminSubjectsPage').then((m) => ({
    default: m.AdminSubjectsPage,
  }))
);
const AdminTimetablePage = lazy(() =>
  import('../features/timetable/pages/AdminTimetablePage').then((m) => ({
    default: m.AdminTimetablePage,
  }))
);
const AdminStudentsPage = lazy(() =>
  import('../features/students/pages/AdminStudentsPage').then((m) => ({
    default: m.AdminStudentsPage,
  }))
);
const AdminTeachersPage = lazy(() =>
  import('../features/faculty/pages/AdminTeachersPage').then((m) => ({
    default: m.AdminTeachersPage,
  }))
);
const AdminAttendanceMasterPage = lazy(() =>
  import('../features/attendance/pages/AdminAttendanceMasterPage').then((m) => ({
    default: m.AdminAttendanceMasterPage,
  }))
);
const AdminReportsPage = lazy(() =>
  import('../features/reports/pages/AdminReportsPage').then((m) => ({
    default: m.AdminReportsPage,
  }))
);
const AdminSettingsPage = lazy(() =>
  import('../features/settings/pages/AdminSettingsPage').then((m) => ({
    default: m.AdminSettingsPage,
  }))
);
const AdminAuditLogsPage = lazy(() =>
  import('../features/settings/pages/AdminAuditLogsPage').then((m) => ({
    default: m.AdminAuditLogsPage,
  }))
);

// Teacher Pages
const TeacherOverviewPage = lazy(() =>
  import('../features/faculty/pages/TeacherOverviewPage').then((m) => ({
    default: m.TeacherOverviewPage,
  }))
);
const TeacherTimetablePage = lazy(() =>
  import('../features/timetable/pages/TeacherTimetablePage').then((m) => ({
    default: m.TeacherTimetablePage,
  }))
);
const TeacherMarkAttendancePage = lazy(() =>
  import('../features/attendance/pages/TeacherMarkAttendancePage').then((m) => ({
    default: m.TeacherMarkAttendancePage,
  }))
);
const TeacherHistoryPage = lazy(() =>
  import('../features/attendance/pages/TeacherHistoryPage').then((m) => ({
    default: m.TeacherHistoryPage,
  }))
);
const TeacherLowAttendancePage = lazy(() =>
  import('../features/analytics/pages/TeacherLowAttendancePage').then((m) => ({
    default: m.TeacherLowAttendancePage,
  }))
);
const TeacherCorrectionsPage = lazy(() =>
  import('../features/requests/pages/TeacherCorrectionsPage').then((m) => ({
    default: m.TeacherCorrectionsPage,
  }))
);
const TeacherReportsPage = lazy(() =>
  import('../features/reports/pages/TeacherReportsPage').then((m) => ({
    default: m.TeacherReportsPage,
  }))
);

// Student Pages
const StudentOverviewPage = lazy(() =>
  import('../features/students/pages/StudentOverviewPage').then((m) => ({
    default: m.StudentOverviewPage,
  }))
);
const StudentTimetablePage = lazy(() =>
  import('../features/timetable/pages/StudentTimetablePage').then((m) => ({
    default: m.StudentTimetablePage,
  }))
);
const StudentHistoryPage = lazy(() =>
  import('../features/attendance/pages/StudentHistoryPage').then((m) => ({
    default: m.StudentHistoryPage,
  }))
);
const StudentCorrectionPage = lazy(() =>
  import('../features/requests/pages/StudentCorrectionPage').then((m) => ({
    default: m.StudentCorrectionPage,
  }))
);
const StudentNotificationsPage = lazy(() =>
  import('../features/notifications/pages/StudentNotificationsPage').then((m) => ({
    default: m.StudentNotificationsPage,
  }))
);

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { currentUser, isLoading, canSetPassword } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (canSetPassword) return <Navigate to="/auth/reset" replace />;

  if (!currentUser) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
};

const RootRedirect: React.FC = () => {
  const { currentUser, isLoading, canSetPassword } = useAuth();
  if (isLoading) return <PageLoader />;
  if (canSetPassword) return <Navigate to="/auth/reset" replace />;
  if (!currentUser) return <Navigate to={ROUTES.LOGIN} replace />;
  return <Navigate to={ROLE_DEFAULT_ROUTES[currentUser.role]} replace />;
};

const PublicOnlyRoute: React.FC = () => {
  const { currentUser, isLoading, canSetPassword } = useAuth();
  if (isLoading) return <PageLoader />;
  if (canSetPassword) return <Navigate to="/auth/reset" replace />;
  if (currentUser) {
    return <Navigate to={ROLE_DEFAULT_ROUTES[currentUser.role]} replace />;
  }
  return <Outlet />;
};

export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth/reset" element={<PasswordSetupPage />} />

        {/* Public Auth Routes */}
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          </Route>
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'hod']} />}>
          <Route path={ROUTES.ADMIN_ROOT} element={<DashboardLayout />}>
            <Route index element={<Navigate to={ROUTES.ADMIN_OVERVIEW} replace />} />
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="students/:id" element={<ProfilePage kind="student" />} />
            <Route path="teachers/:id" element={<ProfilePage kind="teacher" />} />
            <Route path="workload" element={<WorkloadPage />} />
            <Route path="shortages" element={<ShortagesPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="academics" element={<AdminAcademicsPage />} />
            <Route path="subjects" element={<AdminSubjectsPage />} />
            <Route path="timetable" element={<AdminTimetablePage />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="teachers" element={<AdminTeachersPage />} />
            <Route path="attendance" element={<AdminAttendanceMasterPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="corrections" element={<TeacherCorrectionsPage />} />
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="schemes" element={<AdminSchemesPage />} />
              <Route path="policy" element={<PolicyPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="audit" element={<AdminAuditLogsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Teacher Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path={ROUTES.TEACHER_ROOT} element={<DashboardLayout />}>
            <Route index element={<Navigate to={ROUTES.TEACHER_OVERVIEW} replace />} />
            <Route path="overview" element={<TeacherOverviewPage />} />
            <Route path="timetable" element={<TeacherTimetablePage />} />
            <Route path="mark" element={<TeacherMarkAttendancePage />} />
            <Route path="history" element={<TeacherHistoryPage />} />
            <Route path="low-attendance" element={<TeacherLowAttendancePage />} />
            <Route path="corrections" element={<TeacherCorrectionsPage />} />
            <Route path="reports" element={<TeacherReportsPage />} />
          </Route>
        </Route>

        {/* Student Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path={ROUTES.STUDENT_ROOT} element={<DashboardLayout />}>
            <Route index element={<Navigate to={ROUTES.STUDENT_OVERVIEW} replace />} />
            <Route path="overview" element={<StudentOverviewPage />} />
            <Route path="timetable" element={<StudentTimetablePage />} />
            <Route path="history" element={<StudentHistoryPage />} />
            <Route path="corrections" element={<StudentCorrectionPage />} />
            <Route path="notifications" element={<StudentNotificationsPage />} />
          </Route>
        </Route>

        {/* Access Restricted & 404 */}
        <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
