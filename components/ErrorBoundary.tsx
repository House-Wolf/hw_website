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
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
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
        <div className="min-h-screen bg-[var(--wolf-charcoal)] flex items-center justify-center p-4">
          <div className="bg-[var(--wolf-ash)] border border-[var(--wolf-crimson)]/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl">⚠️</div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--wolf-pearl)] mb-2">
                  Something went wrong
                </h1>
                <p className="text-[var(--wolf-smoke)]">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 bg-[var(--wolf-obsidian)] border border-[var(--wolf-steel)] rounded-lg p-4">
                <summary className="text-[var(--wolf-ember)] font-semibold cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs text-[var(--wolf-silver)] overflow-auto max-h-64 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[var(--wolf-crimson)] hover:bg-[var(--wolf-rust)] text-[var(--wolf-pearl)] font-semibold rounded-lg transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-3 bg-[var(--wolf-steel)] hover:bg-[var(--wolf-smoke)] text-[var(--wolf-pearl)] font-semibold rounded-lg transition-colors"
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
