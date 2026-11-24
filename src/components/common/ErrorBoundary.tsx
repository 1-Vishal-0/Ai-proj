import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface rounded-xl border border-border shadow-card p-6 text-center space-y-4">
            <div className="mx-auto w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-xs text-secondary mt-1 leading-relaxed">
                An unexpected error occurred while rendering this view. You can retry or return to the portal overview.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <pre className="mt-3 p-2.5 rounded-lg bg-subtle text-rose-600 text-[11px] text-left overflow-x-auto font-mono">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                onClick={this.handleReset}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Try Again
              </Button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-primary text-xs font-medium hover:bg-subtle transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Overview</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
