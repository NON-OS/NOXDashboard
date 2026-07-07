import { createPublicClient, createWalletClient, custom, http, type Hex, type PublicClient, type WalletClient } from "viem";
import { mainnet } from "viem/chains";
import { injected } from "./wallet";
import { getLocalAccount } from "./localSigner";

export function publicFor(rpc: string): PublicClient {
  return createPublicClient({ transport: http(rpc) });
}

export function walletFor(account: `0x${string}`): WalletClient | null {
  const provider = injected();
  if (!provider) return null;
  return createWalletClient({ account, transport: custom(provider) });
}

export function localWalletFor(rpc: string): WalletClient | null {
  const account = getLocalAccount();
  if (!account) return null;
  return createWalletClient({ account, chain: mainnet, transport: http(rpc) });
}

export type { Hex };
