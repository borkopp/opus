import { Component, ReactNode } from "react";
import { PlacesTable } from "./components/PlacesTable";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace", color: "#dc2626" }}>
          <strong>Query error:</strong>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
            {(this.state.error as Error).message}
          </pre>
          <p style={{ marginTop: 16, color: "#374151", fontFamily: "sans-serif" }}>
            If this says "Could not find public function" — run{" "}
            <code>npx convex dev</code> in <code>opus-dashboard/</code> to deploy the new functions, then reload.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <PlacesTable />
    </ErrorBoundary>
  );
}
