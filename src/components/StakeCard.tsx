import { useEffect, useMemo, useState } from "react";
import { calldata, namespaceHash } from "@nonos/nox-staking-sdk";
import { keccak256 } from "viem";
import { deployment } from "../lib/sdk";
import { formatNoxDisplay, groupDigits, weiToNoxString } from "../lib/format";
import { useApp } from "../lib/store";
import { useAccountSummary } from "../lib/useAccountSummary";
import { noxToWei } from "../lib/units";
import { useSend } from "../lib/useSend";
import { publicFor } from "../lib/viem";
import { CopyButton, middleTruncate } from "./ui";

const MAX_UINT256 = (1n << 256n) - 1n;

type ActionKind =
  | "approve"
  | "deposit"
  | "depositLocked"
  | "claim"
  | "compound"
  | "unstake"
  | "earlyUnlock"
  | "bindZsp"
  | "unbindZsp"
  | "namespaceReserve"
  | "namespaceRelease";

interface BuiltAction {
  contract: string;
  to: `0x${string}`;
  method: string;
  label: string;
  args: [string, string][];
  data: `0x${string}`;
}

const ACTIONS: { kind: ActionKind; label: string }[] = [
  { kind: "deposit", label: "Stake" },
  { kind: "depositLocked", label: "Stake locked" },
  { kind: "claim", label: "Claim" },
  { kind: "compound", label: "Compound" },
  { kind: "unstake", label: "Unstake" },
  { kind: "earlyUnlock", label: "Early unlock" },
  { kind: "approve", label: "Approve" },
  { kind: "bindZsp", label: "Bind ZSP" },
  { kind: "unbindZsp", label: "Unbind ZSP" },
  { kind: "namespaceReserve", label: "Reserve name" },
  { kind: "namespaceRelease", label: "Release name" },
];

/** Primary operations shown as tabs; the rest live under More. */
const PRIMARY_OPS: ActionKind[] = ["deposit", "depositLocked", "claim", "compound", "unstake"];

const LOCK_PRESETS = [
  { label: "30 days", value: "2592000" },
  { label: "90 days", value: "7776000" },
  { label: "365 days", value: "31536000" },
];

interface ToolResult {
  ok: boolean;
  text: string;
}

/** Button label while the current input is still incomplete. */
const FALLBACK_LABELS: Record<ActionKind, string> = {
  approve: "Approve NOX",
  deposit: "Stake NOX",
  depositLocked: "Stake NOX locked",
  claim: "Claim rewards",
  compound: "Compound rewards",
  unstake: "Unstake position",
  earlyUnlock: "Early unlock",
  bindZsp: "Bind ZSP",
  unbindZsp: "Unbind ZSP",
  namespaceReserve: "Reserve name",
  namespaceRelease: "Release name",
};

