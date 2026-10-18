"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Flag } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

const SUPPORT_EMAIL = "support@stellarswipe.io";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  sentryEventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      sentryEventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    Sentry.withScope((scope) => {
      scope.setContext("component_stack", {
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });

    this.setState({ sentryEventId: Sentry.lastEventId() ?? null });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-2xl border border-accent-danger/30 bg-accent-danger/10 p-6 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-danger/20">
              <AlertTriangle className="h-8 w-8 text-accent-danger" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Something went wrong
            </h2>

            <p className="mb-4 text-sm text-foreground-muted">
              An unexpected error occurred. Please try refreshing the page or
              return to the home page.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-4 rounded-lg bg-background/50 p-3 text-left">
                <summary className="cursor-pointer text-xs font-medium text-foreground-muted">
                  Error details (development)
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-accent-danger">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={this.handleReload}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
            </div>

            <a
              href={buildReportHref(undefined, this.state.sentryEventId)}
              data-sentry-event-id={this.state.sentryEventId ?? ""}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Flag className="h-4 w-4" />
              Report this error
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function buildReportHref(
  digest: string | undefined,
  eventId: string | null
): string {
  const subject = encodeURIComponent("Error Report – StellarSwipe");
  const body = encodeURIComponent(
    [
      `Error ID: ${digest ?? "n/a"}`,
      `Sentry Event ID: ${eventId ?? "n/a"}`,
      "",
      "Please describe what you were doing when the error occurred:",
      "",
    ].join("\n")
  );
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
