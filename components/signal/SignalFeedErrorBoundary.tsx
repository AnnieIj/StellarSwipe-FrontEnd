"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { DataPanelFallback } from "@/components/DataPanelError";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Catches render-time crashes in the signal feed (e.g. malformed signal data)
// so a single broken card can't take down the rest of the dashboard.
export class SignalFeedErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      if (errorInfo.componentStack) {
        scope.setContext("component_stack", {
          componentStack: errorInfo.componentStack,
        });
      }
      Sentry.captureException(error);
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
          <DataPanelFallback onRetry={this.handleRetry} />

          {this.state.error && (
            <details className="mt-4 w-full text-left">
              <summary className="cursor-pointer text-xs text-foreground-subtle hover:text-foreground-muted">
                Error details (for debugging)
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-black/20 p-2 text-xs text-foreground-muted">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
