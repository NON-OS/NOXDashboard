import { useEffect, useState } from "react";
import { liveClient, deployment } from "./sdk";
import { useApp } from "./store";

export interface AccountSummary {
  balance: bigint | null;
  allowance: bigint | null;
  pending: bigint | null;
  error: string | null;
}

const EMPTY: AccountSummary = { balance: null, allowance: null, pending: null, error: null };

/** Live NOX balance, staking allowance, and pending rewards for the
 *  selected account. Refetches after every transaction settles. */
export function useAccountSummary(): AccountSummary {
  const { rpc, account, tx } = useApp();
  const [summary, setSummary] = useState<AccountSummary>(EMPTY);

  useEffect(() => {
    setSummary(EMPTY);
    if (!rpc || !account) return;
    let cancelled = false;
    const live = liveClient(rpc);
    (async () => {
      try {
        const [balance, allowance, pending] = await Promise.all([
          live.token.balanceOf(account),
          live.token.allowance(account, deployment.stakingProxy),
          live.staking.pendingRewards(account),
        ]);
        if (!cancelled) setSummary({ balance, allowance, pending, error: null });
      } catch (e) {
        if (!cancelled) setSummary({ ...EMPTY, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [rpc, account, tx.state]);

  return summary;
}
