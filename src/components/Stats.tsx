import { useEffect, useState } from "react";
import { liveClient } from "../lib/sdk";
import { formatNoxDisplay } from "../lib/format";
import { useApp } from "../lib/store";

interface Protocol {
  totalStaked: bigint;
  rewardReserve: bigint;
  rewardRunway: bigint;
  paused: boolean;
}

export function Stats() {
  const rpc = useApp((s) => s.rpc);
  const [data, setData] = useState<Protocol | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setData(null);
    setErr(false);
    if (!rpc) return;
    let cancelled = false;
    (async () => {
      try {
        const health = await liveClient(rpc).staking.health();
        if (!cancelled) {
          setData({
            totalStaked: health.totalStaked,
            rewardReserve: health.rewardReserve,
            rewardRunway: health.rewardRunway,
            paused: health.paused,
          });
        }
      } catch {
        if (!cancelled) setErr(true);
      }
    })();
    return () => { cancelled = true; };
  }, [rpc]);

  const value = (fmt: (d: Protocol) => string) => {
    if (!rpc || err) return "-";
    if (!data) return "...";
    return fmt(data);
  };

  return (
    <section className="stats-row" aria-label="Protocol">
      <Stat label="Total staked" value={value((d) => formatNoxDisplay(d.totalStaked, 0))} unit={data && !err ? "NOX" : ""} />
      <Stat label="Reward reserve" value={value((d) => formatNoxDisplay(d.rewardReserve, 0))} unit={data && !err ? "NOX" : ""} />
      <Stat label="Reward runway" value={value((d) => runway(d.rewardRunway))} />
      {data?.paused && <span className="pill amber stats-paused"><span className="dot" />Paused</span>}
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="stat-cell">
      <span className="stat-label">{label}</span>
      <strong>
        {value}
        {unit && <span className="unit">{unit}</span>}
      </strong>
    </div>
  );
}

function runway(value: bigint) {
  const days = value / 86_400n;
  if (days > 0n) return `${days.toString()} days`;
  return `${value.toString()} sec`;
}
