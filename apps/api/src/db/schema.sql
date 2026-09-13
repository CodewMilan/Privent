CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ens_name TEXT,
  wallet_address TEXT,
  daily_limit_cents INTEGER NOT NULL,
  per_transaction_limit_cents INTEGER NOT NULL,
  approval_threshold_cents INTEGER NOT NULL,
  deny_threshold_cents INTEGER NOT NULL,
  allowed_assets TEXT NOT NULL,
  allowed_contracts TEXT NOT NULL,
  allowed_recipients TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  owner TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_requests (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  recipient TEXT,
  contract TEXT,
  reason TEXT,
  policy_decision TEXT,
  policy_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  action_request_id TEXT NOT NULL,
  status TEXT NOT NULL,
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (action_request_id) REFERENCES action_requests(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  action_request_id TEXT NOT NULL,
  hash TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (action_request_id) REFERENCES action_requests(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  action_request_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);
