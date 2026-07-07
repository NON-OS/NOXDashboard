import { useEffect, useState } from "react";
import { calldata } from "@nonos/nox-staking-sdk";
import { deployment } from "../lib/sdk";
import { fetchPositions, type Position } from "../lib/positions";
import { formatNoxDisplay } from "../lib/format";
import { useApp } from "../lib/store";
import { useSend } from "../lib/useSend";

export function Positions() {
  const { rpc, account, tx } = useApp();
  const send = useSend();
  const [list, setList] = useState<Position[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setList(null);
    setErr(null);
    if (!rpc || !account) return;
    let cancelled = false;
    fetchPositions(rpc, account)
      .then((positions) => { if (!cancelled) setList(positions); })
      .catch((e) => { if (!cancelled) setErr(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [rpc, account, tx.state]);

  if (!rpc || !account) return null;

  return (
    <section className="card positions" aria-label="Your positions">
      <div className="positions-head">
        <h2>Your positions</h2>
        <span>{list ? `${list.length} position${list.length === 1 ? "" : "s"}` : err ? "" : "Loading..."}</span>
      </div>
      {err && <p className="panel-error">{err}</p>}
      {list && list.length === 0 && (
        <p className="positions-empty">No staking positions for this account yet.</p>
      )}
      {list && list.length > 0 && (
        <div className="position-grid">
          {list.map((position) => (
            <PositionCard
              key={position.id.toString()}
              pos={position}
              compound={() => send(deployment.stakingProxy, calldata.staking.compoundRewards(position.id) as `0x${string}`, `compound #${position.id}`)}
              unstake={() => send(deployment.stakingProxy, calldata.staking.unstakePosition(position.id) as `0x${string}`, `unstake #${position.id}`)}
              earlyUnlock={() => {
                const ok = window.confirm(
                  `Early unlock position #${position.id}\n\n` +
                  "This exits the position before its lock ends. The protocol permanently " +
                  "burns the early-unlock penalty (currently 5%) of the staked amount and " +
                  "returns the rest to you.\n\nContinue?",
                );
                if (ok) send(deployment.stakingProxy, calldata.staking.earlyUnlock(position.id) as `0x${string}`, `early unlock #${position.id}`);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PositionCard(
  { pos, compound, unstake, earlyUnlock }:
  { pos: Position; compound: () => void; unstake: () => void; earlyUnlock: () => void },
) {
  const unlocked = pos.active && pos.unlocked;
  const locked = pos.active && !pos.unlocked && pos.lockEndTime > 0n;
  return (
    <article className="position-card">
      <div className="position-card-head">
        <div className="position-amount">
          <strong>{formatNoxDisplay(pos.amount)}</strong>
          <span>NOX · position #{pos.id.toString()}</span>
        </div>
        <StatusPill active={pos.active} unlocked={pos.unlocked} />
      </div>
      <div className="position-facts">
        <div>
          <span>Lock period</span>
          <strong>{duration(pos.lockPeriod)}</strong>
        </div>
        <div>
          <span>Unlocks</span>
          <strong>{unlockDate(pos.lockEndTime)}</strong>
        </div>
      </div>
      <div className="position-card-actions">
        <button type="button" className="btn-ghost" onClick={compound}>Compound</button>
        {locked ? (
          <button type="button" className="btn-caution" onClick={earlyUnlock}
            title="Exit before the lock ends - burns the early-unlock penalty (5%)">
            Early unlock
          </button>
        ) : (
          <button type="button" className="btn-ghost" onClick={unstake} disabled={!unlocked}
            title={unlocked ? "Unstake this position" : "This position is still locked"}>
            Unstake
          </button>
        )}
      </div>
    </article>
  );
}

function StatusPill({ active, unlocked }: { active: boolean; unlocked: boolean }) {
  if (!active) return <span className="pill">Inactive</span>;
  if (unlocked) return <span className="pill green"><span className="dot" />Unlocked</span>;
  return <span className="pill amber"><span className="dot" />Locked</span>;
}

function unlockDate(value: bigint) {
  if (value === 0n) return "Anytime";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(Number(value) * 1000));
}

function duration(value: bigint) {
  if (value === 0n) return "Flexible";
  const days = value / 86_400n;
  if (days > 0n) return `${days.toString()} days`;
  return `${value.toString()} sec`;
}
