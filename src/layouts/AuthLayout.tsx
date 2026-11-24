import React from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-primary">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
};
