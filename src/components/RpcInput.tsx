import { useState } from "react";
import { useApp } from "../lib/store";
import { publicFor } from "../lib/viem";

export function RpcInput() {
  const { rpc, setRpc } = useApp();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const trimmed = rpc.trim();
  const valid = !trimmed || isHttpUrl(trimmed);

  async function checkRpc() {
    setStatus(null);
    if (!trimmed || !valid) {
      setStatus({ ok: false, text: "Enter an http(s) RPC endpoint first." });
      return;
    }
    setChecking(true);
    try {
      const chainId = await publicFor(trimmed).getChainId();
      setStatus(chainId === 1
        ? { ok: true, text: "Ethereum mainnet reachable." }
        : { ok: false, text: `Wrong chain: ${chainId}. Expected Ethereum mainnet.` });
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? firstLine(err.message) : "RPC check failed." });
    } finally {
      setChecking(false);
    }
  }

  const tone = status ? (status.ok ? "ok" : "warn") : trimmed && !valid ? "warn" : "idle";

  return (
    <section className="card rpc-bar" aria-label="RPC endpoint">
      <div className="rpc-row">
        <span className="rpc-label">RPC</span>
        <input type="text" className="rpc-field mono" value={rpc}
          onChange={(e) => { setRpc(e.target.value); setStatus(null); }}
          placeholder="https://your-rpc-provider.example"
          spellCheck={false} autoComplete="off" aria-label="RPC endpoint URL" />
        <button type="button" className="btn-ghost" onClick={checkRpc} disabled={checking || !trimmed || !valid}>
          {checking ? "Checking..." : "Check"}
        </button>
        <span className={`state-dot ${tone}`} aria-hidden="true" />
      </div>
      <p className={`rpc-caption${status && !status.ok ? " warn" : ""}`}>
        {status ? status.text : "No fallback RPC is used. Requests only run when you act."}
      </p>
    </section>
  );
}

function firstLine(value: string) {
  const line = value.split("\n")[0] ?? value;
  return line.length > 140 ? `${line.slice(0, 137)}...` : line;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
