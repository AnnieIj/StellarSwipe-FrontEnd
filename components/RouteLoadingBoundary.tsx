"use client";

import { Suspense, Component, ErrorInfo, ReactNode, useState } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

interface RouteLoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  routeName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function DefaultSkeleton({ routeName }: { routeName: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-foreground-muted border-t-transparent" aria-hidden="true" />
      <div className="space-y-2 text-center">
        <div className="h-4 w-48 animate-pulse rounded bg-foreground-muted/20 mx-auto" aria-hidden="true" />
        <div className="h-3 w-32 animate-pulse rounded bg-foreground-muted/10 mx-auto" aria-hidden="true" />
      </div>
      <span className="sr-only">Loading {routeName}…</span>
    </div>
  );
}

class RouteErrorCatcher extends Component<
  { children: ReactNode; routeName: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[RouteErrorBoundary] Error in route "${this.props.routeName}":`, error, errorInfo);
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {this.props.routeName} failed to load
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Something went wrong in {this.props.routeName}. Other sections are
              unaffected.
            </p>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="w-full max-w-md rounded-xl border border-border bg-background/50 p-3 text-left">
              <summary className="cursor-pointer text-xs font-medium text-foreground-muted">
                Error details (development)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-destructive">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleGoBack}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
              Go Back
            </button>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RouteLoadingBoundary({
  children,
  fallback,
  routeName,
}: RouteLoadingBoundaryProps) {
  return (
    <RouteErrorCatcher routeName={routeName}>
      <Suspense fallback={fallback ?? <DefaultSkeleton routeName={routeName} />}>
        {children}
      </Suspense>
    </RouteErrorCatcher>
  );
}
