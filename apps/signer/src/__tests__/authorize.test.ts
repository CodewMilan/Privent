import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authorize } from "../authorize.js";
import { openSignerDatabase, type SignerDatabase } from "../db.js";

const AGENT_ID = "agent_test";
const ACTION_ID = "action_test";
const APPROVAL_ID = "approval_test";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const BAD_RECIPIENT = "0x9999999999999999999999999999999999999999";
const CHAIN_ID = 11155111;

function loadSchema(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../api/src/db/schema.sql"), "utf8");
}

function seed(db: SignerDatabase): void {
  db.exec(loadSchema());
  db.prepare(
    `INSERT INTO agents (
      id, name, ens_name, wallet_address,
      daily_limit_cents, per_transaction_limit_cents,
      approval_threshold_cents, deny_threshold_cents,
      allowed_assets, allowed_contracts, allowed_recipients,
      status, owner, created_at
    ) VALUES (?, 'treasury', NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'acme', ?)`,
  ).run(
    AGENT_ID,
    "0x1111111111111111111111111111111111111111",
    1_000_000,
    200_000,
    50_000,
    200_000,
    JSON.stringify(["USDC"]),
    JSON.stringify([]),
    JSON.stringify([RECIPIENT]),
    new Date().toISOString(),
  );
  db.prepare(
    `INSERT INTO agent_controls (
      agent_id, max_auto_cents, max_send_cents, allowed_recipients,
      export_private_key, chain_id, privy_policy_id, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, NULL, ?)`,
  ).run(
    AGENT_ID,
    50_000,
    200_000,
    JSON.stringify([RECIPIENT]),
    CHAIN_ID,
    new Date().toISOString(),
  );
}

function insertAction(
  db: SignerDatabase,
  overrides: Partial<{
    id: string;
    action: string;
    asset: string;
    amount: number;
    recipient: string | null;
    decision: string;
  }> = {},
): string {
  const id = overrides.id ?? ACTION_ID;
  db.prepare(
    `INSERT INTO action_requests (
      id, agent_id, action, asset, amount_cents, recipient, contract,
      reason, policy_decision, policy_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'demo', ?, NULL, ?)`,
  ).run(
    id,
    AGENT_ID,
    overrides.action ?? "TRANSFER",
    overrides.asset ?? "USDC",
    overrides.amount ?? 32_000,
    overrides.recipient ?? RECIPIENT,
    overrides.decision ?? "ALLOW",
    new Date().toISOString(),
  );
  return id;
}

describe("signer authorize", () => {
  let db: SignerDatabase;

  beforeEach(() => {
    db = openSignerDatabase(":memory:");
    seed(db);
  });

  afterEach(() => {
    db.close();
  });

  it("allows a healthy $320 TRANSFER to an allowlisted recipient", () => {
    const id = insertAction(db, { amount: 32_000 });
    const result = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(result.ok).toBe(true);
  });

  it("refuses an unknown action id", () => {
    const result = authorize({
      db,
      actionRequestId: "does-not-exist",
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(result).toMatchObject({ ok: false, code: "ACTION_NOT_FOUND" });
  });

  it("refuses when the caller claims a different agent id", () => {
    const id = insertAction(db);
    const result = authorize({
      db,
      actionRequestId: id,
      agentId: "some_other_agent",
      signerChainId: CHAIN_ID,
    });
    expect(result).toMatchObject({ ok: false, code: "AGENT_MISMATCH" });
  });

  it("refuses when signer chain id does not match wallet chain id", () => {
    const id = insertAction(db);
    const result = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: 1,
    });
    expect(result).toMatchObject({ ok: false, code: "CHAIN_MISMATCH" });
  });

  it("refuses when recipient is not on the allowlist (even if action row says ALLOW)", () => {
    const id = insertAction(db, {
      recipient: BAD_RECIPIENT,
      amount: 32_000,
      decision: "ALLOW",
    });
    const result = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    // App policy denies for non-allowlisted recipient.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["POLICY_DENIED", "WALLET_POLICY_DENIED"]).toContain(result.code);
    }
  });

  it("refuses a $5,000 request even if the action row lies and says ALLOW", () => {
    const id = insertAction(db, { amount: 500_000, decision: "ALLOW" });
    const result = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["POLICY_DENIED", "WALLET_POLICY_DENIED"]).toContain(result.code);
    }
  });

  it("requires approval before signing REQUIRE_APPROVAL", () => {
    const id = insertAction(db, { amount: 120_000, decision: "REQUIRE_APPROVAL" });
    const pending = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(pending).toMatchObject({ ok: false, code: "APPROVAL_REQUIRED" });

    db.prepare(
      `INSERT INTO approvals (id, action_request_id, status, decided_by, decided_at, created_at)
       VALUES (?, ?, 'pending', NULL, NULL, ?)`,
    ).run(APPROVAL_ID, id, new Date().toISOString());
    const stillPending = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(stillPending).toMatchObject({ ok: false, code: "APPROVAL_REQUIRED" });

    db.prepare(
      `UPDATE approvals SET status = 'rejected', decided_by = 'cfo', decided_at = ? WHERE id = ?`,
    ).run(new Date().toISOString(), APPROVAL_ID);
    const rejected = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(rejected).toMatchObject({ ok: false, code: "APPROVAL_REJECTED" });

    db.prepare(
      `UPDATE approvals SET status = 'approved' WHERE id = ?`,
    ).run(APPROVAL_ID);
    const approved = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(approved.ok).toBe(true);
  });

  it("refuses a replay when a transaction for the action already exists", () => {
    const id = insertAction(db);
    db.prepare(
      `INSERT INTO transactions (id, action_request_id, hash, status, from_address, to_address, mode, error, created_at)
       VALUES (?, ?, ?, 'confirmed', ?, ?, 'simulated', NULL, ?)`,
    ).run(
      "tx_prior",
      id,
      "0xabc123",
      "0x1111111111111111111111111111111111111111",
      RECIPIENT,
      new Date().toISOString(),
    );
    const result = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(result).toMatchObject({ ok: false, code: "DUPLICATE_TRANSACTION" });
    if (!result.ok) {
      expect(result.existingTransaction?.hash).toBe("0xabc123");
    }
  });

  it("refuses a malformed recipient", () => {
    const id = insertAction(db, { recipient: "not-an-address" });
    const result = authorize({
      db,
      actionRequestId: id,
      agentId: AGENT_ID,
      signerChainId: CHAIN_ID,
    });
    expect(result).toMatchObject({ ok: false, code: "INVALID_RECIPIENT" });
  });
});
