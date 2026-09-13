# Confidential Workflows in CRE
Source: https://docs.chain.link/cre/concepts/confidential-workflows
Last Updated: 2026-07-28


A **Confidential Workflow** is a CRE [workflow](/cre/key-terms#workflow) that designates part of its logic to run inside a secure [enclave](/cre/key-terms#enclave)—a running instance of a [Trusted Execution Environment (TEE)](/cre/key-terms#tee-trusted-execution-environment), a hardware-isolated environment designed to keep the computation and data it processes confidential from the machine's own operator during execution—instead of on Workflow DON nodes. Confidential Workflows serve as the confidential compute foundation to unlock Private Smart Contracts, where encrypted transactions are processed through confidential offchain computation and resulting state is committed onchain or other DA layers.

Confidential Workflows are fundamentally standard CRE workflows with an explicit confidential execution path added where you need it, composing freely with standard workflow logic in the same application. Secrets fetched inside the enclave, and any computation you mark as confidential, are intended to remain confidential from node operators during execution. You decide what stays inside the enclave and what crosses back out to the Workflow DON for consensus-verified execution, such as generating a report to submit onchain.

For hands-on steps, jump straight to [Making a Workflow Confidential](/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential).

> **CAUTION: Private beta**
>
> Confidential Workflows is in private beta and requires enrollment through your Chainlink account team—see [Requesting
> Confidential Workflows Access](/cre/account/confidential-workflows-access). Do not wait for early access. Simulate
> confidential workflows in minutes.

## Where this fits in CRE

If you're new to CRE workflows, start with [Getting Started](/cre/getting-started/overview) to build a standard workflow first—one where your handler's logic runs on Workflow DON nodes like any other capability call. Confidential Workflows extends that same model: once you're comfortable with handlers, triggers, and callbacks, this page and the [guide](/cre/guides/workflow/using-confidential-workflows) show you how to carve out a confidential execution path for the parts of a workflow that need it, without changing how the rest of your workflow is built, deployed, or operated.

## The problem it solves

By default, your workflow's code—and any secrets or sensitive inputs it processes—runs on Workflow DON nodes, where node operators can, in principle, inspect what it's computing. That's fine for most workflows. But some computation is sensitive on its own: applying risk thresholds, a rebalancing policy, or a proprietary scoring model to live inputs can expose that policy just as much as leaking a credential would.

Confidential Workflows closes that gap: that sensitive computation executes inside a secure enclave, designed so that what's actually being computed is intended to remain confidential from node operators during execution.

## How it works

Functionally, running a workflow confidentially means moving execution of the sensitive part into an enclave, and giving your code a runtime built for that environment:

1. **Declare a confidential handler:** Register the handler that should run inside a TEE, specifying which TEE types/regions your workflow accepts.
2. **Trigger fires:** The Workflow DON hands the triggered request to an enclave instead of executing the callback locally.
3. **Enclave execution:** Your callback runs inside the enclave, receiving a runtime built for confidential execution instead of the regular DON runtime.
4. **Dynamic secret fetch:** Secrets are requested and decrypted inside the enclave at the moment your code needs them.
5. **In-enclave capability calls:** Capabilities that support it can execute directly from inside the enclave; trust comes from enclave attestation rather than DON-level consensus.
6. **Crossing back to the DON:** For anything that needs Workflow DON consensus—like generating a signed report—you explicitly cross back out to a regular DON runtime. Once data passes through that runtime, it's handled like any non-confidential capability call.

Confidential workflows successfully complete execution only after DON consensus verifies attestations from the enclave, proving the integrity of the workflow logic that executed within it.

See the [step-by-step guide](/cre/guides/workflow/using-confidential-workflows) for the exact functions in Go and TypeScript.

## Confidentiality boundary

Confidential Workflows protect specific things by default. Everything else is left to your explicit workflow design.

| Protected by default                                                                    | Not automatically protected                                                                                              |
| :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| Secrets the [Vault DON](/cre/key-terms#vault-don) releases into the enclave             | Workflow triggers, chain reads, and chain writes—these always execute on Workflow DON nodes, never inside the enclave    |
| Sensitive inputs and intermediate values you don't explicitly share outside the enclave | Your workflow's source code, deployed binary, and orchestration metadata                                                 |
| Capability calls made from inside the enclave (see [How it works](#how-it-works))       | Capability requests and responses that aren't routed through the enclave, unless that capability adds its own protection |
| Enclave execution memory, for as long as your computation runs inside it                | Reports, transaction calldata, and any output you deliver outside the enclave boundary                                   |

You remain responsible for not leaking confidential information back out through logs, workflow outputs, external API requests, or blockchain transactions.

> **CAUTION: Workflow logic is not confidential**
>
> Your handler's source code and compiled binary are not confidential just because part of its logic runs inside an
> enclave. Confidential Workflows protect only the confidential data processed during execution inside the enclave,
> including Vault DON secrets (such as API keys), sensitive HTTP response payloads, and intermediate values that are not
> explicitly shared outside the enclave. Support for confidential logic or workflow is planned as a future enhancement,
> not part of the current beta.

> **CAUTION: Multiple confidential workflows may execute within the same enclave**
>
> Workflows are isolated from one another by Wasmtime. Dedicated per-workflow enclave isolation is planned as a future
> enhancement. Certain advanced vulnerabilities including side channel and speculative execution attacks, may leak
> information. Follow security best practices and keep dependencies current.

> **CAUTION: Don't log in production Confidential Workflows**
>
> Logging within enclave execution logic should be avoided in production workflows. For debugging purposes, logging may
> be used in simulation environments. Anything you log from inside a Confidential Workflow handler could leak data the
> enclave is meant to protect—remove or gate log statements before deploying.

## Choosing Confidential Workflows

Use a regular capability when nothing about the request, response, or data is sensitive. Use a Confidential Workflow when any part of it needs to remain confidential from node operators—whether that's the credentials or response data on a single outbound call, or the sensitive data from that call, such as thresholds, aggregation inputs, or multi-step reasoning outputs.

## Use cases

Confidential Workflows apply anywhere the computation behind a decision—not just a workflow's API calls—needs to remain confidential from node operators.

### Automated liquidation protection

A workflow monitors a leveraged position's collateral health and closes or adjusts it before liquidation. Running the risk thresholds and defensive strategy inside the enclave is designed to prevent them from being predicted and front-run.

> **TIP: Reference template available**
>
> See the [Automated Liquidation Protection template](/cre-templates/automated-liquidation-protection) (TypeScript).

### Automated portfolio rebalancing

A workflow rebalances a portfolio toward target allocations once drift crosses a threshold. Running the allocation policy and trade-sizing decisions inside the enclave is designed to prevent the rebalance from being anticipated and traded against.

> **TIP: Reference template available**
>
> See the [Automated Portfolio Rebalancing template](/cre-templates/automated-portfolio-rebalancing) (TypeScript).

### LLM smart contract audit firewall

A workflow evaluates a proposed transaction or contract against one or more LLMs for risk signals before allowing it to proceed. The evaluation criteria and third-party API credentials stay inside the enclave.

> **TIP: Reference template available**
>
> See the [AI Smart Contract Audit Firewall template](/cre-templates/ai-audit-firewall) (TypeScript, with optional
> onchain delivery via `EVMClient`).

### Proprietary or confidential data computation

A workflow computes over proprietary, licensed, or otherwise sensitive data—for example, a scoring model built on data you don't have rights to expose in the clear. Confidential Workflows are designed to keep both the data and the computation performed on it confidential from node operators.

### Automated payment orchestration

A workflow generates payment initiation instructions—for banks (fiat transfers), payment networks (fiat or crypto transfers), or private chains (tokenized deposits and other payment tokens). Running the routing logic and account details inside the enclave is designed to prevent them from being exposed to node operators.

### Automated risk management

A workflow continuously evaluates risk exposure and triggers protective actions. Running the thresholds and parameters that define when action is taken inside the enclave is designed to prevent them from being reverse-engineered or gamed.

### Automated trading

A workflow executes trades based on private strategy data. Running the strategy data inside the enclave—even though the resulting transactions are onchain—is designed to prevent it from being copied or traded against.

## When to use secrets with DON execution vs. enclave execution

Not every secret needs enclave-level protection. Use this as a rough guide, not an exhaustive list, when deciding whether a secret should be fetched with a regular [`runtime.GetSecret()`](/cre/guides/workflow/secrets) on the DON or inside a Confidential Workflow's enclave.

**Higher-value secrets—consider enclave execution:**

- Wallet private keys (non high value operational or automation keys)
- Certificate authority private keys
- API keys and credentials for exchanges (trading or withdrawal access), institutional custody, payment processors, banking or payment networks, LLM providers with spending limits, or proprietary data providers
- OAuth client secrets, JWT signing keys, KMS keys
- Payment data, health data, and other PII

**Lower-value secrets—regular DON execution is usually fine:**

- API keys for publicly available data (weather, blockchain explorers, public price/market/sports data, public RPC providers)
- Public wallet addresses
- Other credentials with similarly limited impact if disclosed

The common thread: a secret is a candidate for enclave execution if disclosure would expose more than the workflow needs, or data that will never be made public onchain.

## Requesting access

Confidential Workflows is invite-only during the private beta. See [Requesting Confidential Workflows Access](/cre/account/confidential-workflows-access) for how to get enrolled.

## Learn more

- **[Making a Workflow Confidential Guide](/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential)**: Step-by-step guide to registering a TEE handler.
- **[Confidential Workflows Client SDK Reference](/cre/reference/sdk/confidential-workflows-client)**: Full API reference.
- **[Key Terms](/cre/key-terms#confidential-workflow-or-confidential-execution)**: Definitions for TEE, enclave, and confidential execution.




# Confidential Workflows in CRE
Source: https://docs.chain.link/cre/concepts/confidential-workflows
Last Updated: 2026-07-28


A **Confidential Workflow** is a CRE [workflow](/cre/key-terms#workflow) that designates part of its logic to run inside a secure [enclave](/cre/key-terms#enclave)—a running instance of a [Trusted Execution Environment (TEE)](/cre/key-terms#tee-trusted-execution-environment), a hardware-isolated environment designed to keep the computation and data it processes confidential from the machine's own operator during execution—instead of on Workflow DON nodes. Confidential Workflows serve as the confidential compute foundation to unlock Private Smart Contracts, where encrypted transactions are processed through confidential offchain computation and resulting state is committed onchain or other DA layers.

Confidential Workflows are fundamentally standard CRE workflows with an explicit confidential execution path added where you need it, composing freely with standard workflow logic in the same application. Secrets fetched inside the enclave, and any computation you mark as confidential, are intended to remain confidential from node operators during execution. You decide what stays inside the enclave and what crosses back out to the Workflow DON for consensus-verified execution, such as generating a report to submit onchain.

For hands-on steps, jump straight to [Making a Workflow Confidential](/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential).

> **CAUTION: Private beta**
>
> Confidential Workflows is in private beta and requires enrollment through your Chainlink account team—see [Requesting
> Confidential Workflows Access](/cre/account/confidential-workflows-access). Do not wait for early access. Simulate
> confidential workflows in minutes.

## Where this fits in CRE

If you're new to CRE workflows, start with [Getting Started](/cre/getting-started/overview) to build a standard workflow first—one where your handler's logic runs on Workflow DON nodes like any other capability call. Confidential Workflows extends that same model: once you're comfortable with handlers, triggers, and callbacks, this page and the [guide](/cre/guides/workflow/using-confidential-workflows) show you how to carve out a confidential execution path for the parts of a workflow that need it, without changing how the rest of your workflow is built, deployed, or operated.

## The problem it solves

By default, your workflow's code—and any secrets or sensitive inputs it processes—runs on Workflow DON nodes, where node operators can, in principle, inspect what it's computing. That's fine for most workflows. But some computation is sensitive on its own: applying risk thresholds, a rebalancing policy, or a proprietary scoring model to live inputs can expose that policy just as much as leaking a credential would.

Confidential Workflows closes that gap: that sensitive computation executes inside a secure enclave, designed so that what's actually being computed is intended to remain confidential from node operators during execution.

## How it works

Functionally, running a workflow confidentially means moving execution of the sensitive part into an enclave, and giving your code a runtime built for that environment:

1. **Declare a confidential handler:** Register the handler that should run inside a TEE, specifying which TEE types/regions your workflow accepts.
2. **Trigger fires:** The Workflow DON hands the triggered request to an enclave instead of executing the callback locally.
3. **Enclave execution:** Your callback runs inside the enclave, receiving a runtime built for confidential execution instead of the regular DON runtime.
4. **Dynamic secret fetch:** Secrets are requested and decrypted inside the enclave at the moment your code needs them.
5. **In-enclave capability calls:** Capabilities that support it can execute directly from inside the enclave; trust comes from enclave attestation rather than DON-level consensus.
6. **Crossing back to the DON:** For anything that needs Workflow DON consensus—like generating a signed report—you explicitly cross back out to a regular DON runtime. Once data passes through that runtime, it's handled like any non-confidential capability call.

Confidential workflows successfully complete execution only after DON consensus verifies attestations from the enclave, proving the integrity of the workflow logic that executed within it.

See the [step-by-step guide](/cre/guides/workflow/using-confidential-workflows) for the exact functions in Go and TypeScript.

## Confidentiality boundary

Confidential Workflows protect specific things by default. Everything else is left to your explicit workflow design.

| Protected by default                                                                    | Not automatically protected                                                                                              |
| :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| Secrets the [Vault DON](/cre/key-terms#vault-don) releases into the enclave             | Workflow triggers, chain reads, and chain writes—these always execute on Workflow DON nodes, never inside the enclave    |
| Sensitive inputs and intermediate values you don't explicitly share outside the enclave | Your workflow's source code, deployed binary, and orchestration metadata                                                 |
| Capability calls made from inside the enclave (see [How it works](#how-it-works))       | Capability requests and responses that aren't routed through the enclave, unless that capability adds its own protection |
| Enclave execution memory, for as long as your computation runs inside it                | Reports, transaction calldata, and any output you deliver outside the enclave boundary                                   |

You remain responsible for not leaking confidential information back out through logs, workflow outputs, external API requests, or blockchain transactions.

> **CAUTION: Workflow logic is not confidential**
>
> Your handler's source code and compiled binary are not confidential just because part of its logic runs inside an
> enclave. Confidential Workflows protect only the confidential data processed during execution inside the enclave,
> including Vault DON secrets (such as API keys), sensitive HTTP response payloads, and intermediate values that are not
> explicitly shared outside the enclave. Support for confidential logic or workflow is planned as a future enhancement,
> not part of the current beta.

> **CAUTION: Multiple confidential workflows may execute within the same enclave**
>
> Workflows are isolated from one another by Wasmtime. Dedicated per-workflow enclave isolation is planned as a future
> enhancement. Certain advanced vulnerabilities including side channel and speculative execution attacks, may leak
> information. Follow security best practices and keep dependencies current.

> **CAUTION: Don't log in production Confidential Workflows**
>
> Logging within enclave execution logic should be avoided in production workflows. For debugging purposes, logging may
> be used in simulation environments. Anything you log from inside a Confidential Workflow handler could leak data the
> enclave is meant to protect—remove or gate log statements before deploying.

## Choosing Confidential Workflows

Use a regular capability when nothing about the request, response, or data is sensitive. Use a Confidential Workflow when any part of it needs to remain confidential from node operators—whether that's the credentials or response data on a single outbound call, or the sensitive data from that call, such as thresholds, aggregation inputs, or multi-step reasoning outputs.

## Use cases

Confidential Workflows apply anywhere the computation behind a decision—not just a workflow's API calls—needs to remain confidential from node operators.

### Automated liquidation protection

A workflow monitors a leveraged position's collateral health and closes or adjusts it before liquidation. Running the risk thresholds and defensive strategy inside the enclave is designed to prevent them from being predicted and front-run.

> **TIP: Reference template available**
>
> See the [Automated Liquidation Protection template](/cre-templates/automated-liquidation-protection) (TypeScript).

### Automated portfolio rebalancing

A workflow rebalances a portfolio toward target allocations once drift crosses a threshold. Running the allocation policy and trade-sizing decisions inside the enclave is designed to prevent the rebalance from being anticipated and traded against.

> **TIP: Reference template available**
>
> See the [Automated Portfolio Rebalancing template](/cre-templates/automated-portfolio-rebalancing) (TypeScript).

### LLM smart contract audit firewall

A workflow evaluates a proposed transaction or contract against one or more LLMs for risk signals before allowing it to proceed. The evaluation criteria and third-party API credentials stay inside the enclave.

> **TIP: Reference template available**
>
> See the [AI Smart Contract Audit Firewall template](/cre-templates/ai-audit-firewall) (TypeScript, with optional
> onchain delivery via `EVMClient`).

### Proprietary or confidential data computation

A workflow computes over proprietary, licensed, or otherwise sensitive data—for example, a scoring model built on data you don't have rights to expose in the clear. Confidential Workflows are designed to keep both the data and the computation performed on it confidential from node operators.

### Automated payment orchestration

A workflow generates payment initiation instructions—for banks (fiat transfers), payment networks (fiat or crypto transfers), or private chains (tokenized deposits and other payment tokens). Running the routing logic and account details inside the enclave is designed to prevent them from being exposed to node operators.

### Automated risk management

A workflow continuously evaluates risk exposure and triggers protective actions. Running the thresholds and parameters that define when action is taken inside the enclave is designed to prevent them from being reverse-engineered or gamed.

### Automated trading

A workflow executes trades based on private strategy data. Running the strategy data inside the enclave—even though the resulting transactions are onchain—is designed to prevent it from being copied or traded against.

## When to use secrets with DON execution vs. enclave execution

Not every secret needs enclave-level protection. Use this as a rough guide, not an exhaustive list, when deciding whether a secret should be fetched with a regular [`runtime.GetSecret()`](/cre/guides/workflow/secrets) on the DON or inside a Confidential Workflow's enclave.

**Higher-value secrets—consider enclave execution:**

- Wallet private keys (non high value operational or automation keys)
- Certificate authority private keys
- API keys and credentials for exchanges (trading or withdrawal access), institutional custody, payment processors, banking or payment networks, LLM providers with spending limits, or proprietary data providers
- OAuth client secrets, JWT signing keys, KMS keys
- Payment data, health data, and other PII

**Lower-value secrets—regular DON execution is usually fine:**

- API keys for publicly available data (weather, blockchain explorers, public price/market/sports data, public RPC providers)
- Public wallet addresses
- Other credentials with similarly limited impact if disclosed

The common thread: a secret is a candidate for enclave execution if disclosure would expose more than the workflow needs, or data that will never be made public onchain.

## Requesting access

Confidential Workflows is invite-only during the private beta. See [Requesting Confidential Workflows Access](/cre/account/confidential-workflows-access) for how to get enrolled.

## Learn more

- **[Making a Workflow Confidential Guide](/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential)**: Step-by-step guide to registering a TEE handler.
- **[Confidential Workflows Client SDK Reference](/cre/reference/sdk/confidential-workflows-client)**: Full API reference.
- **[Key Terms](/cre/key-terms#confidential-workflow-or-confidential-execution)**: Definitions for TEE, enclave, and confidential execution.


# Making a Workflow Confidential
Source: https://docs.chain.link/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential-ts
Last Updated: 2026-07-28


Some workflows need to keep sensitive inputs and the computation over them—not just a single outbound request—confidential from node operators: risk thresholds, proprietary scoring, multi-step reasoning over sensitive data. Confidential Workflows are designed to make this possible by running your handler's callback inside a secure [enclave](/cre/key-terms#enclave), a running instance of a [Trusted Execution Environment (TEE)](/cre/key-terms#tee-trusted-execution-environment) intended to keep that computation and data confidential from the machine's own operator while it runs.

Functionally, this means registering your handler with [`handlerInTee`](/cre/reference/sdk/confidential-workflows-client-ts#handlerintee) instead of [`handler`](/cre/reference/sdk/core-ts#handler). Your callback receives a [`TeeRuntime`](/cre/reference/sdk/confidential-workflows-client-ts#teeruntimec) instead of a `Runtime`: secrets are fetched dynamically from the [Vault DON](/cre/key-terms#vault-don) rather than declared upfront, and you explicitly call [`runtime.usingTheDons()`](/cre/reference/sdk/confidential-workflows-client-ts#runtimeusingthedons) to reach anything that needs Workflow DON consensus.

## Prerequisites

This guide assumes you have:

- Enrolled in the Confidential Workflows private beta with your Chainlink account team (see [Requesting Confidential Workflows Access](/cre/account/confidential-workflows-access)).
- A basic understanding of CRE. If you are new, complete the [Getting Started tutorial](/cre/getting-started/overview) first.
- Familiarity with [secrets management](/cre/guides/workflow/secrets) in CRE.

> **NOTE: Minimal example**
>
> This guide walks through the core mechanics with a minimal example. For complete, production-shaped workflows, see the
> [example workflows](/cre/guides/workflow/using-confidential-workflows#example-workflows).

## Step-by-step example

This example shows a cron-triggered workflow that fetches a secret and makes an HTTP request from inside a TEE, then crosses back to the DON to generate a report.

### Step 1: Register a TEE handler

Use [`handlerInTee`](/cre/reference/sdk/confidential-workflows-client-ts#handlerintee) instead of [`handler`](/cre/reference/sdk/core-ts#handler), and specify which TEEs your workflow accepts with a [`TeeConstraint`](/cre/reference/sdk/confidential-workflows-client-ts#teeconstraint):

```ts
import { CronCapability, handlerInTee, type TeeRuntime } from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  url: z.string(),
})

type Config = z.infer<typeof configSchema>

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handlerInTee(cron.trigger({ schedule: config.schedule }), onCronTrigger, {})]
}
```

`{}` accepts any registered TEE in any region. To restrict to a specific TEE type and region, use `[{ tee: "nitro", regions: ["us-west-2"] }]`. See the [SDK reference](/cre/reference/sdk/confidential-workflows-client-ts#teeconstraint) for all options.

### Step 2: Fetch a secret inside the enclave

Your callback receives a [`TeeRuntime`](/cre/reference/sdk/confidential-workflows-client-ts#teeruntimec). Call [`runtime.getSecrets()`](/cre/reference/sdk/confidential-workflows-client-ts#runtimegetsecrets) to fetch the secrets you need in a single batch call:

```ts
const onCronTrigger = (runtime: TeeRuntime<Config>) => {
  const secrets = runtime.getSecrets([{ id: "API_KEY" }, { id: "DB_URL" }]).result()

  const apiKey = secrets["API_KEY"].value
  const dbUrl = secrets["DB_URL"].value

  // ...
}
```

To fetch a single secret, use [`runtime.getSecret()`](/cre/reference/sdk/confidential-workflows-client-ts#runtimegetsecret):

```ts
const secret = runtime.getSecret({ id: "MY_API_KEY" }).result()
```

> **NOTE: No upfront secret declaration**
>
> Unlike Confidential HTTP's
> [`vaultDonSecrets`](/cre/reference/sdk/confidential-http-client-ts#confidentialhttprequest--confidentialhttprequestjson),
> there's nothing to declare ahead of time. The secret is requested and decrypted inside the enclave at the moment
> [`getSecret()`](/cre/reference/sdk/confidential-workflows-client-ts#runtimegetsecret) runs.

### Step 3: Make a capability call from inside the enclave

Capabilities that support Confidential Workflows expose a `TeeRuntime`-accepting overload of their regular method.
[`HTTPClient.sendRequest()`](/cre/reference/sdk/confidential-workflows-client-ts#making-capability-calls-inside-the-enclave)
accepts your [`TeeRuntime`](/cre/reference/sdk/confidential-workflows-client-ts#teeruntimec) directly:

```ts
const response = new HTTPClient()
  .sendRequest(runtime, {
    url: runtime.config.url,
    method: "GET",
    multiHeaders: { Authorization: { values: [`Bearer ${apiKey}`] } },
  })
  .result()

if (!ok(response)) {
  throw new Error(`confidential request failed with status: ${response.statusCode}`)
}
```

The request executes from inside the enclave. Trust comes from enclave attestation rather than Workflow DON consensus.

> **NOTE: Use the TeeRuntime overload, not ConfidentialHTTPClient**
>
> `ConfidentialHTTPClient` has no `TeeRuntime` overload here—see the [SDK
> reference](/cre/reference/sdk/confidential-workflows-client-ts#not-every-capability-has-a-teeruntime-overload) if
> you're tempted to reach for it instead.

### Step 4: Cross back to the DON for anything that needs consensus

Once you have a result, call [`runtime.usingTheDons()`](/cre/reference/sdk/confidential-workflows-client-ts#runtimeusingthedons)
to get a regular `Runtime` for operations that require Workflow DON execution—for example, generating a signed report:

```ts
const donRuntime = runtime.usingTheDons()

donRuntime
  .report({
    encodedPayload: Buffer.from(text(response)).toString("base64"),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result()

runtime.log("Confidential workflow complete")
return text(response)
```

See [Generating Reports: Single Values](/cre/guides/workflow/using-evm-client/onchain-write/generating-reports-single-values) for the full delivery flow (encoding, `writeReport`, etc.). For a complete example that encodes a payload with the `hexToBase64` helper and delivers it onchain with `evmClient.writeReport(donRuntime, ...)`, see the [AI Smart Contract Audit Firewall template](/cre-templates/ai-audit-firewall).

> **CAUTION: Data passed to usingTheDons() is no longer confidential**
>
> Once you pass a value into a capability call on the runtime returned by
> [`usingTheDons()`](/cre/reference/sdk/confidential-workflows-client-ts#runtimeusingthedons), that call executes on
> Workflow DON nodes like any non-confidential capability. Only cross over the data that doesn't need to remain
> confidential.

### Step 5: Simulate

Run the simulation:

```bash
cre workflow simulate
```

## Best practices

> **CAUTION: Don't log in production confidential workflows**
>
> Logging within enclave execution logic should be avoided in production workflows. For debugging purposes, logging may
> be used in simulation environments. Anything you log from inside a Confidential Workflow handler could leak data the
> enclave is meant to protect—remove or gate log statements before deploying.

## Complete example

```ts
import { CronCapability, handlerInTee, HTTPClient, ok, Runner, text, type TeeRuntime } from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  url: z.string(),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: TeeRuntime<Config>) => {
  // 1. Fetch secrets dynamically, inside the enclave.
  const secrets = runtime.getSecrets([{ id: "API_KEY" }, { id: "DB_URL" }]).result()
  const apiKey = secrets["API_KEY"].value

  // 2. Make an HTTP request from inside the enclave.
  const response = new HTTPClient()
    .sendRequest(runtime, {
      url: runtime.config.url,
      method: "GET",
      multiHeaders: { Authorization: { values: [`Bearer ${apiKey}`] } },
    })
    .result()

  if (!ok(response)) {
    throw new Error(`confidential request failed with status: ${response.statusCode}`)
  }

  // 3. Cross back to the DON for anything that needs consensus.
  const donRuntime = runtime.usingTheDons()
  donRuntime
    .report({
      encodedPayload: Buffer.from(text(response)).toString("base64"),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  runtime.log("Confidential workflow complete")
  return text(response)
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handlerInTee(cron.trigger({ schedule: config.schedule }), onCronTrigger, {})]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

await main()
```

## API reference

For the full list of types and methods available on [`TeeRuntime`](/cre/reference/sdk/confidential-workflows-client-ts#teeruntimec) and [`handlerInTee`](/cre/reference/sdk/confidential-workflows-client-ts#handlerintee), see the [Confidential Workflows Client SDK Reference](/cre/reference/sdk/confidential-workflows-client-ts).



# SDK Reference: Confidential Workflows Client
Source: https://docs.chain.link/cre/reference/sdk/confidential-workflows-client-ts
Last Updated: 2026-07-28


`handlerInTee` registers a handler whose callback runs inside a secure [enclave](/cre/key-terms#enclave)—a running instance of a [TEE](/cre/key-terms#tee-trusted-execution-environment)—receiving a `TeeRuntime` instead of a `Runtime`. Unlike the regular `handler`, secrets are fetched dynamically at runtime from the [Vault DON](/cre/key-terms#vault-don) with `runtime.getSecret()` and any operation that needs Workflow DON consensus must explicitly cross over with `runtime.usingTheDons()`.

- For use cases and a conceptual overview, see [Confidential Workflows in CRE](/cre/concepts/confidential-workflows)
- **Guide:** [Making a Workflow Confidential](/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential-ts)

> **CAUTION: Beta capability**
>
> This API requires enrollment in the Confidential Workflows private beta through your Chainlink account team—see
> [Requesting Confidential Workflows Access](/cre/account/confidential-workflows-access).

## Quick reference

| Method                                           | Description                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [`handlerInTee`](#handlerintee)                  | Registers a handler whose callback runs inside a TEE.                                |
| [`runtime.getSecret`](#runtimegetsecret)         | Fetches a single secret dynamically, inside the enclave.                             |
| [`runtime.getSecrets`](#runtimegetsecrets)       | Fetches multiple secrets in a single batch call, inside the enclave.                 |
| [`runtime.usingTheDons`](#runtimeusingthedons)   | Returns a regular `Runtime` for operations that need DON consensus.                  |
| [`runtime.reportFromDon`](#runtimereportfromdon) | Generates a report from the DON directly, without a full `usingTheDons()` crossover. |

## Core types

### `TeeRuntime<C>`

The runtime passed to a callback registered with `handlerInTee`. Requests made through it execute inside the enclave; requests made through the runtime returned by `usingTheDons()` are routed outside the enclave to the Workflow DON.

```ts
interface TeeRuntime<C> extends BaseRuntime<C>, SecretsProvider {
  reportFromDon(input: ReportRequest | ReportRequestJson): { result: () => Report }
  usingTheDons(): Runtime<C>
}
```

`BaseRuntime<C>` provides `config`, `now()`, `log()`, and `emitMetric()`, same as on a regular `Runtime<C>`. `SecretsProvider` provides `getSecret()` and `getSecrets()`.

### `TeeConstraint`

Describes which TEEs a handler will accept. Pass one of the following as the third argument to `handlerInTee`:

| Shape                                | Description                                                                |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `{}`                                 | Accepts any registered TEE, in any region.                                 |
| `{ regions: [...] }`                 | Accepts any TEE, restricted to the listed regions.                         |
| `[{ tee: 'nitro', regions: [...] }]` | Accepts specific TEE types, each optionally restricted to its own regions. |

```ts
// Accept any TEE, any region
{
}

// Accept any TEE, restricted to a region
{
  regions: ["us-west-2"]
}

// Accept only Nitro, restricted to a region
;[{ tee: "nitro", regions: ["us-west-2"] }]
```

Nitro (`tee: 'nitro'`) is currently the only registered TEE type, and `'us-west-2'` is currently the only supported region—check your installed SDK version if you expect otherwise, since this is an actively evolving API.

## Registering a handler

### `handlerInTee`

Registers a handler whose callback runs inside a TEE.

**Signature:**

```ts
function handlerInTee<TRawTriggerOutput, TTriggerOutput, TConfig, TResult>(
  trigger: Trigger<TRawTriggerOutput, TTriggerOutput>,
  fn: (runtime: TeeRuntime<TConfig>, triggerOutput: TTriggerOutput) => TResult,
  tees: TeeConstraint,
  hooks?: Hooks<TConfig, TTriggerOutput>
): HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult, TeeRuntime<TConfig>>
```

**Parameters:**

- `trigger`: Any CRE trigger, same as for `handler`.
- `fn`: Your handler function. It receives a `TeeRuntime` instead of a `Runtime`.
- `tees`: A [`TeeConstraint`](#teeconstraint) describing which TEEs are acceptable.
- `hooks`: Optional. Same `preHook` mechanism available on a regular `handler`.

**Example:**

```ts
const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handlerInTee(cron.trigger({ schedule: config.schedule }), onCronTrigger, {})]
}
```

**Guide:** [Making a Workflow Confidential](/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential-ts)

## Fetching secrets

### `runtime.getSecret`

Fetches a single secret, decrypted only inside the enclave.

**Signature:**

```ts
getSecret(request: SecretRequest | SecretRequestJson): { result: () => Secret }
```

**Example:**

```ts
const secret = runtime.getSecret({ id: "MY_API_KEY" }).result()
// secret.value holds the decrypted value.
```

There's no upfront declaration like Confidential HTTP's `vaultDonSecrets`—the secret is requested and decrypted inside the enclave at the moment `getSecret()` runs.

### `runtime.getSecrets`

Fetches multiple secrets in a single batch call, decrypted only inside the enclave.

**Signature:**

```ts
getSecrets(requests: Array<SecretRequest | SecretRequestJson>): {
  result: () => Record<string, Secret>
}
```

The result is a record keyed by each secret's `id`. If any secret in the batch fails, `.result()` throws a `SecretsBatchError` that includes the failing secret ids and their error messages. Requesting the same `id` more than once in a single call also throws a `SecretsBatchError`.

**Example:**

```ts
const secrets = runtime.getSecrets([{ id: "API_KEY" }, { id: "DB_URL" }]).result()

const apiKey = secrets["API_KEY"].value
const dbUrl = secrets["DB_URL"].value
```

## Crossing back to the DON

### `runtime.usingTheDons`

Returns a regular `Runtime<C>` for operations that need Workflow DON consensus.

**Signature:**

```ts
usingTheDons(): Runtime<C>
```

**Example:**

```ts
const donRuntime = runtime.usingTheDons()
donRuntime
  .report({
    // encodedPayload is the base64-encoded form of your payload bytes, e.g.
    // Buffer.from(payloadBytes).toString("base64")
    encodedPayload: encodedValue,
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result()
```

> **CAUTION: Data passed to usingTheDons() is no longer confidential**
>
> Once you pass a value into a capability call on the runtime returned by `usingTheDons()`, that call executes on
> Workflow DON nodes like any non-confidential capability.

### `runtime.reportFromDon`

A shortcut for generating a report from the DON without a full `usingTheDons()` crossover.

**Signature:**

```ts
reportFromDon(input: ReportRequest | ReportRequestJson): { result: () => Report }
```

Data requested through this method is routed outside the TEE, same as with `usingTheDons()`.

## Making capability calls inside the enclave

Capabilities that support Confidential Workflows expose a `TeeRuntime`-accepting overload of their regular method. For the HTTP capability, `HTTPClient.sendRequest()` accepts either a `Runtime`/`NodeRuntime` or a `TeeRuntime` directly:

```ts
const response = new HTTPClient()
  .sendRequest(runtime, {
    url: config.url,
    method: "GET",
    multiHeaders: { Authorization: { values: [`Bearer ${secret.value}`] } },
  })
  .result()
```

**Guide:** [Making a Workflow Confidential](/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential-ts)

### Not every capability has a TeeRuntime overload

`ConfidentialHTTPClient` is a notable exception: its `sendRequest()` only accepts a `Runtime`—there's no overload for `TeeRuntime`. Passing a `TeeRuntime` directly won't type-check.

```ts
// Does NOT type-check: ConfidentialHTTPClient.sendRequest has no overload accepting a TeeRuntime.
const confHttpClient = new ConfidentialHTTPClient()
confHttpClient.sendRequest(runtime, { request: { url, method: "POST" } }) // runtime is TeeRuntime
```

> **CAUTION: Use the TeeRuntime overload for outbound HTTP calls**
>
> For outbound HTTP calls made from inside a Confidential Workflow handler, use `HTTPClient.sendRequest(runtime, req)`
> directly—it runs natively inside your enclave and needs no separate client. Capabilities without a `TeeRuntime`
> overload, like `ConfidentialHTTPClient`, aren't built to be called from inside a Confidential Workflow handler.





Hello Confidential Workflows
Quickstart confidential workflow that registers a TEE handler, securely fetches a secret inside the enclave, executes a capability call from within the enclave, and returns to the DON for any operations requiring decentralized consensus.

Get the template
TS
Go
cre init --template=hello-confidential-workflows-ts

View on GitHub
caution
Private beta

Confidential Workflows is in private beta and requires enrollment through your Chainlink account team - see Requesting Confidential Workflows Access.

This template shows the smallest useful shape of a confidential CRE workflow: register a handler that runs in a TEE, pull a secret inside the enclave, make a capability call from inside the enclave, then hand only the non-sensitive result back to the Workflow DON for consensus-backed operations.

Quick navigation:

TypeScript Implementation
Go Implementation
What This Template Does
By default, a CRE workflow callback runs on Workflow DON nodes, where node operators can inspect what it is computing. That is acceptable for many workflows, but not for when sensitive or proprietary data is required for workflows.

A Confidential Workflow executes the logic requiring confidential inputs in a hardware-isolated enclave. This template demonstrates the minimal end-to-end shape in four steps:

Step	What it demonstrates	API
1	Register a handler that runs inside a TEE	cre.handlerInTee(trigger, fn, tees)
2	Fetch a secret inside the enclave	runtime.getSecret({ id }) / runtime.GetSecret()
3	Make a capability call from inside the enclave	HTTPClient.sendRequest(runtime, req)
4	Cross back to the DON for anything needing consensus	runtime.usingTheDons()
Architecture
┌──────────────┐
│  CronTrigger │  fires on schedule (runs on the Workflow DON)
└──────┬───────┘
       │  DON hands the triggered request to an enclave
       v
╔══════════════════════════════════════════════════════════════════════╗
║ ENCLAVE                                                              ║
║                                                                      ║
║ Step 2: runtime.getSecret({ id: 'API_TOKEN' })                       ║
║           ▲                                                          ║
║           └── released by Vault DON, decrypted in-enclave            ║
║                                                                      ║
║ Step 3: HTTPClient.sendRequest(runtime, { ... })                     ║
║           Authorization: Bearer <secret>                             ║
║           ▲ trust from enclave attestation, not consensus            ║
║                                                                      ║
║ Logic with confidential data: score(response) vs. scoreThreshold     ║
║           -> verdict = APPROVE | REJECT                              ║
╚═══════════════════════════╤══════════════════════════════════════════╝
                           │  Step 4: runtime.usingTheDons()
                           │  ONLY the verdict + score cross out
                           v
┌──────────────────────────────────────────────────────────────────────┐
│ WORKFLOW DON - donRuntime.report({ ... })                            │
│ BFT consensus verifies the enclave attestation, then signs           │
└──────────────────────────────────────────────────────────────────────┘

How It Works
my-workflow/workflow.ts and my-workflow/workflow.go follow the same confidential pattern:

Register the cron handler with cre.handlerInTee, constrained to [{ tee: 'nitro', regions: ['us-west-2'] }]
Fetch API_TOKEN inside the enclave - the Vault DON releases it only into an attested enclave
Call the configured URL from inside the enclave, sending the secret in the Authorization header
Score the response against scoreThreshold - this represents the private policy you want to keep hidden
Cross back with usingTheDons() and report only the verdict and score - never the secret or raw response
note
Do not use ConfidentialHTTPClient here

ConfidentialHTTPClient has no TeeRuntime overload and is not meant to be called from a TEE handler. Inside handlerInTee, use the regular HTTPClient and pass it the TeeRuntime. Confidential HTTP is a separate feature - reach for it when you only need a single confidential outbound request, without a full confidential handler.

TypeScript Implementation
Getting Started with TypeScript
1
Install dependencies
cd my-workflow && bun install && cd ..

2
Configure secrets
cp .env.example .env

Set SECRET_API_TOKEN in .env. secrets.yaml maps the workflow-facing secret ID API_TOKEN to that environment variable:

secretsNames:
  API_TOKEN:
    - SECRET_API_TOKEN

With the default echo endpoint, any non-empty value works.

3
Run tests
cd my-workflow && bun test

4
Simulate
cre workflow simulate my-workflow --target staging-settings --non-interactive --trigger-index 0

Expected output:

[SIMULATION] Running trigger trigger=cron-trigger@1.0.0
╭────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Trigger requested TEE Execution your trigger will run in one of the following Tees:                │
│     - AWS Nitro in us-west-2                                                                       │
│ The simulator is not a real TEE, and is meant to debug.                                            │
│ Do not use it for sensitive information.                                                           │
│ During real execution, user logs for this trigger will not be visible, and will not leave the TEE. │
│ They are presented in the simulator for debugging only.                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────╯

[USER LOG] Enclave computation complete. verdict=REJECT

✓ Workflow Simulation Result:
"REJECT (score: 371, secret reached API: true)"

Three things to notice:

The simulator confirms the TEE constraint it resolved (AWS Nitro in us-west-2) and warns that it is not a real enclave. In real execution those logs never leave the TEE.
secret reached API: true means the Vault DON secret was fetched inside the enclave and arrived in the outbound request's Authorization header.
The verdict flips between APPROVE and REJECT from run to run. That is expected: the score is derived from the live response body, and the echo endpoint includes a per-request trace ID.
Go Implementation
Getting Started with Go
1
Install dependencies
cd my-workflow && go mod tidy && cd ..

2
Configure secrets
cp .env.example .env

Set SECRET_API_TOKEN in .env. secrets.yaml maps the workflow-facing secret ID API_TOKEN to that environment variable:

secretsNames:
  API_TOKEN:
    - SECRET_API_TOKEN

With the default echo endpoint, any non-empty value works.

3
Run tests
cd my-workflow && go test ./...

4
Simulate
cre workflow simulate my-workflow --target staging-settings --non-interactive --trigger-index 0

Expected output:

[SIMULATION] Running trigger trigger=cron-trigger@1.0.0
╭────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Trigger requested TEE Execution your trigger will run in one of the following Tees:                │
│     - AWS Nitro in us-west-2                                                                       │
│ The simulator is not a real TEE, and is meant to debug.                                            │
│ Do not use it for sensitive information.                                                           │
│ During real execution, user logs for this trigger will not be visible, and will not leave the TEE. │
│ They are presented in the simulator for debugging only.                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────╯

[USER LOG] Enclave computation complete. verdict=REJECT

✓ Workflow Simulation Result:
"REJECT (score: 371, secret reached API: true)"

The Go and TypeScript versions share the same confidential workflow shape. The main differences are the language tooling and the SDK surface: Go uses runtime.GetSecret() and the Go HTTPClient implementation, while TypeScript uses runtime.getSecret() and the TypeScript SDK.

Configuration
my-workflow/config.staging.json:

Field	Description
schedule	Cron expression (6 fields, seconds first)
url	Endpoint called from inside the enclave
secretId	Secret ID fetched with runtime.getSecret() / runtime.GetSecret(); must match secrets.yaml
scoreThreshold	Threshold the confidential scoring compares against
TEE Constraints
The third argument to handlerInTee declares which enclaves the handler accepts:

{
} // any registered TEE, any region
{
  regions: ["us-west-2"]
} // any TEE, restricted to a region
;[{ tee: "nitro", regions: ["us-west-2"] }] // specific TEE types and regions

AWS Nitro in us-west-2 is currently the only registered TEE type and region.

Confidentiality Boundary
Understanding what is and is not protected matters more here than in a regular workflow.

Protected by default	Not automatically protected
Secrets the Vault DON releases into the enclave	Triggers, chain reads, and chain writes - these always run on Workflow DON nodes
Sensitive inputs and intermediate values you do not share outside the enclave	Your workflow's source code and deployed binary
Capability calls made from inside the enclave	Capability calls not routed through the enclave
Enclave execution memory, while your computation runs	Reports, calldata, and any output you deliver outside the enclave
Consequences worth internalizing:

Your handler’s source code and compiled binary are not confidential just because part of its logic runs inside an enclave. Confidential Workflows protect only the confidential data processed during execution inside the enclave, including Vault DON secrets (such as API keys), HTTP response, and intermediate values that are not explicitly shared outside the enclave. Support for confidential logic or workflow is planned as a future enhancement, not part of the current beta.
usingTheDons() is a one-way door. Anything you pass into a capability call on that runtime executes on Workflow DON nodes like any non-confidential call. Cross over only what does not need to stay hidden.
Do not log from inside the enclave in production. Logs leave the confidentiality boundary. This template logs only the verdict, and the comment marks it for removal before deploying.
Keep enclave logic deterministic. The enclave result is attested and verified by DON consensus.
Multiple confidential workflows may execute within the same enclave. Workflows are isolated from one another by the wasmtime. Dedicated per workflow enclave isolation is planned as a future enhancement.
Which Secrets Belong in an Enclave?
Not every secret needs enclave-level protection.

Higher value - consider enclave execution: wallet and CA private keys; exchange, custody, payment-processor, banking, or LLM-provider credentials; OAuth client secrets, JWT signing keys, KMS keys; payment data, health data, other PII.

Lower value - regular DON execution is usually fine: API keys for publicly available data (weather, explorers, public price feeds, public RPCs); public wallet addresses.

The common thread: a secret belongs in the enclave if disclosure would expose more than the workflow needs.

Customization
Put your real logic in the enclave - replace scoreResponse in workflow.ts or workflow.go with the policy, threshold, or model you need to keep private
Deliver the report onchain - pass the report from Step 4 to evmClient.writeReport(donRuntime, report); the RPCs in project.yaml are already set up for Sepolia. See the Keeper Bot or Event Reactor templates for the full write path
Change the trigger - handlerInTee accepts any CRE trigger, same as handler; swap cron for a log trigger to react to onchain events confidentially
Fetch more secrets - call runtime.getSecret() / runtime.GetSecret() once per secret
Security
Never commit .env files or secrets - .gitignore covers *.env
Remove or gate every runtime.log() inside the TEE handler before deploying
Audit what crosses usingTheDons(); that data is no longer confidential
Further Reading
Confidential Workflows in CRE - concepts and use cases
Making a Workflow Confidential - step-by-step guide
Confidential Workflows Client SDK Reference - full API
Confidential HTTP - for a single outbound request, without a full confidential handler
confidential-compute-examples - production-shaped reference workflows

