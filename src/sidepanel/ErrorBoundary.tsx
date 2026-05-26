import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary for the side panel. A render error in any
 * descendant component is caught here and replaced with a recoverable
 * "something went wrong" surface — the entire side panel never goes blank.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Log to extension console; never to remote (privacy boundary).
    console.error("BidDiff render error:", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="app">
          <header className="app__header">
            <span className="app__title">BidDiff</span>
          </header>
          <main className="app__body">
            <div className="error" role="alert">
              <strong>Something went wrong displaying this view.</strong>
              <div style={{ marginTop: 8 }}>
                Your saved diffs are still safe. Click below to recover.
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="primary" onClick={this.reset}>
                  Recover
                </button>
              </div>
              <details style={{ marginTop: 12, color: "var(--fg-muted)" }}>
                <summary style={{ cursor: "pointer", fontSize: 12 }}>Technical detail</summary>
                <pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
                  {String(this.state.error.message)}
                </pre>
              </details>
            </div>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}
