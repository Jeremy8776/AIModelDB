import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface Props {
    children: ReactNode;
    /** Name of the component for error logging */
    name?: string;
    /** Callback when user dismisses the error */
    onDismiss?: () => void;
    /** Custom fallback UI */
    fallback?: ReactNode;
    /** Show as inline error (vs. full-width) */
    inline?: boolean;
    /** Retry callback - if provided, shows retry button */
    onRetry?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Async-friendly Error Boundary
 * 
 * Designed for components that perform async operations like API calls.
 * Provides a compact error display with retry and dismiss options.
 * 
 * Usage:
 * ```tsx
 * <AsyncErrorBoundary name="Model Details" onRetry={refetch}>
 *   <AsyncComponent />
 * </AsyncErrorBoundary>
 * ```
 */
export class AsyncErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(
            `[AsyncErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`,
            error,
            errorInfo.componentStack
        );
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onRetry?.();
    };

    handleDismiss = () => {
        this.setState({ hasError: false, error: null });
        this.props.onDismiss?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const containerClass = this.props.inline
                ? "p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
                : "p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800";

            return (
                <div className={containerClass}>
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />

                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                {this.props.name ? `Error in ${this.props.name}` : 'Something went wrong'}
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 break-words">
                                {this.state.error?.message || 'An unexpected error occurred'}
                            </p>

                            <div className="flex gap-2 mt-3">
                                {this.props.onRetry && (
                                    <button
                                        onClick={this.handleReset}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Retry
                                    </button>
                                )}

                                {!this.props.onRetry && (
                                    <button
                                        onClick={this.handleReset}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Try Again
                                    </button>
                                )}

                                {this.props.onDismiss && (
                                    <button
                                        onClick={this.handleDismiss}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component to wrap a component with AsyncErrorBoundary
 */
export function withAsyncErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    boundaryProps?: Omit<Props, 'children'>
) {
    return function WithAsyncErrorBoundaryWrapper(props: P) {
        return (
            <AsyncErrorBoundary {...boundaryProps}>
                <WrappedComponent {...props} />
            </AsyncErrorBoundary>
        );
    };
}
