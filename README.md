# Privent

A company gives an AI agent bounded access to a treasury. The AI proposes. Policy decides. A secure signer executes. The agent never holds a key.

## Live demo path (real, no mocks)

- **AI agent** — OpenRouter (`openai/gpt-4o-mini`). Real HTTP call. Sees treasury + policy + live Uniswap pulse; produces one JSON action request. Never signs, never approves itself, never bypasses policy.
- **Policy engine** — deterministic. ALLOW under $500, REQUIRE_APPROVAL $500–$2,000, DENY over $2,000.
- **Signer isolation** — `EXECUTOR_PRIVATE_KEY` lives only in `@privent/blockchain`. The agent package cannot import it.
- **Sepolia execution** — real viem broadcast from a funded testnet key. Confirmed via `eth_getTransactionReceipt`.
- **The Graph** — Subgraph Studio gateway, live Uniswap V3 USDC/WETH pool.
- **ENS** — mainnet read via viem (`treasury-agent.company.eth` records built from live agent state; name not registered on-chain).
- **Privy** — real wallet-policy publish on API boot when `PRIVY_APP_ID` + `PRIVY_APP_SECRET` are set.

## Not in the live demo path (honestly hidden)

- **Ledger** — no CLI or device available. Dashboard shows "Not connected in this demo".
- **Chainlink CRE** — no runtime available. Code shape matches docs, but the demo does not claim it runs.
- **Circle Arc** — Circle developer-controlled wallets not wired. Dashboard makes no Arc claim.

## Run the demo

```bash
pnpm install
pnpm test        # 125 tests
pnpm typecheck
pnpm lint
pnpm dev         # API on :3001, web on :3000
```

Environment (`.env`):

| Var | Required for | Notes |
|---|---|---|
| `EXECUTOR_PRIVATE_KEY` | real Sepolia | funded Sepolia key; omit for local simulated signer |
| `RPC_URL` | real Sepolia | e.g. `https://ethereum-sepolia-rpc.publicnode.com` |
| `CHAIN_ID` | | `11155111` |
| `GRAPH_API_KEY` | live Uniswap pulse | Subgraph Studio |
| `LLM_API_KEY` | AI agent | OpenRouter key (`sk-or-…`) |
| `LLM_MODEL` | | default `openai/gpt-4o-mini` |
| `PRIVY_APP_ID` / `PRIVY_APP_SECRET` | wallet policy publish | optional |

Feature flags (default off for the honest demo):

- `LEDGER_ENABLED=true` — turn on the Ledger CLI adapter (device required)
- `CRE_ENABLED=true` — turn on the Chainlink CRE-shaped confidential layer
- `ARC_ENABLED=true` — reserved; today Arc stays simulated regardless

## The three-transaction story

1. **$320** — click "AI proposes: exchange listing fee" → LLM produces JSON → policy ALLOW → real Sepolia broadcast.
2. **$1,200** — click "AI proposes: vendor retainer" → policy REQUIRE_APPROVAL → human approves in dashboard → real Sepolia broadcast.
3. **$5,000 attack** — click "AI (prompt-injected): urgent $5,000" → LLM produces JSON → policy DENY → nothing reaches the signer.

Every row in Activity is badged "AI proposed · openai/gpt-4o-mini". Every event in the Audit trail is a real state change written by the API.
