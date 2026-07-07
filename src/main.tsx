import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import "./styles/index.css";

const root = document.getElementById("root");
function renderFailure(message: string) {
  if (!root) return;
  root.innerHTML = `<main style="min-height:100vh;background:#0f1115;color:#f7f8fb;font:14px Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px"><section style="border:1px solid rgba(239,68,68,.5);border-radius:6px;padding:16px;max-width:768px"><strong style="color:#f87171">web console failed to start</strong><p style="color:#9ca3af">${escapeHtml(message)}</p></section></main>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

window.addEventListener("error", (event) => {
  renderFailure(event.message || "browser runtime error");
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  renderFailure(reason || "unhandled browser promise rejection");
});

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
}
