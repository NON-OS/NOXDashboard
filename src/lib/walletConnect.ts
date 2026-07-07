import type { EIP1193Provider } from "viem";
import { getAddress } from "viem";
import { registerProvider } from "./wallet";

const WALLETCONNECT_ID = "walletconnect";
const ENV_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

type WalletConnectProvider = EIP1193Provider & {
  enable: () => Promise<string[]>;
  disconnect?: () => Promise<void>;
};

let current: WalletConnectProvider | null = null;

export async function connectWalletConnect(projectId: string): Promise<`0x${string}`> {
  const id = (projectId.trim() || ENV_PROJECT_ID).trim();
  if (id.length < 8) {
    throw new Error("WalletConnect Project ID is required. Set VITE_WALLETCONNECT_PROJECT_ID or paste a Project ID before opening QR.");
  }

  const module = await import("@walletconnect/ethereum-provider");
  let provider: WalletConnectProvider;
  try {
    provider = await module.EthereumProvider.init({
      projectId: id,
      chains: [1],
      optionalChains: [1],
      showQrModal: true,
      metadata: {
        name: "NØNOS NOX Operator",
        description: "Local-first NOX staking workstation",
        url: window.location.origin,
        icons: [],
      },
    }) as WalletConnectProvider;
  } catch (err) {
    throw new Error(`WalletConnect initialization failed: ${messageOf(err)}`);
  }

  let accounts: string[];
  try {
    accounts = await provider.enable();
  } catch (err) {
    throw new Error(`WalletConnect session failed: ${messageOf(err)}`);
  }
  const account = accounts.find((value) => /^0x[0-9a-fA-F]{40}$/.test(value));
  if (!account) throw new Error("WalletConnect did not return an Ethereum account");

  current = provider;
  registerProvider({ id: WALLETCONNECT_ID, name: "WalletConnect", provider: current });
  return getAddress(account) as `0x${string}`;
}

export function configuredWalletConnectProjectId(): string {
  return ENV_PROJECT_ID;
}

export async function disconnectWalletConnect(): Promise<void> {
  const provider = current;
  current = null;
  if (provider?.disconnect) await provider.disconnect();
}

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err || "unknown error");
}
