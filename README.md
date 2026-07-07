# @nonos/nox-dashboard

Local-first staking dashboard for NOX. It runs in your browser, talks only to
the RPC and wallet you choose, and never sends your data anywhere. Built on
[`@nonos/nox-staking-sdk`](https://www.npmjs.com/package/@nonos/nox-staking-sdk),
which prepares and validates every transaction locally.

Stake NOX without trusting a website.

## Run it locally (recommended)

One command. It downloads the prebuilt dashboard, serves it on localhost, and
opens your browser.

```bash
npx @nonos/nox-dashboard
```

Node 20+ required. Nothing is installed globally, and nothing keeps running
after you stop it with ctrl-c. The dashboard is on your machine, so there is no
server to trust.

## Use the hosted copy

If you just want a link, a convenience copy runs at
<https://staking.nonos.software>. It serves the same build you get from `npx`,
so you can verify it against what you run yourself.

## Build it from source

```bash
git clone https://github.com/eKisNonos/NOXDashboard.git
cd NOXDashboard
npm install
npm run dev        # develop at http://127.0.0.1:5173
npm run build      # static bundle in dist/
npm start          # serve the built dist/ locally, same as npx
```

The build is a static single-page app in `dist/`. Host those files on any
static host, or open them with any static server. The three ways above produce
and serve the same bundle.

## What it does

- Read live protocol and account state through your RPC.
- Prepare, simulate, and send staking transactions: approve, stake, stake
  locked, claim, compound, unstake, and early unlock.
- Connect a browser wallet or WalletConnect, or watch an address read-only.
- Export calldata or a Safe payload for hardware and multisig signing.

## What it will not do

- No fallback RPC. Requests go only to the endpoint you enter.
- No telemetry, no analytics, no third-party calls.
- No keys held. Signing happens only through your wallet.
- Nothing is broadcast without your explicit confirmation.

Watch-only mode cannot sign. Use a Safe or hardware wallet for meaningful
balances.

## License

AGPL-3.0-or-later. The source is public so you can read it, build it, and host
it yourself.
