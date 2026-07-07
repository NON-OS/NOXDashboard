import { publicFor } from "./viem";
import { deployment } from "./sdk";

const ABI = [{
  name: "getUserPositions", type: "function", stateMutability: "view",
  inputs: [{ name: "user", type: "address" }],
  outputs: [
    { name: "ids", type: "uint256[]" },
    { name: "amounts", type: "uint256[]" },
    { name: "lockPeriods", type: "uint256[]" },
    { name: "lockEndTimes", type: "uint256[]" },
    { name: "activeFlags", type: "bool[]" },
    { name: "unlockedFlags", type: "bool[]" },
  ],
}] as const;

export interface Position {
  id: bigint; amount: bigint; lockPeriod: bigint; lockEndTime: bigint; active: boolean; unlocked: boolean;
}

export async function fetchPositions(rpc: string, account: `0x${string}`): Promise<Position[]> {
  const client = publicFor(rpc);
  const [ids, amounts, lockPeriods, lockEndTimes, active, unlocked] = await client.readContract({
    address: deployment.stakingProxy, abi: ABI, functionName: "getUserPositions", args: [account],
  });
  return ids.map((id, i) => ({
    id, amount: amounts[i]!, lockPeriod: lockPeriods[i]!, lockEndTime: lockEndTimes[i]!,
    active: active[i]!, unlocked: unlocked[i]!,
  }));
}
