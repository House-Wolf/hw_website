"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * @component ErrorBoundary - A component that catches JavaScript errors in its child component tree.
 * @description This ErrorBoundary component is designed to catch JavaScript errors anywhere in its child component tree,
 * log those errors, and display a fallback UI instead of the component tree that crashed. It helps to prevent the entire application
 * from crashing due to unhandled errors in specific components.
 * @param {ReactNode} children - The child components to be wrapped by the ErrorBoundary.
 * @param {ReactNode} [fallback] - Optional custom fallback UI to display when an error is caught.
 * @returns {JSX.Element} The rendered ErrorBoundary component.
 * @example
 * <ErrorBoundary fallback={<CustomErrorComponent />}>
 *  <MyComponent />
 * </ErrorBoundary>
 * @author House Wolf Dev Team
 */

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-background-card border border-accent/30 rounded-2xl p-8 max-w-2xl w-full shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl">⚠️</div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Something went wrong
                </h1>
                <p className="text-foreground-muted">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 bg-background-elevated border border-border rounded-lg p-4">
                <summary className="text-accent font-semibold cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs text-foreground-muted overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Reload Page
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="btn btn-secondary"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
