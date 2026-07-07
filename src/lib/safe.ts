import { hashTypedData, type Hex } from "viem";

const ZERO: `0x${string}` = "0x0000000000000000000000000000000000000000";

const TYPES = {
  SafeTx: [
    { name: "to", type: "address" }, { name: "value", type: "uint256" },
    { name: "data", type: "bytes" }, { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" }, { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" }, { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" }, { name: "nonce", type: "uint256" },
  ],
} as const;

export function safeTxHash(safe: `0x${string}`, chainId: number, to: `0x${string}`, data: Hex, nonce: bigint): `0x${string}` {
  return hashTypedData({
    domain: { chainId, verifyingContract: safe },
    types: TYPES, primaryType: "SafeTx",
    message: {
      to, value: 0n, data, operation: 0,
      safeTxGas: 0n, baseGas: 0n, gasPrice: 0n,
      gasToken: ZERO, refundReceiver: ZERO, nonce,
    },
  });
}
