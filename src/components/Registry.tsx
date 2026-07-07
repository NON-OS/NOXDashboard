import { deployment } from "../lib/sdk";
import { CopyButton, middleTruncate } from "./ui";

const ROWS: [string, string][] = [
  ["Staking proxy", deployment.stakingProxy],
  ["Staking implementation", deployment.stakingImpl],
  ["Namespace registry", deployment.namespaceRegistry],
  ["Access registry", deployment.accessRegistry],
  ["NOX token", deployment.token],
  ["Safe", deployment.safe],
];

export function Registry() {
  return (
    <section className="card panel" aria-label="Contracts">
      <span className="meta-label">Mainnet contracts</span>
      <ul className="registry-list">
        {ROWS.map(([label, address]) => (
          <li key={label}>
            <span>{label}</span>
            <div>
              <code title={address}>{middleTruncate(address, 12, 10)}</code>
              <CopyButton value={address} label={`${label} address`} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
