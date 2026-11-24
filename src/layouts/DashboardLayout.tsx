import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useSidebarState } from '../hooks/useSidebarState';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const {
    isCollapsed,
    toggleCollapsed,
    isMobileOpen,
    toggleMobile,
    closeMobile,
  } = useSidebarState();

  return (
    <div className="flex h-screen overflow-hidden bg-white print:h-auto print:overflow-visible">
      <Sidebar
        isOpen={isMobileOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapsed}
        onCloseMobile={closeMobile}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-white print:overflow-visible">
        <Header
          isSidebarCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapsed}
          onToggleMobileMenu={toggleMobile}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-7 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-[1440px]">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
