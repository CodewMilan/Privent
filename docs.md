# Autonomous Financial Agent — Project Specification

## 1. What We Are Building

Build a secure autonomous financial agent for businesses.

The agent can analyze live blockchain/financial data, make bounded financial decisions, and execute transactions within strict permissions.

The core idea:

> **AI agents should receive financial authority, not unrestricted access to private keys or company funds.**

The system must separate:

- AI decision-making
- deterministic authorization
- confidential computation
- transaction execution
- human approval
- auditability

---

# 2. Core User Story

A company creates a treasury agent.

The company gives it:

- a wallet
- a budget
- permitted actions
- permitted protocols
- spending limits
- escalation rules

The agent can autonomously perform low-risk operations.

High-risk operations require human approval and secure signing.

Example:

```text
Agent wants to spend $200
→ policy allows
→ execute automatically

Agent wants to spend $5,000
→ policy requires approval
→ request human approval
→ Ledger confirmation
→ execute
```

---



# 3. Core Architecture

```text
                    HUMAN
                      |
                      v
              AGENT CONFIGURATION
                      |
                      v
               AGENT IDENTITY
                      |
                      v
                AI AGENT
                      |
          +-----------+-----------+
          |                       |
          v                       v
   LIVE BLOCKCHAIN DATA      PRIVATE ANALYSIS
      The Graph              Chainlink CRE/TEE
          |                       |
          +-----------+-----------+
                      |
                      v
                DECISION ENGINE
                      |
                      v
                POLICY ENGINE
                      |
             +--------+--------+
             |                 |
             v                 v
        LOW RISK           HIGH RISK
             |                 |
             v                 v
       AUTO EXECUTE          APPROVAL
                               |
                               v
                             LEDGER
                               |
                               v
                         SIGN TRANSACTION
                               |
                               v
                          BLOCKCHAIN
                               |
                               v
                         AUDIT LOG
```

---



# 4. MVP

The MVP must implement these features.

## 4.1 Agent Creation

Create an agent with:

- name
- ENS-style identity/name field
- wallet address
- spending limit
- allowed contracts
- allowed assets
- approval threshold
- status

Example:

```json
{
  "name": "treasury-agent",
  "dailyLimit": 1000,
  "perTransactionLimit": 500,
  "approvalThreshold": 500,
  "allowedContracts": [],
  "allowedAssets": ["USDC", "ETH"]
}
```

---



# 5. Agent Dashboard

Build a clean web dashboard showing:

## Agent

- Name
- Status
- Wallet
- Balance
- Human owner
- Current permissions



## Permissions

Example:

```text
Read treasury                 ✓
Analyze markets               ✓
Spend <$500                   ✓
Interact with approved DEX    ✓
Spend >$500                   Requires approval
Change permissions            ✗
Export private key            ✗
```



## Activity

Show:

- agent decisions
- requested transactions
- approved transactions
- rejected transactions
- human approvals
- transaction hashes
- timestamps

---



# 6. Decision Engine

The AI agent must NOT directly control the wallet.

The agent produces an ACTION REQUEST.

Example:

```json
{
  "action": "TRANSFER",
  "asset": "USDC",
  "amount": 750,
  "recipient": "0x...",
  "reason": "Vendor payment"
}
```

The action request is sent to the policy engine.

The AI never bypasses the policy engine.

---



# 7. Policy Engine

Implement deterministic authorization.

Every action must be evaluated against:

- transaction amount
- asset
- recipient
- contract
- action type
- daily spending limit
- agent permissions
- approval threshold

Possible outcomes:

```text
ALLOW
DENY
REQUIRE_APPROVAL
```

Example:

```text
$200 transfer
→ ALLOW

$750 transfer
→ REQUIRE_APPROVAL

$10,000 transfer
→ DENY
```

The policy engine must be deterministic.

Do not allow the LLM to decide whether a policy is satisfied.

---



# 8. Human Approval

When an action requires approval:

```text
Agent
  ↓
Policy Engine
  ↓
REQUIRE_APPROVAL
  ↓
Approval Request
  ↓
Human
  ↓
Approve / Reject
```

The UI should clearly show:

