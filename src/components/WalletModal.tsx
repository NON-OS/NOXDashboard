import { useEffect, useRef, useState, type RefObject } from "react";
import { getAddress } from "viem";
import { clearLocalPrivateKey, setLocalPrivateKey } from "../lib/localSigner";
import { useApp, type ConnectionMode } from "../lib/store";
import {
  ensureMainnet,
  refreshWalletProviders,
  requestAccounts,
  subscribeProviders,
  walletProviders,
  type WalletProvider,
} from "../lib/wallet";
import { configuredWalletConnectProjectId, connectWalletConnect, disconnectWalletConnect } from "../lib/walletConnect";
import { CopyButton, middleTruncate } from "./ui";

const WC_STORAGE_KEY = "nox.wcProjectId";

function storedWcProjectId(): string {
  try { return localStorage.getItem(WC_STORAGE_KEY) ?? ""; } catch { return ""; }
}

function rememberWcProjectId(value: string) {
  try { localStorage.setItem(WC_STORAGE_KEY, value); } catch { /* storage unavailable */ }
}

/** Header wallet control: "Connect wallet" button + modal, or the
 *  connected account chip with its menu. */
export function WalletButton() {
  const account = useApp((s) => s.account);
  const [open, setOpen] = useState(false);

  if (account) return <AccountChip />;

  return (
    <>
      <button type="button" className="connect-btn" onClick={() => setOpen(true)}>
        Connect wallet
      </button>
      {open && <WalletModal onClose={() => setOpen(false)} />}
    </>
  );
}

/* ------------------------------------------------------------------------ */

