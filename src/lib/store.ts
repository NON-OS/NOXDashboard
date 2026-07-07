import { create } from "zustand";

const STORAGE_KEY = "nox.rpc";

function loadRpc(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
}

function saveRpc(value: string) {
  try { localStorage.setItem(STORAGE_KEY, value); } catch {}
}

export type TxState = "idle" | "submitting" | "mining" | "confirmed" | "failed";
export type ConnectionMode = "none" | "injected" | "walletconnect" | "local" | "watch";

interface State {
  rpc: string;
  account: `0x${string}` | null;
  connectionMode: ConnectionMode;
  tx: { state: TxState; hash: `0x${string}` | null; message: string };
  setRpc: (rpc: string) => void;
  setAccount: (a: `0x${string}` | null, mode?: ConnectionMode) => void;
  setTx: (tx: State["tx"]) => void;
  resetTx: () => void;
}

const IDLE = { state: "idle" as TxState, hash: null, message: "" };

export const useApp = create<State>((set) => ({
  rpc: loadRpc(),
  account: null,
  connectionMode: "none",
  tx: IDLE,
  setRpc: (rpc) => { saveRpc(rpc); set({ rpc }); },
  setAccount: (account, mode = account ? "watch" : "none") => set({ account, connectionMode: mode }),
  setTx: (tx) => set({ tx }),
  resetTx: () => set({ tx: IDLE }),
}));
