# MASTER BUILD PROMPT — Autonomous Financial Agent

You are the lead engineer for this project.

Read `docs.md` completely before doing anything.

We are building a **secure autonomous financial agent for businesses**.

The core thesis is:

> AI agents should be able to make financial decisions and execute bounded financial actions without ever receiving unrestricted access to private keys or company funds.

The AI makes decisions.

The deterministic policy engine decides whether those decisions are allowed.

Secure signing handles transaction authorization.

Humans approve high-risk actions.

Blockchain settles the transaction.

---

# IMPORTANT: DO NOT START CODING YET

Your first response must ONLY contain the proposed implementation plan.

Do NOT create files.

Do NOT install packages.

Do NOT write application code.

Do NOT start implementing integrations.

First analyze `docs.md`, the repository, available tooling, and the project requirements.

Then give me a phased implementation plan.

Explain every phase in **very simple language**.

For every phase explain:

1. What we are building
2. Why we need it
3. What files/components will be created
4. What the user will be able to see/do after the phase
5. How we will test it
6. What must be working before moving to the next phase
7. Which sponsor/bounty requirement it contributes to

Keep the explanation understandable to someone who is not reading the code.

At the end, give me:

- proposed tech stack
- proposed folder structure
- dependency list
- external accounts/API keys required
- blockchain networks required
- estimated complexity of each phase
- major technical risks
- integration risks
- what we can realistically finish during a hackathon
- what should be P0/P1/P2/P3
- final demo flow

Then STOP.

Wait for my approval before writing code.

---

# DEVELOPMENT RULES

Once I approve the plan:

## Build phase-by-phase.

Never implement the entire project at once.

For every phase:

```text
PLAN
↓
IMPLEMENT
↓
RUN TESTS
↓
FIX FAILURES
↓
RUN LINT / TYPECHECK
↓
MANUAL VERIFICATION
↓
SHOW ME WHAT WORKS
↓
WAIT FOR APPROVAL
↓
NEXT PHASE
```

Do not silently move to the next phase.

---

# TEST-FIRST MINDSET

Every meaningful feature must have tests.

At minimum:

- unit tests for business logic
- policy-engine tests
- API tests
- integration tests where practical
- blockchain tests for contract behavior
- security tests for authorization boundaries

Do not consider a phase complete merely because the application compiles.

A phase is complete only when its acceptance criteria pass.

---

# SECURITY IS THE HIGHEST PRIORITY

The AI agent must NEVER:

- receive a raw private key
- modify its own permissions
- modify its own spending limits
- approve its own high-risk transaction
- bypass the policy engine
- directly execute unrestricted blockchain transactions
- access confidential strategy parameters
- fabricate transaction confirmations

The AI can only submit an ACTION REQUEST.

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

The policy engine evaluates the request.

Possible results:

```text
ALLOW
DENY
REQUIRE_APPROVAL
```

The AI must never be trusted to determine which result applies.

---

# CORE ARCHITECTURE

Use this architecture as the foundation:

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

Keep every major integration modular.

---

# PHASE STRUCTURE

You may adjust the phases if your repository analysis reveals a better approach, but generally use this progression.

## PHASE 0 — Architecture & Environment

Goal:

Prepare the repository and validate all development assumptions.

Tasks:

- inspect repository
- establish architecture
- initialize project if required
- configure TypeScript
- configure linting
- configure testing
- configure environment variables
- create `.env.example`
- establish folder structure
- establish local development workflow

Tests:

- project builds
- test runner works
- lint passes
- typecheck passes
- basic health check passes

Do NOT integrate external blockchain services yet.

---

# PHASE 1 — Core Domain Model

Build the internal models for:

- Agent
- Wallet
- Permission
- Policy
- Action Request
- Approval Request
- Transaction
- Audit Event

Create clean TypeScript types/interfaces.

Example:

```text
Agent
 ├── identity
 ├── wallet
 ├── permissions
 ├── limits
 └── status
```

Tests must validate:

- valid agent creation
- invalid permissions
- invalid limits
- valid action requests
- invalid action requests

---

# PHASE 2 — Deterministic Policy Engine

This is one of the most important parts of the system.

Implement:

```text
evaluateAction(action, policy)
```

Possible results:

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

$5,000 transfer
→ DENY
```

Also support:

- asset restrictions
- recipient restrictions
- contract restrictions
- transaction limits
- daily limits
- action-type permissions

Write extensive tests.

Test malicious/boundary cases.

Examples:

```text
$499 → ALLOW
$500 → defined behavior
$501 → REQUIRE_APPROVAL

unknown recipient → DENY

unauthorized contract → DENY

