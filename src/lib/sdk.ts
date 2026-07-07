import { Nox, MAINNET_DEPLOYMENT, type Deployment } from "@nonos/nox-staking-sdk";

const sdkInstance = Nox.mainnet();

export const nox = sdkInstance;
export const deployment: Deployment = MAINNET_DEPLOYMENT;

export function liveClient(rpc: string) {
  return sdkInstance.connect(rpc);
}
