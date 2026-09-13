# Privent

A company gives an AI agent a wallet and spending rules. The AI proposes. Policy decides. A secure signer executes.

## Phase 1

Monorepo, types, SQLite, and an API health check. No sponsor SDKs yet.

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
