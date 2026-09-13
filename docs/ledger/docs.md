---
title: Agent capabilities with Ledger signers and services
category: explanation
description: Hardware-grade signing for AI agents via DMK skills and the Ledger Wallet CLI, with human-in-the-loop confirmation on critical actions.
---

import { Callout } from 'nextra/components'
import { DocCard, DocCards } from '@/components/features/doc-card'

# Agent capabilities with Ledger signers and services

Ledger offers two AI tools, addressed to two different readers and two different jobs. The **Ledger Wallet CLI** is a terminal binary that you (or your agent) drive at runtime to manage your own accounts: balances, transfers, swaps, and staking, with on-device confirmation on every signing step. **DMK skills** are Markdown instruction sets that your coding agent loads at build time so it can help you integrate the Device Management Kit into an application you are building. In both cases, the Ledger device stays the final gate. On top of either tool, **hardware security features** let you protect the credentials and service access your agents rely on, using your signer as the hardware gate for encryption and authentication.

## Pick the tool for your job

The two tools answer different questions. Pick the row that matches what you want to do; you do not need both.

<DocCards>
  <DocCard title="Manage your own Ledger accounts from a terminal or agent" href="./ledger-cli" accent="orange" label="Ledger Wallet CLI · runtime">
    For end users and power users running an agent against their own wallet. Install the CLI, plug in your Ledger, and run discover, balances, send, receive, swap, and staking. Drive these commands directly from a terminal or through any agent that can run shell commands (Claude Code, Cursor, or your own).
  </DocCard>
  <DocCard title="Add Ledger support to an app you are building" href="./ledger-dmk-skills" accent="purple" label="DMK skills · build time">
    For application developers integrating hardware signing into their own product. Markdown skill files teach your coding agent intent mapping, a 5-step execution process with HITL gates, and the concepts behind Clear Signing and secure sessions, so the agent helps you write clean DMK integration code.
  </DocCard>
</DocCards>

## Works with

- The CLI runs anywhere a shell does: at the terminal directly, or under any agent that can run shell commands (Claude Code, Cursor, Claude Desktop, or your own). 
- The DMK skills work with any coding agent that loads Markdown skill files (Claude Code, Cursor, Cline, and similar).

## Get started

Install Ledger agent skills with:

```bash
npx skills add ledgerhq/agent-skills
```

Then go to [Ledger Wallet CLI](./ledger-cli) or [DMK skills](./ledger-dmk-skills) for the full setup. To protect the credentials and service access your agents rely on, see [Hardware security](./hardware-security/open-pgp).

## CLI use cases

Things you (or your agent) can do once the Ledger Wallet CLI is installed and your device is plugged in. Hardware confirmation is required for every signing step.

<DocCards>
  <DocCard title="Portfolio snapshot" accent="orange" label="Read-only">
    `"Show my ETH balance and last 10 transactions."` <br/> The agent calls balances and operations without touching the device. Useful for dashboards, briefings, and health checks.
  </DocCard>
  <DocCard title="Agent-assisted send" accent="orange" label="Signing">
    `"Send 100 USDT to 0xDEF… — confirm on my Ledger."` <br/> The agent plans the transaction, calls `send --dry-run` to preview fees, then triggers hardware signing after your approval.
  </DocCard>
  <DocCard title="Natural-language swap" accent="orange" label="Swap · v2">
    `"Swap 0.1 ETH to BTC at best rate."` <br/> The agent fetches a quote, surfaces rate and fees in plain English, then Clear Signs the swap on your device with one confirm.
  </DocCard>
</DocCards>

## DMK skills use cases

Things your coding agent can help you build once the DMK skills are installed in your skills directory.

<DocCards>
  <DocCard title="Add Ledger to a wallet app" accent="purple" label="Build">
    `"Add WebHID-based Ethereum signing to my Vite + React wallet."` <br/> The agent uses the implementation skill to wire transports, sessions, and clear-sign payloads, and surfaces user-rejection errors correctly.
  </DocCard>
  <DocCard title="Add HITL approval to an agent workflow" accent="purple" label="Build">
    `"Pause my trading bot and require Ledger confirmation before any send."` <br/> The agent uses the 5-step execution process to insert a hardware approval gate at sensitive steps in your own application.
  </DocCard>
