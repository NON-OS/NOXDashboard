import { getAddress, type EIP1193Provider } from "viem";

export interface WalletProvider {
  id: string;
  name: string;
  provider: EIP1193Provider;
}

export interface WalletDiagnostics {
  secureContext: boolean;
  ethereumPresent: boolean;
  providerCount: number;
  providerNames: string[];
  activeProviderId: string;
}

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  rdns: string;
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: EIP1193Provider;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider & { providers?: EIP1193Provider[]; isMetaMask?: boolean };
  }
}

const providers = new Map<string, WalletProvider>();
let activeProvider: EIP1193Provider | null = null;
let activeProviderId = "";

function remember(provider: WalletProvider) {
  providers.set(provider.id, provider);
  if (!activeProvider) {
    activeProvider = provider.provider;
    activeProviderId = provider.id;
  }
}

function loadLegacyProvider() {
  if (typeof window === "undefined" || !window.ethereum) return;
  const list = Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0
    ? window.ethereum.providers
    : [window.ethereum];
  list.forEach((provider, index) => {
    remember({
      id: `legacy:${index}`,
      name: legacyName(provider, index),
      provider,
    });
  });
}

function legacyName(provider: EIP1193Provider & { isMetaMask?: boolean }, index: number) {
  if (provider.isMetaMask) return "MetaMask";
  return index === 0 ? "Injected wallet" : `Injected wallet ${index + 1}`;
}

function loadCoinbaseProvider() {
  if (typeof window === "undefined") return;
  const maybe = window as Window & { coinbaseWalletExtension?: EIP1193Provider };
  if (!maybe.coinbaseWalletExtension) return;
  remember({
    id: "legacy:coinbase",
    name: "Coinbase Wallet",
    provider: maybe.coinbaseWalletExtension,
  });
}

function requestEip6963Providers() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function handleAnnounce(event: Event) {
  const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
  if (!detail?.provider || !detail.info?.uuid) return;
  remember({
    id: detail.info.uuid,
    name: detail.info.name || detail.info.rdns || "Injected wallet",
    provider: detail.provider,
  });
}

export function subscribeProviders(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    handleAnnounce(event);
    onChange();
  };
  const rescan = () => {
    loadLegacyProvider();
    loadCoinbaseProvider();
    requestEip6963Providers();
    onChange();
  };
  window.addEventListener("eip6963:announceProvider", listener);
  window.addEventListener("ethereum#initialized", rescan, { once: true });
  rescan();
  const timers = [
    window.setTimeout(rescan, 300),
    window.setTimeout(rescan, 1000),
    window.setTimeout(rescan, 2500),
  ];
  return () => {
    window.removeEventListener("eip6963:announceProvider", listener);
    window.removeEventListener("ethereum#initialized", rescan);
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

export function walletProviders(): WalletProvider[] {
  loadLegacyProvider();
  loadCoinbaseProvider();
  return Array.from(providers.values());
}

export function injected(): EIP1193Provider | null {
  loadLegacyProvider();
  return activeProvider ?? walletProviders()[0]?.provider ?? null;
}

export function activeWalletProviderId(): string {
  return activeProviderId;
}

export function refreshWalletProviders(): WalletProvider[] {
  loadLegacyProvider();
  loadCoinbaseProvider();
  requestEip6963Providers();
  return walletProviders();
}

export function walletDiagnostics(): WalletDiagnostics {
  const found = walletProviders();
  return {
    secureContext: typeof window === "undefined" ? false : window.isSecureContext,
    ethereumPresent: typeof window !== "undefined" && Boolean(window.ethereum),
    providerCount: found.length,
    providerNames: found.map((provider) => provider.name),
    activeProviderId,
  };
}

export function registerProvider(provider: WalletProvider) {
  providers.set(provider.id, provider);
  activeProvider = provider.provider;
  activeProviderId = provider.id;
}

export function selectProvider(id: string) {
  const selected = providers.get(id);
  if (selected) {
    activeProvider = selected.provider;
    activeProviderId = selected.id;
  }
}

export async function requestAccounts(id?: string, timeoutMs = 45000): Promise<`0x${string}`> {
  if (id) selectProvider(id);
  const p = injected();
  if (!p) throw new Error("no injected wallet provider found");
  const accounts = await withTimeout(
    providerRequest(p, "eth_requestAccounts", []),
    timeoutMs,
    "wallet request is still pending. open the wallet prompt, reject it there, or try another provider.",
  );
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("wallet did not return an account");
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) {
    throw new Error("wallet returned malformed account");
  }
  return getAddress(accounts[0]) as `0x${string}`;
}

export async function ensureMainnet(id?: string): Promise<void> {
  if (id) selectProvider(id);
  const p = injected();
  if (!p) throw new Error("no wallet provider found");
  const chainId = await providerRequest(p, "eth_chainId");
  if (chainId === "0x1" || chainId === 1 || chainId === "1") return;
  try {
    await providerRequest(p, "wallet_switchEthereumChain", [{ chainId: "0x1" }]);
  } catch (err) {
    if (isUnknownChain(err)) {
      await providerRequest(
        p,
        "wallet_addEthereumChain",
        [{
          chainId: "0x1",
          chainName: "Ethereum Mainnet",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://ethereum-rpc.publicnode.com"],
          blockExplorerUrls: ["https://etherscan.io"],
        }],
      );
      return;
    }
    throw new Error(switchError(err));
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: number | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timer]).finally(() => {
    if (timeout !== undefined) window.clearTimeout(timeout);
  });
}

function switchError(err: unknown): string {
  if (err instanceof Error && err.message) {
    return `switch wallet to Ethereum mainnet before signing: ${err.message}`;
  }
  return "switch wallet to Ethereum mainnet before signing";
}

function isUnknownChain(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && Number((err as { code: unknown }).code) === 4902;
}

function providerRequest(provider: EIP1193Provider, method: string, params?: unknown[]): Promise<unknown> {
  // Invoke as a method: WalletConnect's provider.request is a class method
  // that reads `this`; extracting it unbound breaks every call through it.
  const p = provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  return p.request({ method, ...(params ? { params } : {}) });
}