export function StakeCard() {
  const { account, connectionMode, rpc, setTx, tx } = useApp();
  const send = useSend();
  const { balance, allowance, pending, error: summaryError } = useAccountSummary();

  const [kind, setKind] = useState<ActionKind>("deposit");
  const [amount, setAmount] = useState("");
  const [lock, setLock] = useState("2592000");
  const [customLock, setCustomLock] = useState(false);
  const [position, setPosition] = useState("0");
  const [tokenId, setTokenId] = useState("0");
  const [name, setName] = useState("");
  const [safeNonce, setSafeNonce] = useState("0");
  const [gasResult, setGasResult] = useState<ToolResult | null>(null);
  const [simResult, setSimResult] = useState<ToolResult | null>(null);
  const [safeCopied, setSafeCopied] = useState(false);

  const built = useMemo(() => {
    try {
      return buildAction(kind, amount, lock, position, tokenId, name);
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid input.";
    }
  }, [kind, amount, lock, position, tokenId, name]);

  const action = typeof built === "string" ? null : built;
  const calldataKey = action?.data ?? "";

  // Stale estimate or simulation results are dropped when the payload changes.
  useEffect(() => {
    setGasResult(null);
    setSimResult(null);
    setSafeCopied(false);
  }, [calldataKey]);

  const signerReady = connectionMode === "injected" || connectionMode === "walletconnect" || connectionMode === "local";
  const rpcReady = isHttpUrl(rpc.trim());
  const txBusy = tx.state === "submitting" || tx.state === "mining";
  const calldataHash = action ? keccak256(action.data) : "";

  // Shown inside the primary button while the action is blocked.
  const blocker = !action
    ? typeof built === "string" ? withoutPeriod(built) : "Invalid input"
    : !rpcReady
      ? "Set an RPC endpoint"
      : !account
        ? "Connect a wallet"
        : !signerReady
          ? "Watch-only - export instead"
          : "";

  const toolBlocker = !action
    ? typeof built === "string" ? built : "Invalid input."
    : !rpcReady
      ? "Set an RPC endpoint to continue."
      : !account
        ? "Connect a wallet or watch an address."
        : "";

  async function estimateGas() {
    if (!action || !rpcReady || !account) return;
    setGasResult(null);
    try {
      const gas = await publicFor(rpc).estimateGas({ account, to: action.to, data: action.data, value: 0n });
      setGasResult({ ok: true, text: `≈ ${groupDigits(gas.toString())} gas` });
    } catch (err) {
      setGasResult({ ok: false, text: shortError(err, "gas estimate failed") });
    }
  }

  async function simulate() {
    if (!action || !rpcReady || !account) return;
    setSimResult(null);
    try {
      await publicFor(rpc).call({ account, to: action.to, data: action.data, value: 0n });
      setSimResult({ ok: true, text: "simulation ok" });
    } catch (err) {
      setSimResult({ ok: false, text: shortError(err, "simulation reverted") });
    }
  }

  async function copyText(value: string, done: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(value);
      done(true);
      window.setTimeout(() => done(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  function sendAction() {
    if (!action) {
      setTx({ state: "failed", hash: null, message: typeof built === "string" ? built : "Invalid input." });
      return;
    }
    void send(action.to, action.data, action.method);
  }

  function useMax() {
    if (balance !== null && !summaryError) setAmount(weiToNoxString(balance));
  }

  const safePayload = action ? JSON.stringify({
    version: "1.0",
    chainId: "1",
    createdAt: Date.now(),
    meta: { name: `NOX ${action.method}`, description: "NOX staking transaction payload" },
    transactions: [{
      to: action.to,
      value: "0",
      data: action.data,
      contractMethod: { name: action.method, payable: false },
      contractInputsValues: Object.fromEntries(action.args),
    }],
    safeNonce,
  }, null, 2) : "";

  const showStat = (v: bigint | null) =>
    summaryError || !rpcReady ? "-" : v === null ? "..." : `${formatNoxDisplay(v)} NOX`;
  const lockIsPreset = LOCK_PRESETS.some((p) => p.value === lock);
  const primaryLabel = action?.label ?? FALLBACK_LABELS[kind];

  return (
    <section className="card stake-card" aria-label="Staking">
      <nav className="op-tabs" aria-label="Operation">
        {PRIMARY_OPS.map((op) => {
          const meta = ACTIONS.find((item) => item.kind === op);
          return (
            <button key={op} type="button" className={op === kind ? "active" : ""} onClick={() => setKind(op)}>
              {meta?.label}
            </button>
          );
        })}
        <span className={`op-more ${PRIMARY_OPS.includes(kind) ? "" : "active"}`}>
          <select
            aria-label="More operations"
            value={PRIMARY_OPS.includes(kind) ? "" : kind}
            onChange={(event) => event.target.value && setKind(event.target.value as ActionKind)}>
            <option value="" disabled>More</option>
            {ACTIONS.filter((item) => !PRIMARY_OPS.includes(item.kind)).map((item) => (
              <option key={item.kind} value={item.kind}>{item.label}</option>
            ))}
          </select>
        </span>
      </nav>

      <div className="stake-body">
        {needsAmount(kind) && (
          <div className="amount-group">
            {account && (
              <div className="stat-line">
                {kind !== "approve" && <span>Allowance <strong>{showStat(allowance)}</strong></span>}
                <span>Balance <strong>{showStat(balance)}</strong></span>
                <button type="button" className="max-btn" onClick={useMax}
                  disabled={balance === null || Boolean(summaryError)}>
                  Max
                </button>
              </div>
            )}
            <div className="amount-box">
              <input
                value={amount}
                onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value); }}
                placeholder="0.0"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                aria-label="Amount in NOX"
              />
              <span className="amount-suffix">NOX</span>
            </div>
            {kind === "approve" && <div className="field-hint">Leave empty to approve unlimited spending.</div>}
          </div>
        )}

        {account && (kind === "claim" || kind === "compound") && (
          <div className="stat-line">
            <span>Pending rewards <strong>{showStat(pending)}</strong></span>
          </div>
        )}

        {kind === "depositLocked" && (
          <div className="field-group">
            <span className="field-label">Lock duration</span>
            <div className="segmented" role="group" aria-label="Lock duration">
              {LOCK_PRESETS.map((preset) => (
                <button key={preset.value} type="button"
                  className={!customLock && lock === preset.value ? "active" : ""}
                  onClick={() => { setLock(preset.value); setCustomLock(false); }}>
                  {preset.label}
                </button>
              ))}
              <button type="button" className={customLock || !lockIsPreset ? "active" : ""}
                onClick={() => setCustomLock(true)}>
                Custom
              </button>
            </div>
            {(customLock || !lockIsPreset) && (
              <input className="field" value={lock}
                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setLock(e.target.value); }}
                placeholder="Lock duration in seconds"
                inputMode="numeric"
                aria-label="Lock duration in seconds" />
            )}
          </div>
        )}

        {kind === "earlyUnlock" && (
          <div className="field-caution">
            Unlocks a locked position now. The protocol burns the early-unlock penalty from your stake.
          </div>
        )}

        {needsPosition(kind) && (
          <div className="field-group">
            <label htmlFor="position-id">Position ID</label>
            <input id="position-id" className="field" value={position}
              onChange={(e) => { if (/^\d*$/.test(e.target.value)) setPosition(e.target.value); }}
              inputMode="numeric" />
          </div>
        )}

        {kind === "bindZsp" && (
          <div className="field-group">
            <label htmlFor="zsp-token-id">ZSP token ID</label>
            <input id="zsp-token-id" className="field" value={tokenId}
              onChange={(e) => { if (/^\d*$/.test(e.target.value)) setTokenId(e.target.value); }}
              inputMode="numeric" />
          </div>
        )}

        {kind.startsWith("namespace") && (
          <div className="field-group">
            <label htmlFor="namespace-name">Name</label>
            <input id="namespace-name" className="field" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="operator.alice"
              autoComplete="off" spellCheck={false} />
          </div>
        )}

        {action && (
          <div className="review">
            <div className="review-row">
              <span>Contract</span>
              <div>
                <code title={action.to}>{action.contract} · {middleTruncate(action.to)}</code>
                <CopyButton value={action.to} label="contract address" />
              </div>
            </div>
            <div className="review-row">
              <span>Method</span>
              <div><code>{action.method}</code></div>
            </div>
            <div className="review-row">
              <span>Calldata</span>
              <div>
                <code title={action.data}>{middleTruncate(action.data, 10, 8)}</code>
                <CopyButton value={action.data} label="calldata" />
              </div>
            </div>
            <div className="review-row">
              <span>Calldata hash</span>
              <div>
                <code title={calldataHash}>{middleTruncate(calldataHash, 10, 8)}</code>
                <CopyButton value={calldataHash} label="calldata hash" />
              </div>
            </div>
            {kind.startsWith("namespace") && name && (
              <div className="review-row">
                <span>Name hash</span>
                <div>
                  <code title={namespaceHash(name)}>{middleTruncate(namespaceHash(name), 10, 8)}</code>
                  <CopyButton value={namespaceHash(name)} label="name hash" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="primary-zone">
          <button type="button" className="btn-primary" onClick={sendAction}
            disabled={Boolean(blocker) || txBusy}>
            {txBusy
              ? tx.state === "submitting" ? "Waiting for signature..." : "Pending..."
              : blocker || primaryLabel}
          </button>

          <div className="tools-row">
            <span className="tool">
              <button type="button" className="btn-ghost" onClick={estimateGas} disabled={Boolean(toolBlocker)}
                title={toolBlocker || "Estimate gas against your RPC"}>
                Estimate gas
              </button>
              {gasResult && (
                <span className={gasResult.ok ? "tool-result" : "tool-result error"}>{gasResult.text}</span>
              )}
            </span>
            <span className="tool">
              <button type="button" className="btn-ghost" onClick={simulate} disabled={Boolean(toolBlocker)}
                title={toolBlocker || "Simulate before signing"}>
                Simulate
              </button>
              {simResult && (
                <span className={simResult.ok ? "tool-result" : "tool-result error"}>{simResult.text}</span>
              )}
            </span>
          </div>
        </div>

        <details className="safe-export">
          <summary>Export for Safe</summary>
          <div className="safe-export-body">
            <div className="safe-nonce-row">
              <div className="field-group">
                <label htmlFor="safe-nonce">Safe nonce</label>
                <input id="safe-nonce" className="field" value={safeNonce}
                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) setSafeNonce(e.target.value); }}
                  inputMode="numeric" />
              </div>
              <button type="button" className="btn-secondary" disabled={!action}
                onClick={() => copyText(safePayload, setSafeCopied)}>
                {safeCopied ? "Copied" : "Copy Safe JSON"}
              </button>
            </div>
            {action && <div className="raw-data">{action.data}</div>}
            <p className="panel-caption">Import the JSON in the Safe transaction builder, then verify the calldata hash before signing.</p>
          </div>
        </details>
      </div>
    </section>
  );
}

