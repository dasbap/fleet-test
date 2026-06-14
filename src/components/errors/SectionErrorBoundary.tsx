import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/logging";

interface Props {
  children: ReactNode;
  /** Message affiché en cas d'erreur de rendu dans la section. */
  sectionLabel?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Boundary par section (dashboard) : isole les crashes de page sans démonter le layout.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError("Erreur capturée par SectionErrorBoundary", error, {
      source: "section-error-boundary",
      section: this.props.sectionLabel ?? "dashboard",
      componentStack: info.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const label = this.props.sectionLabel ?? "cette section";
      return (
        <div
          role="alert"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-muted/20 px-4 py-16 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">
              Impossible d&apos;afficher {label}
            </p>
            <p className="text-sm text-muted-foreground">
              Une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou naviguer vers une
              autre page.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={this.handleReset}>
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
