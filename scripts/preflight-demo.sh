#!/usr/bin/env bash
set -euo pipefail

# Preflight before you hit record. Does not capture video.
# Usage: ./scripts/preflight-demo.sh

WEB="${WEB_URL:-http://localhost:3000}"
API="${API_URL:-http://localhost:3001}"
SIGNER="${SIGNER_URL:-http://127.0.0.1:3002}"

fail() {
  echo "FAIL  $1"
  exit 1
}

ok() {
  echo "ok    $1"
}

echo "Privent demo preflight"
echo

curl -fsS -m 3 "$WEB" >/dev/null || fail "web not up at $WEB — run pnpm dev"
ok "web  $WEB"

api_health="$(curl -fsS -m 3 "$API/health" || true)"
[[ "$api_health" == *'"ok":true'* ]] || fail "api not up at $API/health"
ok "api  $API"

signer_health="$(curl -fsS -m 3 "$SIGNER/health" || true)"
[[ "$signer_health" == *'"ok":true'* ]] || fail "signer not up at $SIGNER/health — $320 and $1,200 will fail"
ok "signer  $SIGNER"

if [[ "$signer_health" == *'"mode":"testnet"'* ]]; then
  ok "signer mode is testnet (real Sepolia)"
else
  echo "warn  signer is not in testnet mode — explorer links may be missing"
fi

echo
echo "Ready. Open $WEB then follow docs/demo-script.md"
echo "Target length: 2 minutes. One take. Do not mention localhost, Ledger, or 'live'."
