import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminSchemesPage } from './pages/admin/AdminSchemesPage';
import { AdminTimetablePage } from './pages/admin/AdminTimetablePage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminTeachersPage } from './pages/admin/AdminTeachersPage';
import { AdminSubjectsPage } from './pages/admin/AdminSubjectsPage';
import { AdminAcademicsPage } from './pages/admin/AdminAcademicsPage';
import { AdminAttendanceMasterPage } from './pages/admin/AdminAttendanceMasterPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

// Teacher Pages
import { TeacherOverviewPage } from './pages/teacher/TeacherOverviewPage';
import { TeacherTimetablePage } from './pages/teacher/TeacherTimetablePage';
import { TeacherMarkAttendancePage } from './pages/teacher/TeacherMarkAttendancePage';
import { TeacherHistoryPage } from './pages/teacher/TeacherHistoryPage';
import { TeacherLowAttendancePage } from './pages/teacher/TeacherLowAttendancePage';
import { TeacherCorrectionsPage } from './pages/teacher/TeacherCorrectionsPage';
import { TeacherReportsPage } from './pages/teacher/TeacherReportsPage';

// Student Pages
import { StudentOverviewPage } from './pages/student/StudentOverviewPage';
import { StudentTimetablePage } from './pages/student/StudentTimetablePage';
import { StudentHistoryPage } from './pages/student/StudentHistoryPage';
import { StudentCorrectionPage } from './pages/student/StudentCorrectionPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('admin-overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync default view when user or role changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin' && !currentView.startsWith('admin-')) {
        setCurrentView('admin-overview');
      } else if (currentUser.role === 'teacher' && !currentView.startsWith('teacher-')) {
        setCurrentView('teacher-overview');
      } else if (currentUser.role === 'student' && !currentView.startsWith('student-')) {
        setCurrentView('student-overview');
      }
    }
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Academic Portal...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show institutional login page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Role-based route guard: Ensure user cannot access views belonging to another role
  const isAllowedView = (view: string) => {
    if (currentUser.role === 'admin') return view.startsWith('admin-');
    if (currentUser.role === 'teacher') return view.startsWith('teacher-');
    if (currentUser.role === 'student') return view.startsWith('student-');
    return false;
  };

  const safeView = isAllowedView(currentView)
    ? currentView
    : currentUser.role === 'admin'
    ? 'admin-overview'
    : currentUser.role === 'teacher'
    ? 'teacher-overview'
    : 'student-overview';

  // Header Title Mapping
  const getPageTitle = (viewId: string): string => {
    switch (viewId) {
      // Admin
      case 'admin-overview':
        return 'Institutional Overview & Academic Analytics';
      case 'admin-schemes':
        return 'Academic Schemes & Regulations';
      case 'admin-academics':
        return 'Departments & Academic Programmes';
      case 'admin-subjects':
        return 'Course Subject Master Catalogue';
      case 'admin-timetable':
        return 'Master Timetable & Classroom Allocation';
      case 'admin-students':
        return 'Student Directory & Enrollment';
      case 'admin-teachers':
        return 'Faculty Members & Workload Allocations';
      case 'admin-attendance':
        return 'Master Attendance Sessions Log';
      case 'admin-reports':
        return 'Institutional Attendance Reports & CSV Export';
      case 'admin-settings':
        return 'Institutional Thresholds & Configuration';
      case 'admin-audit':
        return 'System Audit Trail & Security Logs';

      // Teacher
      case 'teacher-overview':
        return 'Faculty Dashboard & Lecture Schedule';
      case 'teacher-timetable':
        return 'Class Timetable & Schedule Management';
      case 'teacher-mark':
        return 'Take Lecture Attendance';
      case 'teacher-history':
        return 'Lecture Attendance History';
      case 'teacher-low':
        return 'Students Below 75% Attendance';
      case 'teacher-corrections':
        return 'Dispute Correction Requests Review';
      case 'teacher-reports':
        return 'Course Attendance Reports & Export';

      // Student
      case 'student-overview':
        return 'Student Academic & Attendance Dashboard';
      case 'student-timetable':
        return 'Weekly Class Lecture Timetable';
      case 'student-history':
        return 'Personal Attendance Records';
      case 'student-correction':
        return 'Submit Attendance Dispute Request';
      case 'student-notifications':
        return 'Academic Notices & Schedule Changes';

      default:
        return 'AMC Engineering College - Academic Portal';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        currentView={safeView}
        onNavigate={setCurrentView}
        isOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          currentTitle={getPageTitle(safeView)}
          onNavigate={setCurrentView}
        />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Admin Routes */}
            {currentUser.role === 'admin' && (
              <>
                {safeView === 'admin-overview' && <AdminOverviewPage onNavigate={setCurrentView} />}
                {safeView === 'admin-schemes' && <AdminSchemesPage />}
                {safeView === 'admin-academics' && <AdminAcademicsPage />}
                {safeView === 'admin-subjects' && <AdminSubjectsPage />}
                {safeView === 'admin-timetable' && <AdminTimetablePage />}
                {safeView === 'admin-students' && <AdminStudentsPage />}
                {safeView === 'admin-teachers' && <AdminTeachersPage />}
                {safeView === 'admin-attendance' && <AdminAttendanceMasterPage />}
                {safeView === 'admin-reports' && <AdminReportsPage />}
                {safeView === 'admin-settings' && <AdminSettingsPage />}
                {safeView === 'admin-audit' && <AdminAuditLogsPage />}
              </>
            )}

            {/* Teacher Routes */}
            {currentUser.role === 'teacher' && (
              <>
                {safeView === 'teacher-overview' && <TeacherOverviewPage onNavigate={setCurrentView} />}
                {safeView === 'teacher-timetable' && <TeacherTimetablePage onNavigate={setCurrentView} />}
                {safeView === 'teacher-mark' && <TeacherMarkAttendancePage />}
                {safeView === 'teacher-history' && <TeacherHistoryPage />}
                {safeView === 'teacher-low' && <TeacherLowAttendancePage />}
                {safeView === 'teacher-corrections' && <TeacherCorrectionsPage />}
                {safeView === 'teacher-reports' && <TeacherReportsPage />}
              </>
            )}

            {/* Student Routes */}
            {currentUser.role === 'student' && (
              <>
                {safeView === 'student-overview' && <StudentOverviewPage onNavigate={setCurrentView} />}
                {safeView === 'student-timetable' && <StudentTimetablePage />}
                {safeView === 'student-history' && <StudentHistoryPage onNavigate={setCurrentView} />}
                {safeView === 'student-correction' && <StudentCorrectionPage />}
                {safeView === 'student-notifications' && <StudentNotificationsPage onNavigate={setCurrentView} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