wrong asset → DENY

daily limit exceeded → DENY
```

Do not continue until policy behavior is deterministic and well tested.

---

# PHASE 3 — Agent Simulation

Build the AI-agent abstraction.

The agent should produce action requests.

Example:

```text
Agent:
"I need to pay vendor X $750."

↓

ACTION REQUEST

↓

Policy Engine

↓

REQUIRE_APPROVAL
```

At this stage, real blockchain execution is NOT required.

Create a simulated agent capable of:

- reading allowed data
- deciding an action
- generating an action request
- receiving policy results

The goal is to prove the agent cannot bypass the policy engine.

Tests must verify:

- agent can request actions
- agent cannot directly execute transactions
- agent cannot modify policies
- agent cannot modify limits

---

# PHASE 4 — Dashboard

Build the main web application.

Dashboard should show:

## Agent

- name
- status
- wallet
- balance
- identity
- owner

## Permissions

Show:

```text
Read treasury       ✓
Analyze markets     ✓
Spend <$500         ✓
Spend $500-$2,000   Approval required
Spend >$2,000       ✗
```

## Activity

Show:

- decisions
- requests
- approvals
- denials
- transactions
- timestamps

## Approval Center

Show pending high-risk actions.

This phase should make the product understandable without looking at code.

Test the UI behavior and API endpoints.

---

# PHASE 5 — Real Wallet / Privy

Integrate Privy as the wallet/control layer.

Requirements:

- create/use a Privy wallet
- connect the wallet to the agent
- implement appropriate policies
- enforce wallet-level restrictions where supported

The UI policy and actual wallet policy must not contradict each other.

Tests:

- wallet creation
- permitted transaction
- blocked transaction
- policy enforcement

Never expose private keys.

---

# PHASE 6 — ENS Agent Identity

Integrate ENS.

Create an agent identity such as:

```text
treasury-agent.company.eth
```

Use ENS as a meaningful identity layer.

Store useful metadata where appropriate:

- agent name
- capabilities
- owner
- endpoint
- description

Do NOT implement ENS merely as a profile picture/name.

The identity must be connected to the agent authorization model.

---

# PHASE 7 — Chainlink Confidential Workflow

Integrate Chainlink CRE Confidential Workflows.

Sensitive data should remain inside the confidential environment.

Possible private inputs:

- risk thresholds
- strategy parameters
- private allocations
- sensitive credentials
- intermediate calculations

The public result should be something like:

```json
{
  "action": "REDUCE",
  "asset": "ETH",
  "amount": 500
}
```

The confidential strategy itself must not be exposed.

Use an actual `handlerInTee` / equivalent supported confidential handler.

Provide:

- workflow code
- simulation/deployment
- execution evidence

Tests:

- confidential input is processed
- output is correct
- private values are not exposed
- workflow contributes to the actual decision

---

# PHASE 8 — The Graph

Use The Graph as a real blockchain intelligence source.

Do not mock the final data.

The agent should retrieve useful blockchain/protocol information.

Example:

```text
Agent:
"Should treasury exposure to protocol X change?"

↓

The Graph

↓

Live protocol data

↓

Decision engine

↓

Action request
```

If practical, use standardized/composable Graph data.

The Graph integration must materially influence the decision.

---

# PHASE 9 — Secure High-Risk Execution / Ledger

Integrate Ledger Agent Stack / Key Ring / wallet CLI ring according to the current official API.

The critical property:

> The AI agent never receives the private key.

Flow:

```text
Agent
 ↓
Action Request
 ↓
Policy Engine
 ↓
REQUIRE_APPROVAL
 ↓
Human
 ↓
Ledger signing flow
 ↓
Blockchain
```

Test:

- low-risk action does not unnecessarily require approval
- high-risk action requires approval
- rejected action never reaches signer
- agent cannot access private key
- approved transaction executes

---

# PHASE 10 — Real Payment Layer

Choose ONE primary payment ecosystem for the MVP:

### Hedera

Use x402-style service payments.

OR

### Arc

Use USDC-based autonomous payments.

Do not deeply implement both until one works end-to-end.

The agent must perform one real paid request.

Example:

```text
Agent
 ↓
Discover service
 ↓
Check price
 ↓
Check budget
 ↓
Payment
 ↓
Service
 ↓
Result
```

The payment must be real on the target test environment.

---

# PHASE 11 — Agent Service Discovery / Bazantic

Only after the core system works.

Expose one useful service from our system.

Example:

```text
Risk Analysis API
```

Make it discoverable through Bazantic.

Create a reusable Recipe.

Demonstrate:

```text
Raw API
vs
API + Recipe
```

The agent should perform better with the Recipe.

Do not allow Bazantic work to destabilize the core product.

---

# PHASE 12 — Optional DeFi Execution

Only if the core system is stable.

Integrate one:

- Uniswap
- 1inch

The agent can propose or execute a controlled DeFi operation.

Possible flow:

```text
Live data
 ↓
