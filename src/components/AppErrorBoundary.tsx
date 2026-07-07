import React from "react";

interface State {
  message: string | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : "unknown runtime error" };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <main className="min-h-screen bg-ink text-white p-6">
        <section className="border border-red-500/50 rounded p-4 max-w-3xl">
          <h1 className="text-red-400 font-bold">web console failed to start</h1>
          <p className="text-dim text-sm mt-2">{this.state.message}</p>
          <p className="text-dim text-xs mt-4">
            The CLI and SDK are separate from this web app. Use noxctl or SDK tests while this
            browser runtime issue is being fixed.
          </p>
        </section>
      </main>
    );
  }
}
