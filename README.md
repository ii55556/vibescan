# VibeScope

VibeScope is a read-only portfolio viewer for the Robinhood Chain testnet. It gives a focused view of ETH and ERC-20 balances without asking for a signature, approval, private key or transaction.

**Live demo:** https://ii55556.github.io/vibescan/

## The problem

Testnet assets are spread across launch pages, wallets and block explorers. Checking which assets an address holds usually means bouncing between several interfaces. VibeScope makes the common case direct: inspect an address once and see its public balances.

## What works

- Connect an injected browser wallet on Robinhood Chain testnet.
- Inspect any valid public address without connecting a wallet.
- Read native ETH balance from the public RPC.
- Read ERC-20 balances for a curated Vibe token list.
- Discover token positions through the public Blockscout API when available.
- Add any ERC-20 contract to a browser-local watchlist.
- Copy addresses and jump to the relevant explorer pages.
- Responsive, dependency-free interface.

## Safety model

VibeScope is read-only by design.

- It never requests a seed phrase or private key.
- It never requests token approvals.
- It never creates or signs a transaction.
- Custom token addresses stay in the current browser through `localStorage`.
- The application has no backend and stores no account data.

## Network

| Property | Value |
| --- | --- |
| Network | Robinhood Chain Testnet |
| Chain ID | `46630` (`0xb626`) |
| RPC | `https://rpc.testnet.chain.robinhood.com` |
| Explorer | `https://explorer.testnet.chain.robinhood.com` |

## Curated tokens

| Token | Contract |
| --- | --- |
| SO | `0xe80608E0159E3A4AcA5dBd556b1D1Ca562585516` |
| SLOW | `0xDF2271BBC1b4D642ffA5C164f5b757035D40c5a5` |
| PURR | `0x7BA0845AaE8bcE744484535925B490982500711D` |

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

The repository is designed for GitHub Pages. Publish the repository root from the `main` branch, then open the Pages URL.

## Limitations

- ERC-20 discovery depends on the public explorer API and falls back to the curated and custom watchlists.
- Token values are displayed as units, not priced in USD.
- Some non-standard tokens may not expose readable metadata.
- Everything is testnet-only and has no monetary value.

## Built for

vibe/vibe Season 0, Product & Utility category.