Risk analysis
 ↓
Agent decision
 ↓
Policy check
 ↓
Approval if required
 ↓
DEX execution
```

Do not implement complex DeFi logic unless the basic product is already complete.

---

# PHASE 13 — Security Hardening

Perform a dedicated security pass.

Test:

- prompt injection attempting to bypass policy
- agent attempting permission escalation
- amount boundary attacks
- recipient substitution
- replayed approval requests
- duplicate transaction execution
- malformed action requests
- unauthorized API access
- confidential data leakage
- private key exposure
- policy tampering
- approval spoofing

The security model must be deterministic outside the LLM.

---

# PHASE 14 — Final Demo Preparation

Prepare the product for a 3–5 minute hackathon demo.

The demo should tell ONE story.

Scenario:

```text
Company Treasury
$10,000 USDC

Agent limit:
$500 automatic

$500-$2,000:
Human approval

>$2,000:
Denied
```

Then demonstrate:

### Demo 1

Agent requests $320.

```text
ALLOW
→ transaction executes
```

### Demo 2

Agent requests $1,200.

```text
REQUIRE_APPROVAL
→ human approves
→ secure signing
→ transaction executes
```

### Demo 3

Agent requests $5,000.

```text
DENY
→ transaction never executes
```

Finally show:

```text
Audit Timeline
```

with every action.

---

# DEFINITION OF DONE

The project is NOT finished when:

- the frontend looks good
- the AI responds correctly
- the code compiles

The project is finished when:

1. An agent can request financial actions.
2. The policy engine deterministically controls those actions.
3. Low-risk actions can execute automatically.
4. High-risk actions require human approval.
5. Unauthorized actions are blocked.
6. The AI cannot access private keys.
7. At least one real blockchain transaction works.
8. Audit logs accurately represent what happened.
9. Chainlink confidential processing works if included in the MVP.
10. Sponsor integrations used for submissions actually contribute to the core product.
11. Tests pass.
12. Typecheck passes.
13. Lint passes.
14. README explains setup and architecture.
15. Demo can be reproduced from a clean environment.

---

# CODE QUALITY RULES

Prefer:

- TypeScript
- strict typing
- small modules
- explicit interfaces
- deterministic business logic
- dependency injection where useful
- testable services
- clear error handling

Avoid:

- giant files
- hidden global state
- hardcoded private keys
- hardcoded transaction hashes
- fake blockchain confirmations
- fake sponsor integrations
- unnecessary abstractions
- premature microservices
- overengineering before the MVP works

For hackathon speed, a modular monolith is preferred over unnecessary distributed infrastructure.

---

# EXTERNAL INTEGRATIONS

Before implementing any sponsor integration:

1. Read the current official documentation.
2. Verify the current SDK/API.
3. Verify network/testnet availability.
4. Verify authentication requirements.
5. Verify rate limits.
6. Verify whether the feature is actually available to hackathon participants.
7. Do not invent APIs or SDK methods.
8. If documentation differs from `docs.md`, use the current official documentation and tell me what changed.

---

# IMPORTANT IMPLEMENTATION BEHAVIOR

If an integration becomes blocked:

Do NOT replace it with a fake implementation and pretend it works.

Instead:

1. identify the blocker
2. explain it simply
3. determine whether there is a legitimate fallback
4. keep the architecture modular
5. continue building other independent phases if possible

The final demo must clearly distinguish:

- real functionality
- simulated functionality
- optional functionality

Never misrepresent a simulation as a real transaction or integration.

---

# FINAL OBJECTIVE

Build a polished, technically serious MVP demonstrating:

> **A business can delegate bounded financial authority to an autonomous AI agent without giving the agent unrestricted control over money or secrets.**

The final system should demonstrate:

```text
IDENTITY
   ↓
AUTHORIZATION
   ↓
INTELLIGENCE
   ↓
CONFIDENTIAL DECISION
   ↓
POLICY
   ↓
HUMAN APPROVAL
   ↓
SECURE SIGNING
   ↓
PAYMENT / EXECUTION
   ↓
AUDIT
```

Build this like a real security-critical financial product, not a chatbot with a wallet.

## FIRST ACTION

Do NOT code.

Analyze `docs.md` and the repository.

Return the complete phased implementation plan in simple language.

Then STOP and wait for my approval.