function buildAction(kind: ActionKind, amount: string, lock: string, position: string, tokenId: string, name: string): BuiltAction {
  switch (kind) {
    case "approve": {
      const amountWei = noxToWei(amount);
      return action("NOX token", deployment.token, "approve", "Approve NOX",
        [["spender", deployment.stakingProxy], ["amount", amount ? amountWei.toString() : MAX_UINT256.toString()]],
        calldata.token.approve(deployment.stakingProxy, amount ? amountWei : MAX_UINT256));
    }
    case "deposit": {
      const amountWei = requireAmount(amount);
      return action("NOX staking", deployment.stakingProxy, "stake", "Stake NOX",
        [["amountWei", amountWei.toString()]], calldata.staking.stake(amountWei));
    }
    case "depositLocked": {
      const amountWei = requireAmount(amount);
      const lockSeconds = parseUint(lock, "Lock duration");
      return action("NOX staking", deployment.stakingProxy, "stakeLocked", "Stake NOX locked",
        [["amountWei", amountWei.toString()], ["lockSeconds", lockSeconds.toString()]],
        calldata.staking.stakeLocked(amountWei, lockSeconds));
    }
    case "claim":
      return action("NOX staking", deployment.stakingProxy, "claimRewards", "Claim rewards", [], calldata.staking.claimRewards());
    case "compound": {
      const pos = parseUint(position, "Position ID");
      return action("NOX staking", deployment.stakingProxy, "compoundRewards", "Compound rewards",
        [["positionId", pos.toString()]], calldata.staking.compoundRewards(pos));
    }
    case "unstake": {
      const pos = parseUint(position, "Position ID");
      return action("NOX staking", deployment.stakingProxy, "unstakePosition", "Unstake position",
        [["positionId", pos.toString()]], calldata.staking.unstakePosition(pos));
    }
    case "earlyUnlock": {
      const pos = parseUint(position, "Position ID");
      return action("NOX staking", deployment.stakingProxy, "earlyUnlock", "Early unlock",
        [["positionId", pos.toString()]], calldata.staking.earlyUnlock(pos));
    }
    case "bindZsp": {
      const pos = parseUint(position, "Position ID");
      const zsp = parseUint(tokenId, "ZSP token ID");
      return action("NOX staking", deployment.stakingProxy, "bindZeroStatePass", "Bind ZSP",
        [["positionId", pos.toString()], ["tokenId", zsp.toString()]], calldata.staking.bindZeroStatePass(pos, zsp));
    }
    case "unbindZsp": {
      const pos = parseUint(position, "Position ID");
      return action("NOX staking", deployment.stakingProxy, "unbindZeroStatePass", "Unbind ZSP",
        [["positionId", pos.toString()]], calldata.staking.unbindZeroStatePass(pos));
    }
    case "namespaceReserve": {
      const pos = parseUint(position, "Position ID");
      requireName(name);
      return action("NOX namespace", deployment.namespaceRegistry, "reserve", "Reserve name",
        [["name", name], ["positionId", pos.toString()]], calldata.namespace.reserve(name, pos));
    }
    case "namespaceRelease":
      requireName(name);
      return action("NOX namespace", deployment.namespaceRegistry, "release", "Release name",
        [["name", name]], calldata.namespace.release(name));
  }
}

function action(contract: string, to: `0x${string}`, method: string, label: string, args: [string, string][], data: string): BuiltAction {
  return { contract, to, method, label, args, data: data as `0x${string}` };
}

function requireAmount(value: string): bigint {
  const wei = noxToWei(value);
  if (wei <= 0n) throw new Error("Enter an amount.");
  return wei;
}

function requireName(value: string) {
  if (!value.trim()) throw new Error("Enter a name.");
}

function parseUint(value: string, label: string): bigint {
  if (!/^[0-9]+$/.test(value || "")) throw new Error(`${label} must be a whole number.`);
  return BigInt(value);
}

function needsAmount(kind: ActionKind) {
  return kind === "approve" || kind === "deposit" || kind === "depositLocked";
}

function needsPosition(kind: ActionKind) {
  return kind === "compound" || kind === "unstake" || kind === "earlyUnlock" || kind === "bindZsp"
    || kind === "unbindZsp" || kind === "namespaceReserve";
}

/** "Enter an amount." → "Enter an amount" for display inside the button. */
function withoutPeriod(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

function shortError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : fallback;
  const first = message.split("\n")[0] ?? fallback;
  return first.length > 160 ? `${first.slice(0, 157)}...` : first;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