- requested action
- amount
- destination
- reason
- risk level
- agent identity
- current policy
- transaction data

---



# 9. Ledger Integration

Use Ledger tooling for high-risk transaction approval.

The important security property:

> The AI agent must never receive or know the private key.

The agent requests a signature.

The human approves the high-risk operation through the Ledger-controlled signing flow.

Implement this as a separate signer/execution layer.

Do not put private keys in:

- source code
- .env files
- prompts
- agent memory
- logs
- database

---



# 10. Privy Integration

Use Privy for the wallet/control layer where practical.

Use:

- agent wallet
- policies
- authorization/signers
- spending restrictions

Privy should enforce actual wallet-level restrictions rather than merely displaying them in the UI.

The dashboard policy and the actual wallet policy must agree.

---



# 11. ENS Integration

Give the agent a human-readable identity.

Example:

```text
treasury-agent.company.eth
```

The ENS identity should expose useful agent metadata such as:

- agent name
- description
- capabilities
- owner
- service endpoint
- status

ENS should be part of the agent identity system, not a cosmetic profile.

---



# 12. Chainlink Confidential Workflow

Use Chainlink CRE Confidential Workflows for sensitive financial reasoning.

Private inputs may include:

- risk thresholds
- proprietary strategy parameters
- private portfolio allocations
- API credentials
- sensitive intermediate calculations

The public system should only receive the resulting decision/action.

Example:

```text
PUBLIC INPUT
market data

        ↓

CHAINLINK CRE

        ↓

TEE

private:
- strategy
- thresholds
- portfolio targets
- risk model

        ↓

PUBLIC OUTPUT

{
  "action": "REDUCE",
  "asset": "ETH",
  "amount": 500
}
```

Do not expose the private strategy to the frontend or AI agent.

---



# 13. The Graph Integration

Use The Graph as a live blockchain intelligence source.

The agent should be able to retrieve relevant protocol/market data.

The Graph integration should be meaningful to the decision.

Example:

```text
Agent asks:

"Should treasury exposure to protocol X be reduced?"

        ↓

The Graph

        ↓

Protocol data

        ↓

Risk analysis

        ↓

Agent decision
```

Do not use mocked blockchain data in the final demo.

---



# 14. Payment Layer

Implement one real payment/execution flow.

Preferred options:

### Option A — Hedera

Use x402-style service payments.

The agent discovers a service, receives a payment requirement, and pays autonomously within its budget.

### Option B — Arc

Use USDC and Arc for autonomous agent payments/settlement.

Do not implement both deeply in the first MVP.

Build one correctly.

---



# 15. Agent Service Marketplace

Optional but high-value feature.

Allow agents to discover services such as:

```text
Risk Analysis API
$0.02/request

Market Data API
$0.01/request

Portfolio Analysis
$0.05/request
```

The agent can:

1. discover service
2. inspect price
3. evaluate budget
4. request service
5. pay
6. receive result
7. use result in its decision

This creates a machine-to-machine economic workflow.

---



# 16. Audit Trail

Every action must create an audit event.

Example:

```text
10:31:02
Agent requested $750 USDC payment

10:31:02
Policy evaluation → REQUIRE_APPROVAL

10:31:15
Human approval requested

10:31:43
Human approved

10:31:48
Ledger signature confirmed

10:31:52
Transaction broadcast

10:32:01
Transaction confirmed
```

Never log private keys or confidential strategy parameters.

---



# 17. Security Rules

These rules are mandatory.

## The AI agent MUST NOT:

- access private keys
- modify its own permissions
- modify spending limits
- approve its own high-risk transactions
- bypass the policy engine
- directly broadcast unrestricted transactions
- access confidential strategy parameters
- fabricate transaction confirmation



## The AI agent MAY:

- analyze data
- request actions
- request payments
- select among permitted services
- propose transactions
- execute actions that satisfy deterministic policies

---



# 18. Recommended Tech Stack



## Frontend

- Next.js
- TypeScript
- Tailwind
- clean financial dashboard



## Backend

- Node.js
- TypeScript
- REST API
- PostgreSQL or SQLite for MVP



## Agent

