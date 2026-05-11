import { Component, type ErrorInfo, type ReactNode } from "react";
import { Dashboard } from "./components/Dashboard";

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("Dashboard crashed:", error, info);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6">
          <div className="card glass max-w-md p-6 text-center">
            <h1 className="text-lg font-semibold text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-primary mt-5"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
