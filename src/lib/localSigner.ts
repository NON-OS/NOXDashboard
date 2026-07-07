import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Hex } from "./viem";

let localAccount: PrivateKeyAccount | null = null;

export function setLocalPrivateKey(value: string): `0x${string}` {
  const key = normalizePrivateKey(value);
  localAccount = privateKeyToAccount(key);
  return localAccount.address;
}

export function getLocalAccount(): PrivateKeyAccount | null {
  return localAccount;
}

export function clearLocalPrivateKey() {
  localAccount = null;
}

function normalizePrivateKey(value: string): Hex {
  const trimmed = value.trim();
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error("private key must be 32 bytes hex");
  }
  return withPrefix as Hex;
}
