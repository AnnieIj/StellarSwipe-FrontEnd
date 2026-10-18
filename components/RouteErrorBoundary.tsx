"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { RetryStateCard } from "@/components/ui/RetryStateCard";

interface Props {
  children: ReactNode;
  featureName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setContext("component_stack", {
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <RetryStateCard
          title={`${this.props.featureName} unavailable`}
          description={`Something went wrong in ${this.props.featureName}. Other sections are unaffected.`}
          onRetry={this.handleRetry}
          icon={<AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />}
        />
      );
    }

    return this.props.children;
  }
}
