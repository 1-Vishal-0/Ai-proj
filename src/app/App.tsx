import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { AuthProvider } from '../features/auth/context/AuthContext';
import { ThemeProvider } from './providers/ThemeProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AppRouter } from './router';

export const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppRouter />
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
