import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

export class TutorialErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("TutorialErrorBoundary:", error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Une erreur est survenue lors du chargement des tutoriels.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={this.handleReset}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
