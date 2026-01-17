import React, { ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary
 * 
 * Top-level error boundary that catches any unhandled errors
 * in the React component tree and displays a recovery UI.
 */
export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('[GlobalErrorBoundary] Uncaught error:', error);
    console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // In production, you might want to send to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearDataAndReload = () => {
    // Clear potentially corrupted data and reload
    try {
      localStorage.removeItem('aiModelDB_models');
      localStorage.removeItem('aiModelDB_settings');
      // IndexedDB will be handled by the app on next load
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center shadow-2xl">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6">
              AI Model DB encountered an unexpected error. Don't worry, your data is likely safe.
            </p>

            {/* Error details (collapsible) */}
            {this.state.error && (
              <details className="text-left mb-6 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                  Show error details
                </summary>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-mono text-red-400 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-gray-500 overflow-auto max-h-40 mt-2">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Recovery buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                <Home className="h-4 w-4" />
                Reload App
              </button>
            </div>

            {/* Emergency reset option */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-3">
                If the error persists, you can reset the app data:
              </p>
              <button
                onClick={this.handleClearDataAndReload}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Clear app data and restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