function AccountChip() {
  const { account, connectionMode, setAccount } = useApp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!account) return null;

  function disconnect() {
    clearLocalPrivateKey();
    void disconnectWalletConnect();
    setAccount(null);
    setOpen(false);
  }

  return (
    <div className="account-chip-wrap" ref={rootRef}>
      <button type="button" className="account-chip" onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu" aria-expanded={open}>
        <span className={`dot ${modeTone(connectionMode)}`} aria-hidden="true" />
        <code>{middleTruncate(account, 6, 4)}</code>
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <div className="account-menu-head">
            <code title={account}>{middleTruncate(account, 12, 8)}</code>
            <CopyButton value={account} label="address" />
          </div>
          <div className="account-menu-mode">
            <span className={`dot ${modeTone(connectionMode)}`} aria-hidden="true" />
            {modeLabel(connectionMode)}
          </div>
          {connectionMode === "watch" && (
            <p className="account-menu-note">Watch-only - cannot sign transactions.</p>
          )}
          <button type="button" className="account-menu-action" onClick={disconnect} role="menuitem">
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function modeTone(mode: ConnectionMode): string {
  return mode === "watch" || mode === "local" ? "amber" : "green";
}

function modeLabel(mode: ConnectionMode): string {
  switch (mode) {
    case "walletconnect": return "WalletConnect";
    case "watch": return "Watch-only";
    case "local": return "Local test key";
    default: return "Browser wallet";
  }
}

/* ------------------------------------------------------------------------ */

type Expanded = "" | "walletconnect" | "watch" | "local";

function WalletModal({ onClose }: { onClose: () => void }) {
  const setAccount = useApp((s) => s.setAccount);
  const panelRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<WalletProvider[]>(() => walletProviders());
  const [expanded, setExpanded] = useState<Expanded>("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [wcProjectId, setWcProjectId] = useState(storedWcProjectId);
  const [watchAddress, setWatchAddress] = useState("");
  const keyRef = useRef<HTMLInputElement>(null);
  const envWcProjectId = configuredWalletConnectProjectId();

  useEffect(() => subscribeProviders(() => setProviders(walletProviders())), []);
  useModalChrome(panelRef, onClose);

  function toggle(section: Expanded) {
    setError("");
    setExpanded((current) => (current === section ? "" : section));
  }

  async function connectInjected(id: string) {
    setBusy(id);
    setError("");
    try {
      const address = await requestAccounts(id);
      await ensureMainnet(id);
      setAccount(address, "injected");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    } finally {
      setBusy("");
    }
  }

  async function connectQr() {
    setBusy("walletconnect");
    setError("");
    try {
      const address = await connectWalletConnect(wcProjectId);
      if (!envWcProjectId && wcProjectId.trim()) rememberWcProjectId(wcProjectId.trim());
      setAccount(address, "walletconnect");
      try {
        await ensureMainnet("walletconnect");
      } catch {
        /* connected; chain check surfaced elsewhere on action */
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "WalletConnect failed.");
    } finally {
      setBusy("");
    }
  }

  function watch() {
    setError("");
    try {
      setAccount(getAddress(watchAddress.trim()) as `0x${string}`, "watch");
      onClose();
    } catch {
      setError("That does not look like a valid Ethereum address.");
    }
  }

  function loadKey() {
    setError("");
    const field = keyRef.current;
    try {
      const address = setLocalPrivateKey(field?.value ?? "");
      if (field) field.value = "";
      setAccount(address, "local");
      onClose();
    } catch (err) {
      if (field) field.value = "";
      setError(err instanceof Error ? err.message : "Could not load the key.");
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Connect wallet">
        <div className="modal-head">
          <h2>Connect wallet</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          {providers.length > 0 ? (
            providers.map((provider) => (
              <button key={provider.id} type="button" className="wallet-row"
                onClick={() => connectInjected(provider.id)} disabled={Boolean(busy)}>
                <span className="wallet-row-name">{provider.name}</span>
                <span className="wallet-row-tag">{busy === provider.id ? "Waiting..." : "Detected"}</span>
              </button>
            ))
          ) : (
            <div className="wallet-row muted">
              <span className="wallet-row-name">No browser wallet detected</span>
              <button type="button" className="wallet-row-link"
                onClick={() => setProviders(refreshWalletProviders())}>
                Rescan
              </button>
            </div>
          )}

          <button type="button" className={`wallet-row ${expanded === "walletconnect" ? "open" : ""}`}
            onClick={() => toggle("walletconnect")} aria-expanded={expanded === "walletconnect"}>
            <span className="wallet-row-name">WalletConnect</span>
            <span className="wallet-row-tag">Mobile</span>
          </button>
          {expanded === "walletconnect" && (
            <div className="wallet-row-detail">
              <p>Scan a QR code with a mobile wallet. The relay is only used after you connect.</p>
              {!envWcProjectId && (
                <SecretField value={wcProjectId} onChange={setWcProjectId}
                  placeholder="WalletConnect project ID" label="WalletConnect project ID" />
              )}
              <button type="button" className="btn-primary modal-cta" onClick={connectQr}
                disabled={busy === "walletconnect" || (!envWcProjectId && wcProjectId.trim().length < 8)}>
                {busy === "walletconnect" ? "Opening..." : "Open QR code"}
              </button>
            </div>
          )}

          <button type="button" className={`wallet-row ${expanded === "watch" ? "open" : ""}`}
            onClick={() => toggle("watch")} aria-expanded={expanded === "watch"}>
            <span className="wallet-row-name">Watch an address</span>
            <span className="wallet-row-tag">Read-only</span>
          </button>
          {expanded === "watch" && (
            <div className="wallet-row-detail">
              <p>Read balances, simulate, and export calldata without signing.</p>
              <input className="field mono" value={watchAddress}
                onChange={(e) => setWatchAddress(e.target.value)}
                placeholder="0x..." spellCheck={false} autoComplete="off" aria-label="Address to watch"
                onKeyDown={(e) => { if (e.key === "Enter") watch(); }} />
              <button type="button" className="btn-primary modal-cta" onClick={watch}
                disabled={!watchAddress.trim()}>
                Watch address
              </button>
            </div>
          )}

          {error && <p className="modal-error">{error}</p>}
        </div>

        <div className="modal-foot">
          <button type="button" className="local-key-link" onClick={() => toggle("local")}
            aria-expanded={expanded === "local"}>
            Use a local test key - testing only
          </button>
          {expanded === "local" && (
            <div className="wallet-row-detail">
              <p>The key stays in browser memory and is cleared on disconnect or reload.
                Never use it for meaningful funds.</p>
              <input ref={keyRef} type="password" className="field mono"
                placeholder="32-byte private key hex" autoComplete="off" spellCheck={false}
                aria-label="Private key"
                onKeyDown={(e) => { if (e.key === "Enter") loadKey(); }} />
              <button type="button" className="btn-caution modal-cta" onClick={loadKey}>Load key</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Escape to close, focus trap, scroll lock. */
function useModalChrome(panelRef: RefObject<HTMLDivElement>, onClose: () => void) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>("button, input, select, a[href]"))
        .filter((el) => !el.hasAttribute("disabled"));
    focusables()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** Masked input, safe to type or paste while screen-recording. Hidden by
 *  default; a toggle reveals it to verify, then hides it again. */
function SecretField(
  { value, onChange, placeholder, label }:
  { value: string; onChange: (v: string) => void; placeholder: string; label: string },
) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="secret-field">
      <input className="field mono" type={reveal ? "text" : "password"} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoComplete="off" spellCheck={false} aria-label={label} />
      <button type="button" className="secret-toggle" onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? "Hide" : "Reveal"} aria-pressed={reveal}
        title={reveal ? "Hide" : "Reveal"}>
        {reveal ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 2l16 16M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5M6 5.2C3.4 6.6 1.5 10 1.5 10s3 6 8.5 6c1.4 0 2.7-.4 3.8-1M9 4.1c.3 0 .7-.1 1-.1 5.5 0 8.5 6 8.5 6s-.7 1.4-2 2.8" />
    </svg>
  );
}
