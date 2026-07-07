import { useCallback } from "react";
import { send, waitReceipt } from "./tx";
import { useApp } from "./store";

export function useSend() {
  const { account, connectionMode, rpc, setTx, resetTx } = useApp();
  return useCallback(async (to: `0x${string}`, data: `0x${string}`, label: string) => {
    if (!account) { setTx({ state: "failed", hash: null, message: "connect a wallet first" }); return; }
    if (!rpc) { setTx({ state: "failed", hash: null, message: "set an RPC URL first" }); return; }
    if (connectionMode !== "injected" && connectionMode !== "walletconnect" && connectionMode !== "local") {
      setTx({
        state: "failed",
        hash: null,
        message: `${label}: watch-only mode cannot sign. copy calldata or use Safe/hardware/noxctl.`,
      });
      return;
    }
    try {
      setTx({ state: "submitting", hash: null, message: `${label}: awaiting ${connectionMode === "local" ? "local" : "wallet"} signature` });
      const hash = await send({ account, to, data, rpc, mode: connectionMode });
      setTx({ state: "mining", hash, message: `${label}: mining` });
      const r = await waitReceipt(rpc, hash);
      const ok = r.status === "success";
      setTx({ state: ok ? "confirmed" : "failed", hash, message: ok ? `${label}: confirmed` : `${label}: reverted` });
    } catch (e) {
      setTx({ state: "failed", hash: null, message: `${label}: ${String(e)}` });
    } finally {
      setTimeout(resetTx, 8000);
    }
  }, [account, connectionMode, rpc, setTx, resetTx]);
}
