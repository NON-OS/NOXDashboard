import { Positions } from "./components/Positions";
import { Registry } from "./components/Registry";
import { RpcInput } from "./components/RpcInput";
import { StakeCard } from "./components/StakeCard";
import { Stats } from "./components/Stats";
import { TxStatus } from "./components/TxStatus";
import { WalletButton } from "./components/WalletModal";

export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>NØNOS</strong>
          <span>Staking</span>
        </div>
        <div className="topbar-right">
          <WalletButton />
        </div>
      </header>

      <section className="hero">
        <h1>Stake NOX</h1>
        <p>Non-custodial staking on your own RPC. Transactions are prepared locally and simulated before you sign.</p>
      </section>

      <div className="column">
        <div className="widget-zone">
          <StakeCard />
          <RpcInput />
          <TxStatus />
        </div>

        <Stats />
        <Positions />

        <section className="advanced">
          <details>
            <summary>Custody and contract details</summary>
            <div className="advanced-grid">
              <CustodyNotes />
              <Registry />
            </div>
          </details>
        </section>
      </div>

      <footer className="footer">
        <span>Use a Safe or hardware wallet for large balances.</span>
        <span>Verify calldata before signing. An RPC can misreport state.</span>
      </footer>
    </main>
  );
}

function CustodyNotes() {
  return (
    <section className="card panel" aria-label="Custody">
      <span className="meta-label">Custody</span>
      <div className="custody-list" style={{ marginTop: 12 }}>
        <div>
          <h3>Safe or hardware wallet - recommended</h3>
          <p>Export the calldata or Safe JSON, then sign outside the browser.</p>
        </div>
        <div>
          <h3>Browser wallet</h3>
          <p>Uses the injected provider you select in this tab.</p>
        </div>
        <div>
          <h3>WalletConnect</h3>
          <p>Connects a mobile wallet over the WalletConnect relay, only after you start it.</p>
        </div>
        <div>
          <h3>Watch-only</h3>
          <p>Read, simulate, and export calldata. Cannot sign transactions.</p>
        </div>
        <div>
          <h3>Local test key</h3>
          <p>Browser memory only, for low-value testing. Never use it for meaningful funds.</p>
        </div>
      </div>
    </section>
  );
}
