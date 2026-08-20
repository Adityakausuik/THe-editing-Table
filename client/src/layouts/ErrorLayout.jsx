/* global console */
import React from "react";
import Button from "../components/ui/Button.jsx";
import Container from "../components/ui/Container.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="min-h-svh flex items-center justify-center bg-sage-bg text-forest py-24">
          <Container className="text-center space-y-6 max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              Application Notice
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-normal">
              Something Went Unexpectedly Wrong
            </h1>
            <p className="text-sage-muted">
              We encountered an issue rendering this section. Please try refreshing or return to the homepage.
            </p>
            {this.state.error?.message && (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-mono text-left overflow-auto max-h-48">
                <p className="font-bold mb-1">Diagnostic Error:</p>
                <p>{this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-[10px] opacity-75 whitespace-pre-wrap">{this.state.error.stack}</pre>
                )}
              </div>
            )}
            <div className="flex justify-center gap-4 pt-4">
              <Button href="/" variant="primary" onClick={() => this.setState({ hasError: false, error: null })}>
                Return to Homepage
              </Button>
            </div>
          </Container>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
