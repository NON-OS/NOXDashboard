import type { ConnectionMode } from "./store";
import { getLocalAccount } from "./localSigner";
import { localWalletFor, publicFor, walletFor, type Hex } from "./viem";
import { ensureMainnet } from "./wallet";

export interface SendOpts {
  account: `0x${string}`;
  to: `0x${string}`;
  data: Hex;
  rpc: string;
  mode: ConnectionMode;
  value?: bigint;
}

export async function send({ account, to, data, rpc, mode, value }: SendOpts): Promise<`0x${string}`> {
  if (mode === "local") {
    const wallet = localWalletFor(rpc);
    const signer = getLocalAccount();
    if (!wallet || !signer) throw new Error("local signer is locked");
    return wallet.sendTransaction({ account: signer, chain: null, to, data, value: value ?? 0n });
  }
  if (mode === "injected" || mode === "walletconnect") await ensureMainnet();
  const wallet = walletFor(account);
  if (!wallet) throw new Error("no injected wallet");
  return wallet.sendTransaction({ chain: null, account, to, data, value: value ?? 0n });
}

export async function waitReceipt(rpc: string, hash: `0x${string}`) {
  return publicFor(rpc).waitForTransactionReceipt({ hash });
}
