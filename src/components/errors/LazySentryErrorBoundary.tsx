import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppErrorFallback } from "@/components/errors/AppErrorFallback";
import { logError } from "@/lib/logging";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Boundary légère au boot : @sentry/react chargé uniquement après la première erreur.
 */
export class LazySentryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError("Erreur capturée par la boundary racine", error, {
      source: "error-boundary",
      componentStack: info.componentStack,
    });
    void import("@sentry/react").then((Sentry) => {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <AppErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false, error: null })}
          componentStack={null}
        />
      );
    }
    return this.props.children;
  }
}
