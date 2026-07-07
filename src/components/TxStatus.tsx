import { useApp } from "../lib/store";
import { CopyButton, middleTruncate } from "./ui";

export function TxStatus() {
  const tx = useApp((s) => s.tx);
  if (tx.state === "idle") return null;

  const tone = tx.state === "failed" ? "failed" : tx.state === "confirmed" ? "confirmed" : "pending";
  const title = tx.state === "submitting" ? "Awaiting signature"
    : tx.state === "mining" ? "Transaction pending"
    : tx.state === "confirmed" ? "Transaction confirmed"
    : "Transaction failed";

  return (
    <section className={`card tx-toast ${tone}`} aria-live="polite" aria-label="Transaction status">
      <span className="dot" aria-hidden="true" />
      <div className="tx-toast-body">
        <strong>{title}</strong>
        {tx.message && <span className="tx-toast-msg">{tx.message}</span>}
        {tx.hash && (
          <span className="tx-toast-hash">
            <code title={tx.hash}>{middleTruncate(tx.hash, 12, 10)}</code>
            <CopyButton value={tx.hash} label="transaction hash" />
          </span>
        )}
      </div>
    </section>
  );
}