- TypeScript
- LLM provider
- tool-calling architecture



## Blockchain

- EVM-compatible testnet
- viem/ethers where appropriate



## Integrations

- Privy
- Ledger Agent Stack / Wallet CLI
- Chainlink CRE
- ENSv2
- The Graph

Optional:

- Hedera
- Arc
- Bazantic

---



# 19. Repository Structure

```text
/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── agent/
│   ├── policy-engine/
│   ├── blockchain/
│   ├── ledger/
│   ├── privy/
│   ├── ens/
│   ├── graph/
│   └── chainlink/
│
├── contracts/
│
├── docs/
│
├── tests/
│
├── .env.example
├── README.md
└── docs.md
```

Keep integrations modular.

A sponsor integration should be replaceable without rewriting the entire system.

---



# 20. Main Demo

The final demo should tell one story.

## Scenario

Company creates:

```text
Acme Treasury Agent
```

Treasury:

```text
$10,000 USDC
```

Permissions:

```text
Auto-execute:
<$500

Human approval:
$500-$2,000

Denied:
>$2,000
```

Then:

### Step 1

Agent retrieves live blockchain data.

### Step 2

Agent identifies an opportunity / required payment.

### Step 3

Agent proposes:

```text
Pay $320
```

Policy engine:

```text
ALLOW
```

Transaction executes.

### Step 4

Agent proposes:

```text
Pay $1,200
```

Policy engine:

```text
REQUIRE_APPROVAL
```

Human receives approval request.

### Step 5

Human approves using secure signing.

### Step 6

Transaction executes.

### Step 7

Dashboard shows the complete audit trail.

### Step 8

Attempt:

```text
Pay $5,000
```

Policy engine:

```text
DENY
```

The agent cannot bypass it.

---



# 21. Winning Demo Moment

The most important moment:

Show the AI agent attempting something it is NOT allowed to do.

Example:

```text
AGENT

"I need to transfer $5,000."

        ↓

POLICY ENGINE

DENIED

Reason:
Transaction exceeds agent authority.

Agent limit:
$2,000

Requested:
$5,000
```

Then show:

```text
Agent cannot change policy.
Agent cannot access private key.
Agent cannot bypass approval.
```

This demonstrates the central thesis.

---



# 22. Sponsor Strategy

Primary targets:

### Chainlink

Confidential financial decision-making.

### Ledger

Secure signing and human approval.

### ENS

Agent identity and namespace.

### Hedera OR Arc

Autonomous financial payments.

Secondary targets:

### Privy

Business wallets, policies and authorization.

### The Graph

Live blockchain intelligence.

### Bazantic

Agent-discoverable/payable APIs.

Optional:

### Uniswap / 1inch

DeFi execution.

Do not add an integration merely to qualify for a bounty.

Every integration must have a real architectural purpose.

---



# 23. MVP Priority



## P0 — MUST WORK

- Agent
- Wallet
- Policy engine
- Transaction request
- Automatic allowed transaction
- Human approval flow
- Rejected transaction
- Audit log
- One real blockchain transaction



## P1 — HIGH VALUE

- Ledger
- Chainlink confidential workflow
- ENS identity
- Privy policies



## P2 — BOUNTY EXTENSIONS

- The Graph
- Hedera/Arc payment flow
- Bazantic service discovery



## P3 — OPTIONAL

- Uniswap
- 1inch
- multi-agent negotiation
- reputation system
- advanced marketplace

---



# 24. Core Product Thesis

The product is NOT:

> "An AI that trades crypto."

The product is:

> **"A security and execution layer that lets businesses safely delegate bounded financial authority to autonomous AI agents."**

The AI makes decisions.

The infrastructure controls what the AI is allowed to do.

Humans retain control over irreversible/high-risk actions.

Private strategies remain confidential.

Every financial action is auditable.

---



# 25. Engineering Principle

Never trust the AI to enforce its own security.

```text
AI decides WHAT it wants to do.

Policy decides WHETHER it may do it.

Secure signer decides WHETHER the transaction can be cryptographically authorized.

Blockchain decides WHETHER the transaction actually settles.
```

This separation must remain true throughout the implementation.