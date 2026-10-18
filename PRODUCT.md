# VibeScope product brief

## One-line pitch

VibeScope is a calm, read-only portfolio viewer for the Robinhood Chain testnet.

## User problem

Testnet participants move between a wallet, launch pages and a block explorer just to answer a simple question: what does this address actually hold?

That friction is especially noticeable on a new network where users are testing several assets at once. A wallet shows token balances only after each token is imported, while an explorer exposes a large amount of unrelated data. Neither gives a focused, understandable overview.

## Target user

- Testnet participants checking their own assets.
- Builders verifying balances after deployments or test transactions.
- Community members inspecting a public testnet address without connecting a wallet.

## Product behavior

1. The user connects a wallet or pastes a public address.
2. VibeScope reads the native ETH balance from the Robinhood Chain RPC.
3. It reads balances for a curated Vibe token list.
4. It attempts to discover additional token positions through the public explorer API.
5. The user can save another ERC-20 contract to a browser-local watchlist.
6. Every position links to its token page in the explorer.

## Why it is useful

- One answer to "what does this address hold?"
- No wallet import required for each token.
- No custody and no transaction risk.
- Works for any public address, including users who have not connected a wallet.
- Fast enough to check again after a test transaction.

## Product principles

- **Read-only first:** never create an approval or transaction.
- **Direct evidence:** read public balances from the network rather than a private backend.
- **Low trust surface:** no account, analytics service or server database.
- **Progressive detail:** show the useful summary first and link out for deeper explorer data.

## Current MVP

- Robinhood Chain testnet network detection.
- Wallet connection through the browser's injected provider.
- Address validation and sharing through the `address` query parameter.
- Native ETH balance.
- Curated and explorer-discovered ERC-20 balances.
- Custom token watchlist stored in `localStorage`.
- Responsive, dependency-free interface.

## Next steps

- Add USD pricing once a reliable testnet price feed is available.
- Group positions by category or token source.
- Compare two addresses side by side.
- Export a proof-friendly PDF snapshot.
- Add optional mobile wallet deep links.

## Evidence

- Working site: GitHub Pages deployment from this repository.
- Source code: complete HTML, CSS and JavaScript in the repository.
- Architecture: static frontend using public RPC and explorer APIs.
- Safety: no private key, approval or transaction flow.