</DocCards>

---

<Callout type="info" emoji="ℹ️">
  Both surfaces are in early development. Breaking changes may happen between releases. Feedback welcome on the [Ledger Discord server](https://developers.ledger.com/discord/).
</Callout>


## Important Legal notice

<div className="legal-notice">

The tools described on this page are technology features. They support cryptographic signing capabilities and developer resources. They are not financial services, investment advice, or execution services of any kind. Every transaction proposed or initiated through these tools requires affirmative physical confirmation by the user on their Ledger device before it is signed or executed. Ledger does not hold, manage, or have access to user assets at any time. Ledger exercises no control over, and bears no responsibility for, the logic, prompts, financial parameters, or economic outcomes of any AI agent nor for the accuracy, profitability, suitability, or intent of any AI agent.

These tools are in early development. Features, APIs, and behaviours may change. They are provided "as is" without warranty of any kind. Use of these tools does not establish any contractual, advisory, or fiduciary relationship between the user or developer and Ledger SAS or its affiliates. To the maximum extent permitted by law, Ledger SAS and its affiliates shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from use of these tools, including but not limited to loss of digital assets, unauthorised access, smart contract exploits, or transaction malfunction.

</div>





---
title: Ledger Wallet CLI
category: how-to
description: Install the Ledger Wallet CLI, optional agent skill, and use accounts, send, receive, swap, earn, and key ring encryption from the terminal with device confirmation.
agent_skills:
  - label: Wallet CLI Usage
    url: https://raw.githubusercontent.com/LedgerHQ/agent-skills/main/skills/wallet-cli/wallet-cli-usage/SKILL.md
    role: primary
    refs:
      - label: Business Logic
        url: https://raw.githubusercontent.com/LedgerHQ/agent-skills/main/skills/wallet-cli/wallet-cli-usage/references/business-logic.md
---

import { Callout } from 'nextra/components'
import { Tabs } from 'nextra/components'


# Ledger Wallet CLI

This guide shows you how to install the Ledger Wallet CLI and run common workflows from the terminal: account discovery, transfers, swaps, staking, and key ring encryption. You confirm every fund-touching command on the Ledger device before it runs.

<Callout type="info">
  This CLI manages **personal accounts**. Looking for something else? The [Ledger Enterprise CLI](https://help.enterprise.ledger.com/api-documentation-v2/guides/develop-with-ai) covers institutional, policy-enforced workflows. The [Ledger Enterprise Multisig CLI](https://help.multisig.ledger.com/guides/cli-guides) covers Safe multisig wallets.
</Callout>


## Verify your signer

Before running any workflow, you can confirm that your Ledger is genuine. `genuine-check` verifies the device's authenticity against Ledger's attestation service and exits with a non-zero code if it fails. Run it once after setup, or include it as a guard in automated workflows.

```bash
wallet-cli genuine-check
✔ Device is genuine
```

## Conventions

- Every command supports `--output json` for piping into other tools (`--output human` is the default).
- Signing commands follow the same pattern: the terminal announces what is about to happen, you confirm on the Ledger screen, the terminal reports the outcome.
- Read-only commands (balances, operations, `earn yields`, `earn positions`) never touch the device and are safe to run in CI or from an untrusted agent.

## Supported networks

The CLI supports **Bitcoin**, **Ethereum** (and EVM-compatible chains), and **Solana**.

| Network | Balances & ops | Send / receive | Swap | Token lookup | Earn |
|---------|:--------------:|:--------------:|:----:|:------------:|:----:|
| Bitcoin | ✓ | ✓ | ✓ | — | — |
| Ethereum / EVM | ✓ | ✓ | ✓ | ERC-20 | ✓ (ERC-4626 vaults) |
| Solana | ✓ | ✓ | ✓ | SPL | ✓ (native staking) |

## Prerequisites

- **Supported platforms:** macOS, Linux, Windows (WSL recommended)
- **Ledger device connected over USB**, with the relevant app installed (for example, the Ethereum app for ETH accounts)

## Install

### Install the CLI

 
<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tabs.Tab>
    ```bash
    pnpm add -g @ledgerhq/wallet-cli
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    npm i -g @ledgerhq/wallet-cli
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    yarn global add @ledgerhq/wallet-cli
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    bun add -g @ledgerhq/wallet-cli
    ```
  </Tabs.Tab>
</Tabs>

```bash
wallet-cli --version
wallet-cli v2.1.0

wallet-cli --help # list all available commands

Commands:
  account        Account management commands
  assets         Crypto-assets store queries (resolve tokens by address or id)
  balances       Fetch native and token balances for an account (no device required)
  earn           Earn-related commands (yields, positions, deposit, withdraw)
  genuine-check  Check whether the connected Ledger device is genuine
  operations     List operations for an account (no device required)
  receive        Get receive address for an account (optionally verify on device)
  ring           Ledger Key Ring (LKRP) encryption commands
  send           Sign and broadcast a transaction
  session        Session management commands
  skill          Agent skill commands (list, retrieve, install, doctor)
  swap           Swap-related commands

```

### Install the agent skill

The agent skill teaches Claude Code, Cursor, and similar tools to drive the CLI from natural language. Since wallet-cli 2.1.0 the skill ships embedded in the binary, so the CLI installs it for you:

```bash
# Install the embedded skill into your agent's skills directory
wallet-cli skill install --agent cursor   # also: claude, codex, or generic "agents"

# Detect drift between an installed skill and the one in your binary
wallet-cli skill doctor
```

If you have not installed the CLI yet, pull the skill from the repository instead:

```bash
npx skills add LedgerHQ/agent-skills -s wallet-cli-usage
```

## Manage accounts

Run `account discover` once per network to derive every account on the device. After that, balances and operations work without the device plugged in. Pass `bitcoin`, `ethereum`, or `solana` as the network argument.

```bash
# Discover accounts — device required once per network
wallet-cli account discover bitcoin
bitcoin:main account #0 (utxo) bc1q…4f2s
bitcoin:main account #1 (utxo) bc1q…9xj7

wallet-cli account discover ethereum
ethereum:main account #0 0x71C7…976F
ethereum:main account #1 0x9A44…47F3

wallet-cli account discover solana
solana:main account #0 7EcD…BkPm
solana:main account #1 3fVw…Qa9r


# Read balances — no device needed
wallet-cli balances <label>
✔ Balances fetched
  1.5 ETH
  100 USDT

# List operations — paginated
wallet-cli operations <label> --limit 20
```

`account discover` saves the account label to a local session so subsequent commands do not need the device. 
Use `session view` to inspect what is stored and `session reset` to clear it.

```bash
# Inspect the current session
wallet-cli session view
ethereum-1 account:1:address:ethereum:main:0x71C7…976F:m/44h/60h/0h/0/0
ethereum-2 account:1:address:ethereum:main:0xsDd7…3LJb:m/44h/60h/1h/0/0

# Clear all stored accounts
wallet-cli session reset
Removed 2 accounts from session.
```

## Send and receive

`receive` shows a fresh address and asks you to verify it on the device screen. `send` prompts you to review the transaction on-device before signing. Amounts must include a ticker; it drives token resolution. Use `--dry-run` to estimate fees without touching the device.

All three networks are supported. Some flags are network-specific:

| Flag | Network |
|------|---------|
| `--fee-per-byte` | Bitcoin only |
| `--rbf` | Bitcoin only |
| `--data` | Ethereum / EVM only (calldata) |
| `--memo` | Solana only |

Solana staking (delegate, undelegate, withdraw) goes through `earn deposit` and `earn withdraw`, not through `send`. See [Earn](#earn).

```bash
# Receive — verify address on-device
wallet-cli receive <label>
0x1a2B...9a0b
Compare the address above with what's shown on your Ledger...
[⧖] Review address on device. Approve or reject

# Once it's approved 
0x1a2B…9a0b
Compare the address above with what\'s shown on your Ledger...
✔ Address verified
0x1a2B…9a0b


# Send — native, token, dry-run
wallet-cli send <label> --to 0xDEF… --amount '0.1 ETH'
To:  0xDEF…
Amount: 0.1 ETH
Fees: 0.0004961 ETH
⧖  Review on device. Approve or reject.

# Once it's approved 
✔ Signed → broadcast → 0x8f4a2b…91d3e6
```

## Resolve tokens

`assets token` and `assets token-by-id` let agents and scripts look up the canonical Ledger token id from a contract address or from an id they already hold. The resolved id is what `swap quote --from` / `--to` expects, so you can build swap workflows without hard-coding tickers.

```bash
# Resolve by contract address
wallet-cli assets token ethereum 0xdac17f958d2ee523a2206206994597c13d831ec7
ethereum/erc20/usd_tether__erc20_

# Resolve by token id (validation / round-trip check)
wallet-cli assets token-by-id ethereum/erc20/usd_tether__erc20_
```

Both commands are read-only and require no device.

## Swap

Get a quote, execute the swap, then track its status. For most providers the Exchange app on your device clear-signs the transaction so you can verify the exact amounts and provider before approving. The DEX providers (`uniswap`, `oneinch`, `velora`, `okx`) instead execute in the partner's embedded coin app via the Device Intent Executor: these are EVM-only, and a quote that resolves to an RFQ order falls back to the Exchange-app pipeline.

```bash
wallet-cli swap quote --from ethereum --to bitcoin --account ethereum-1 --to-account bitcoin-native-1 --amount 0.1
from:     0.01 BTC ($950.00)
to:       0.2439 ETH ($942.27)
quote_id: q_abc123 (valid 30s)

wallet-cli swap execute --from ethereum --to bitcoin --account ethereum-1 --to-account bitcoin-native-1 --provider changelly --amount 0.1  
⧖  Review the swap on your Ledger. Confirm or reject.
✔ Swap initiated — swp_xyz789

wallet-cli swap status --swap-id <swapId> --provider changelly
Status: ● FINISHED  ·  Received 0.2439 ETH
```

### Choose a provider

`swap quote` takes no `--provider` flag. It queries the available providers and returns the quotes that came back, so the quote output is the source of truth for what you can use right now. Pass the provider id from the quote line you picked to `swap execute`.

`swap execute --provider` accepts `changelly`, `changelly_v2`, `cic`, `cic_v2`, `exodus`, `lifi`, `nearintents`, `okx`, `oneinch`, `swapsxyz`, `uniswap`, and `velora`. It also accepts two aliases: `changelly` resolves to `changelly_v2`, and `1inch` resolves to `oneinch`.

Not every provider quotes every pair, and coverage changes over time. Rates also differ between providers and change from one quote to the next, so compare the quotes for your pair rather than hard-coding a provider.

## Earn

Browse yield opportunities, check your active positions, then deposit into or withdraw from a vault. `earn yields` and `earn positions` are read-only and require no device. `earn deposit` and `earn withdraw` sign on the device. Ethereum ERC-4626 vaults and Solana native staking are supported. Use `--dry-run` on a deposit or withdrawal to validate it without signing.

```bash
# List yield opportunities for a network — no device needed
wallet-cli earn yields -n ethereum
  Lido         Liquid   3.21%   0.01 ETH    none
  Rocket Pool  Liquid   3.05%   0.01 ETH    none

# Check your active positions — no device needed
wallet-cli earn positions <label>
  Lido         1.5000 stETH   +0.0031 ETH    active

# Deposit or withdraw — device required
wallet-cli earn deposit <label> --amount '0.5 ETH'
⧖  Review the deposit on your Ledger. Approve or reject.
✔ Signed → broadcast → 0x8f4a2b…91d3e6

wallet-cli earn withdraw <label> --amount '0.5 stETH'
⧖  Review the withdrawal on your Ledger. Approve or reject.
✔ Signed → broadcast → 0x2c91da…4e7f10
```

Run `wallet-cli earn deposit --help` and `wallet-cli earn withdraw --help` for the full set of vault and validator selection flags.

## Key ring

The Ledger Key Ring (LKRP) encrypts and decrypts data under keys tied to your Ledger device. Run `ring init` once to provision the key ring via the device, and always protect it with a password. After that, `ring encrypt` and `ring decrypt` need network access to restore the trustchain, but no device.

```bash
# One-time provisioning — device required, password read from WALLET_PASS
wallet-cli ring init
✔ Key ring provisioned

# Encrypt a file under a named key (AES-256-GCM)
wallet-cli ring encrypt -i secrets.txt -o secrets.enc --key my-key

# Decrypt it back
wallet-cli ring decrypt -i secrets.enc -o secrets.txt --key my-key

# List the keys this machine has used
wallet-cli ring keys

# Tear down the ring — removes local credentials and the remote LKRP application
wallet-cli ring destroy
```

`ring encrypt` and `ring decrypt` also accept text via stdin/stdout instead of `-i`/`-o` files.

### Provide the ring password

The `ring` commands read the password from the `WALLET_PASS` environment variable whenever there is no interactive terminal, which is the case in CI and when an agent runs the command.

Never write the password literally into a command. A literal value leaks into your shell history, `ps` output, CI logs, and, when an agent runs the command, the agent transcript. Store the password once in your OS keychain, then inject it with command substitution so the secret never appears in the command text:

```bash
# macOS — store the password once
security add-generic-password -a default -s ledger-wallet-cli -w

# macOS — inject it at call time
WALLET_PASS=$(security find-generic-password -a default -s ledger-wallet-cli -w) wallet-cli ring init

# Linux — inject from the Secret Service keyring
WALLET_PASS=$(secret-tool lookup service ledger-wallet-cli account default) wallet-cli ring encrypt --key my-key -i secrets.txt -o secrets.enc
```

Apply this to throwaway and test passwords too, because you reuse the same command shape with a real secret later. Command substitution still leaves the password in the child process environment, where another process running as your user can read it, so prefer a keychain lookup over exporting the password into your shell.

<Callout type="warning" emoji="⚠️">
  When an agent drives the CLI, it must never choose, type, or otherwise handle the password value. Provision the password yourself and let the agent reference only the `$(…)` substitution. `ring init` also accepts `--unsecure-no-password`, which leaves the ring unprotected: do not use it for anything holding real data.
</Callout>

## Important Legal notice

<div className="legal-notice">

The Ledger Wallet CLI is a technology feature that supports AI agents and terminal-based workflows to prepare and present transactions for hardware confirmation on a Ledger device. It is not a financial service, brokerage, investment adviser, or custodian.

Transactions proposed or initiated through this feature require affirmative physical confirmation by the user on their Ledger device before they are signed or executed. Ledger does not hold, manage, or have access to user assets at any time. Ledger exercises no control over, and bears no responsibility for, the logic, prompts, financial parameters, or economic outcomes of any AI agent nor for the accuracy, profitability, suitability, or intent of any AI agent. The user is solely responsible for the logic, instructions, financial parameters, and outcomes of any transaction proposed or initiated by an AI agent operating through this CLI. Ledger does not select, recommend, or endorse specific swap providers, rates, validators, or staking positions. These are presented for user review and confirmation only.

Details regarding transactions that are displayed by the CLI are provided for informational purposes only and are sourced from third-party providers. They do not constitute investment advice or a recommendation to transact. Staking yields displayed by the earn commands are indicative only and not guaranteed. Ledger is not party to any swap or staking transaction. The contractual relationship is between the user and the relevant third-party provider.

Due to the non-deterministic nature of AI models, instructions generated by AI agents may contain errors, inaccuracies, or unintended parameters. Users must independently verify all transaction details on the Ledger device screen before confirming.

Use of this feature does not establish any contractual, advisory, or fiduciary relationship between the user and Ledger SAS or its affiliates. This tool is provided "as is," in early experimental development, without warranty of any kind. To the maximum extent permitted by law, Ledger SAS and its affiliates shall not be liable for any direct, indirect, incidental, special, punitive, or consequential damages arising from use of this feature, including but not limited to loss of digital assets, unauthorised access, smart contract exploits, or transaction malfunction.

</div>





---
title: Ledger DMK Skills
category: how-to
description: Install and use Markdown DMK skills so agents integrate the Device Management Kit with intent mapping, implementation steps, and concept references.
---

import { Callout } from 'nextra/components'
import { DocCard, DocCards } from '@/components/features/doc-card'

# Ledger DMK Skills

This guide shows you how to install and use the DMK agent skills so your agent can integrate the [Device Management Kit (DMK)](/docs/device-interaction/getting-started) into your application, with a Ledger device acting as the human-in-the-loop signer. Skills are Markdown instruction sets your agent loads on demand.

<Callout type="warning" emoji="⚠️">
  DMK skills are in early development. Breaking changes may happen between releases.
</Callout>

## Available skills

<DocCards>
  <DocCard title="DMK · Intent" href="https://github.com/LedgerHQ/agent-skills/tree/main/skills/dmk/dmk-intent-vocabulary" accent="purple" label="01 — Intent mapping">
    Maps natural language ("sign a tx", "find my Ledger", "is this device real?") to the right DMK API. Load when the request is ambiguous. Skill ID: `dmk-intent-vocabulary`.
  </DocCard>
  <DocCard title="DMK · Implementation" href="https://github.com/LedgerHQ/agent-skills/tree/main/skills/dmk/ledger-dmk-implementation" accent="purple" label="02 — Implementation">
    The main implementation skill. 5-step execution process (Init → Session → Device State → App Management → Operation) with HITL gates, error classification, and timeout bounds. Bundles SDK reference, code patterns, and platform patterns loaded on demand. Skill ID: `ledger-dmk-implementation`.
  </DocCard>
  <DocCard title="DMK · Concepts" href="https://github.com/LedgerHQ/agent-skills/tree/main/skills/dmk/dmk-business-logic" accent="purple" label="03 — Concepts">
    Clear Signing, Secure Channel, sessions, transports. Load for conceptual questions, not for implementation work. Skill ID: `dmk-business-logic`.
  </DocCard>
</DocCards>

## Prompting your agent

The implementation skill loads its reference files on demand based on what your prompt mentions. You will get sharper output if you name the **platform** (web, Node.js CLI, mobile), the **transport** (WebHID, Bluetooth, USB Speculos), the **chain** (Ethereum, Bitcoin, Solana, Cosmos), and the **operation** (derive address, sign transaction, install app).

**Minimal WebHID demo:**

> Build a Vite + React app that connects to a Ledger signer over WebHID, derives an Ethereum address, and verifies it on the device. Trigger discovery from a button click and surface user-rejection errors.

<Callout>
  WebHID only runs in Chromium-based browsers, on `localhost` or HTTPS, and requires a user gesture to start discovery. The skill follows these constraints, but your dev environment must respect them.
</Callout>

## Install

Use Skills to install the three skills related to the Ledger DMK:

```bash
# Use Skills to install the three skills related to the Ledger DMK
npx skills add ledgerhq/agent-skills -s ledger-dmk-implementation dmk-intent-vocabulary dmk-business-logic

# If Skills is not installed, you will be prompted an install message. Type y to proceed.
Need to install the following packages:
skills@1.5.21
Ok to proceed? (y) 
```



Licenses and repository-specific notes live on GitHub: [agent-skills](https://github.com/LedgerHQ/agent-skills).

## Next steps

Your agent can now integrate DMK with the right level of guidance for each phase of the build. For DMK behavior and APIs in this portal, see the [Device Management Kit how-to](/docs/device-interaction/integration/how_to/dmk) and [Device Interaction getting started](/docs/device-interaction/getting-started).

## Important Legal notice

<div className="legal-notice">

These DMK Skills are provided by Ledger SAS as developer resources to accelerate integration with the Ledger Device Management Kit. They are provided "as is," without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

Skills encode implementation patterns derived from official Ledger documentation and publicly available source code. They do not constitute a security audit, certification, or endorsement of code, smart contract, or application built using them.

Ledger does not guarantee that outputs generated by these Skills are secure, correct, or free from vulnerabilities. Due to the non-deterministic nature of AI models, you acknowledge outputs may contain errors, inaccuracies, or outdated information. The developer is solely responsible for the security, correctness, and compliance of their code, smart contracts and applications.

The DMK architecture these skills describe is designed to maintain the Ledger device as a final confirmation gate for user operations. Developers building on these skills are responsible for preserving the human-in-the-loop confirmation requirement in their implementations. Removing or circumventing on-device confirmation may expose users to risk.

Use of these skills does not establish any contractual, advisory, partnership, or fiduciary relationship between the developer and Ledger SAS or its affiliates. To the maximum extent permitted by law, Ledger SAS and its affiliates shall not be liable for any direct, indirect, incidental, special, punitive, or consequential damages arising from use of or reliance on these skills, including but not limited to loss of digital assets, unauthorised access, smart contract exploits, or transaction malfunction.

</div>