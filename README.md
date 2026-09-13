# Privent

A company gives an AI agent a wallet and spending rules. The AI proposes. Policy decides. A secure signer executes.

```bash
pnpm install
cp .env.example .env
pnpm test
pnpm typecheck
pnpm lint
pnpm dev
```

- API: http://localhost:3001/health
- Web: http://localhost:3000

## Phase 4 — Execute

Allowed payments are signed by `@privent/blockchain`, not by the agent. Denied payments never reach the signer.

Without `EXECUTOR_PRIVATE_KEY`, the signer is local (a real keccak hash, not broadcast). To send a Sepolia transaction:

1. Put a funded Sepolia key in `EXECUTOR_PRIVATE_KEY` (0x-prefixed).
2. Restart the API.
3. Submit a payment under $500.

The agent package never depends on the signer and never sees the key.
