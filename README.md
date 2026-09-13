# Privent

A company gives an AI agent bounded access to a treasury. The AI proposes. Policy decides. A secure **isolated signer** in its own process executes. The agent never holds a key.

## Live demo path (real, no mocks)

- **AI agent** — OpenRouter (`openai/gpt-4o-mini`). Real HTTP call. Sees treasury + policy + live Uniswap pulse; produces one JSON action request. Never signs, never approves itself, never bypasses policy.
- **Policy engine** — deterministic. ALLOW under $500, REQUIRE_APPROVAL $500–$2,000, DENY over $2,000.
- **Signer isolation** — a separate Node process (`apps/signer`, port 3002) owns `EXECUTOR_PRIVATE_KEY`. The API process (`apps/api`, port 3001) has no key in its environment. The AI package (`@privent/agent-llm`) has no dependency on the signer or the blockchain package.
- **Independent verification** — the signer does not trust anything the API tells it. On every `/sign` call it re-loads the action, agent, wallet controls, and approval rows from SQLite; re-runs app policy and wallet policy from scratch; re-checks chain id, allowlist, amount caps, and approval state; and uses a unique `transactions.action_request_id` constraint to prevent replays. Any check that fails returns 4xx with no broadcast.
- **Sepolia execution** — real viem broadcast from a funded testnet key inside the signer process. Confirmed via `eth_getTransactionReceipt`.
- **The Graph** — Subgraph Studio gateway, live Uniswap V3 USDC/WETH pool.
- **ENS** — mainnet read via viem (`treasury-agent.company.eth` records built from live agent state; name not registered on-chain).
- **Privy** — real wallet-policy publish on API boot when `PRIVY_APP_ID` + `PRIVY_APP_SECRET` are set.

## Not in the live demo path (honestly hidden)

- **Ledger** — no CLI or device available. Dashboard shows "not connected".
- **Chainlink CRE** — no runtime available. Code shape matches docs; demo does not claim it runs.
- **Circle Arc** — developer-controlled wallets not wired. Dashboard makes no Arc claim.
- **HSM / TPM / enclave for the signer** — the signer is a separate OS process on the same machine. What is proven is process isolation, a narrow interface, and independent re-verification — not silicon-level custody.

## Architecture

```
   ┌───────────────────────────┐       POST /sign        ┌──────────────────────────┐
   │   apps/api  (public)      │  {actionRequestId,      │   apps/signer (private)  │
   │                           │   agentId}              │                          │
   │  • Hono HTTP :3001        │ ──────────────────────▶ │  • Hono HTTP :3002       │
   │  • OpenRouter LLM         │  Bearer SIGNER_TOKEN    │  • Owns EXECUTOR_PK      │
   │  • Policy engine          │                         │  • Re-reads SQLite       │
   │  • SQLite (rw)            │                         │  • Re-runs policy        │
   │  • Audit                  │ ◀────────────────────── │  • Reserves tx row       │
   │                           │  {hash, status, mode}   │  • Broadcasts via viem   │
   │  NO PRIVATE KEY           │                         │  • NO Hono routes for    │
   │                           │                         │    LLM, agents, policy   │
   └───────────────────────────┘                         └──────────────────────────┘
```

The narrow interface — one `POST /sign` accepting only `{ actionRequestId, agentId }` — is why the AI cannot "just ask the signer to send $5,000". The signer looks up the row itself and re-evaluates policy from scratch. An attacker who somehow flipped `action_requests.policy_decision` in the DB would still be rejected because the signer re-runs policy, not the stored decision.

## Run the demo

```bash
pnpm install
pnpm test        # 150 tests
pnpm typecheck
pnpm lint
pnpm dev         # signer :3002, api :3001, web :3000 in parallel
```

Environment split:

- **Root `.env`** — everything the API and web need. **Never `EXECUTOR_PRIVATE_KEY`.**
- **`apps/signer/.env`** — signer-only: `EXECUTOR_PRIVATE_KEY`, `RPC_URL`, `SIGNER_PORT`, `SIGNER_TOKEN`, `SIGNER_DATABASE_PATH`.

| Var | Where | Notes |
|---|---|---|
| `SIGNER_URL` / `SIGNER_TOKEN` | root `.env` | how the API reaches the signer |
| `EXECUTOR_PRIVATE_KEY` | **`apps/signer/.env` only** | funded Sepolia key |
| `RPC_URL` | `apps/signer/.env` | e.g. `https://ethereum-sepolia-rpc.publicnode.com` |
| `CHAIN_ID` | both | `11155111` |
| `GRAPH_API_KEY` | root | Subgraph Studio |
| `LLM_API_KEY` | root | OpenRouter (`sk-or-…`) |
| `LLM_MODEL` | root | default `openai/gpt-4o-mini` |
| `PRIVY_APP_ID` / `PRIVY_APP_SECRET` | root | optional wallet-policy publish |

Feature flags (default off for the honest demo): `LEDGER_ENABLED`, `CRE_ENABLED`, `ARC_ENABLED`.

## The three-transaction story

1. **$320** — click "AI proposes: exchange listing fee" → LLM produces JSON → policy ALLOW → API calls signer over HTTP → signer independently re-authorizes → real Sepolia broadcast.
2. **$1,200** — "AI proposes: vendor retainer" → policy REQUIRE_APPROVAL → human approves in dashboard → API asks signer → signer verifies approval row exists → real Sepolia broadcast.
3. **$5,000 attack** — "AI (prompt-injected): urgent $5,000" → LLM produces the requested JSON → policy DENY → API never contacts the signer. Audit shows `execution.skipped` and zero `signer.requested` events for this action.

## Signer safety guarantees, and how they are tested

| Guarantee | Test |
|---|---|
| Wrong bearer token → 401 | `apps/signer/src/__tests__/app.test.ts` |
| Unknown action id → 404 | same |
| Body missing `actionRequestId`/`agentId` → 400 | same |
| Caller lies about agent id → 403 `AGENT_MISMATCH` | same |
| $5,000 with a lied-about `ALLOW` in the DB → 403 policy denied | same |
| REQUIRE_APPROVAL without an approval row → 403 `APPROVAL_REQUIRED` | same |
| Idempotency: two `/sign` calls → one tx row, second returns the same hash with `reused: true` | same |
| Chain-id mismatch → 403 | `apps/signer/src/__tests__/authorize.test.ts` |
| Replayed action (existing confirmed tx) → 403 `DUPLICATE_TRANSACTION` | same |
| Rejected approval → 403 `APPROVAL_REJECTED` | same |
| Malformed recipient → 403 `INVALID_RECIPIENT` | same |
| End-to-end $320 / $1,200 / $5,000 flows through the boundary | `apps/api/src/__tests__/signer-boundary.test.ts` |
| LLM prompt-injection attack denied by policy, never reaches signer | same + `tests/e2e/demo-live.test.ts` |
| Agent and agent-llm packages have no signer/blockchain deps | same |

Every row in Activity is badged "AI proposed · openai/gpt-4o-mini". Every event in the Audit trail is a real state change written by the API. Every `signer.requested` audit event names the isolated signer's endpoint.
