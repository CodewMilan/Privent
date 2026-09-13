> ## Documentation Index
> Fetch the complete documentation index at: https://developers.circle.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Nanopayments

> Gas-free USDC nanopayments down to $0.000001, powered by Circle Gateway batched settlement

Circle Gateway enables gas-free USDC nanopayments by batching thousands of
payments into a single onchain transaction. Instead of settling each payment
individually, buyers sign offchain authorizations and Gateway settles net
positions in bulk, eliminating per-transaction gas costs and making sub-cent
payments economically viable. Nanopayments power agentic commerce by giving
developers and AI agents a financial rail purpose-built for high-frequency
agentic payments at scale.

<Note>
  Nanopayments and x402 batch settlement require EOA signatures and do not support
  ERC-1271. For standard Gateway transfers with smart contracts or smart contract
  wallets, see
  [ERC-1271 programmable authorization](/gateway/references/erc-1271).
</Note>

## Key features

<CardGroup cols={3}>
  <Card title="Gas-free transfers" icon="gas-pump">
    Buyers sign payment authorizations offchain at zero gas cost. Gateway
    settles in bulk, so neither party pays per-transaction fees.
  </Card>

  <Card title="Sub-cent minimums" icon="coins">
    Send as little as \$0.000001 USDC per payment. Batched settlement keeps fees
    from exceeding the payment itself.
  </Card>

  <Card title="Crosschain liquidity" icon="arrow-right-arrow-left">
    Sellers receive payments in their Gateway balance and can withdraw to any
    supported blockchain.
  </Card>
</CardGroup>

## What you can build

<AccordionGroup>
  <Accordion title="Agentic payments" icon="robot">
    Enable AI agents to pay autonomously for compute, data, memory, and services.
    Agents transact at high frequency and extreme granularity, executing thousands
    of sub-cent payments per minute without gas friction. For the agent-builder
    workflow, see [Agent nanopayments](/agent-stack/agent-nanopayments).
  </Accordion>

  <Accordion title="Usage-based billing" icon="chart-line">
    Charge per API call, per second of compute, or per dataset access. With
    transaction costs near zero, fine-grained billing models become practical for
    the first time.
  </Accordion>

  <Accordion title="Machine-to-machine marketplaces" icon="network-wired">
    Build decentralized marketplaces where services, models, and data is priced and
    traded in real time at sub-cent granularity.
  </Accordion>

  <Accordion title="Streaming value" icon="wave-sine">
    Implement pay-per-second content, micro-rewards, and continuous value flows
    where traditional payment rails are too expensive to operate.
  </Accordion>
</AccordionGroup>

## How it works

Nanopayments enables the [x402 protocol](/gateway/nanopayments/concepts/x402),
an open standard built on the HTTP `402 Payment Required` status code, by using
Circle Gateway's
[batched settlement](/gateway/nanopayments/concepts/batched-settlement)
infrastructure. Instead of settling each x402 payment individually onchain,
Gateway aggregates signed payment authorizations and settles net positions in
bulk. This is what makes sub-cent x402 payments economically viable.

The end-to-end flow is:

1. A buyer deposits USDC into a Gateway Wallet contract (one-time onchain
   transaction).
2. A buyer requests a paid resource from a seller's API.
3. The seller responds with `402 Payment Required` and payment details.
4. The buyer signs an EIP-3009 payment authorization (offchain, zero gas).
5. The buyer retries the request with the signed authorization attached.
6. The seller verifies the signature and serves the resource immediately.
7. Gateway collects authorizations and settles them in batches onchain,
   crediting the seller's Gateway balance.

## Get started

<CardGroup cols={2}>
  <Card title="Quickstart: Buy side" icon="cart-shopping" href="/gateway/nanopayments/quickstarts/buyer">
    Deposit USDC, pay for an x402-protected resource without gas fees, and check
    your balance
  </Card>

  <Card title="Quickstart: Sell side" icon="store" href="/gateway/nanopayments/quickstarts/seller">
    Add payment middleware to your Express API and start accepting gasless USDC
    payments
  </Card>

  <Card title="What is x402?" icon="circle-info" href="/gateway/nanopayments/concepts/x402">
    Learn about the open payment protocol that powers Nanopayments
  </Card>

  <Card title="How batched settlement works" icon="layer-group" href="/gateway/nanopayments/concepts/batched-settlement">
    Understand how Gateway aggregates payments and settles them onchain
  </Card>

  <Card title="API reference" icon="code" href="/api-reference/gateway/all/settle-x402payment">
    Explore the API endpoints for Nanopayments
  </Card>
</CardGroup>






> ## Documentation Index
> Fetch the complete documentation index at: https://developers.circle.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart: Pay for resources with nanopayments

> Deposit USDC into Gateway and make gasless payments to x402-protected APIs

In this quickstart, you will deposit USDC into a Gateway Wallet, pay for an
x402-protected resource without gas fees, and check your balance. By the end,
you'll have a working client that can make gasless payments to any
x402-compatible API that supports Circle Gateway.

<Tabs>
  <Tab title="Circle Wallets">
    Use `@circle-fin/developer-controlled-wallets` to fund an Arc Testnet EOA and
    `@circle-fin/x402-batching` to pay for an x402-protected resource. Smart
    contract account (SCA) wallets are not supported for nanopayments because
    Gateway verifies the EIP-3009 authorization with `ecrecover`. For more
    information, see [Account types](/wallets/account-types).

    ## Prerequisites

    Before you begin, ensure that you've:

    * Installed [Node.js v22.6+](https://nodejs.org/).
    * Created a [Circle Console](https://console.circle.com/) account.
    * Created an API key in the [Circle Console](https://console.circle.com/).
    * [Generated and registered an Entity Secret](/wallets/dev-controlled/register-entity-secret).
    * [Created an EOA developer-controlled wallet](/wallets/dev-controlled/create-your-first-wallet)
      on Arc Testnet.

    Complete the linked quickstarts before continuing. This path starts once your
    credentials and Arc Testnet wallet address are available. The wallet address is
    public configuration, so you will add it directly to `pay.ts`.

    ## Step 1. Set up your project

    ### 1.1. Create the project and install dependencies

    ```shell theme={null}
    mkdir nanopayments-circle-wallets
    cd nanopayments-circle-wallets
    npm init -y
    npm pkg set type=module
    npm pkg set scripts.pay="node --env-file=.env pay.ts"
    npm install @circle-fin/developer-controlled-wallets @circle-fin/x402-batching
    npm install --save-dev typescript @types/node
    ```

    ### 1.2. Configure TypeScript (optional)

    <Tip>
      This step is optional. It helps prevent missing types in your IDE or editor.
    </Tip>

    Create a `tsconfig.json` file:

    ```shell theme={null}
    npx tsc --init
    ```

    Then, update the `tsconfig.json` file:

    ```shell theme={null}
    cat <<'EOF' > tsconfig.json
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "types": ["node"]
      }
    }
    EOF
    ```

    ### 1.3. Set environment variables

    Open `.env` in your editor and add:

    ```text .env theme={null}
    CIRCLE_API_KEY=YOUR_API_KEY
    CIRCLE_ENTITY_SECRET=YOUR_ENTITY_SECRET
    ```

    * `CIRCLE_API_KEY` is your Circle API key.
    * `CIRCLE_ENTITY_SECRET` is your Circle entity secret.

    <Tip>
      Open `.env` in your editor rather than writing values with shell commands, and
      add `.env` to your `.gitignore`. This prevents credentials from leaking into
      your shell history or version control.
    </Tip>

    ## Step 2. Initialize the Circle Wallets client

    Create `pay.ts` and replace the wallet address placeholder with the address from
    the developer-controlled wallet quickstart. Copy this block into `pay.ts` first.

    ```ts pay.ts expandable theme={null}
    import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
    import {
      BatchEvmScheme,
      CHAIN_CONFIGS,
    } from "@circle-fin/x402-batching/client";

    function stringifyTypedData(value: unknown): string {
      return JSON.stringify(value, (_, currentValue) =>
        typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
      );
    }

    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    const walletAddress = "0xYOUR_ARC_TESTNET_WALLET_ADDRESS" as `0x${string}`;

    if (!apiKey || !entitySecret) {
      throw new Error(
        "CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required in .env.",
      );
    }

    if (walletAddress === "0xYOUR_ARC_TESTNET_WALLET_ADDRESS") {
      throw new Error(
        "Replace walletAddress with your Arc Testnet wallet address.",
      );
    }

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    const chain = CHAIN_CONFIGS.arcTestnet;
    const depositAmount = "1";
    // 1 USDC = 1_000_000 base units (6 decimals)
    const depositAmountBaseUnits = "1000000";
    const gatewayApi = "https://gateway-api-testnet.circle.com";
    const protectedUrl = "http://localhost:3000/premium-data";

    const batchScheme = new BatchEvmScheme({
      address: walletAddress,
      signTypedData: async (params) => {
        const typedData = {
          domain: {
            ...params.domain,
            chainId: params.domain.chainId.toString(),
          },
          primaryType: params.primaryType,
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            ...params.types,
          },
          message: params.message,
        };

        const response = await circleClient.signTypedData({
          walletAddress,
          blockchain: "ARC-TESTNET",
          data: stringifyTypedData(typedData),
        });

        const signature = response.data?.signature;
        if (!signature) {
          throw new Error("Circle Wallets returned no signature.");
        }
        return (
          signature.startsWith("0x") ? signature : `0x${signature}`
        ) as `0x${string}`;
      },
    });
    ```

    `BatchEvmScheme` builds the EIP-3009 payment authorization. The callback
    normalizes its viem-style typed data for Circle Wallets by adding the explicit
    `EIP712Domain` type, serializing `chainId`, and converting the response to a
    `0x`-prefixed signature. The developer-controlled wallet signs the authorization
    without exposing a private key to this script.

    ## Step 3. Fund the wallet

    Use the [Circle Faucet](https://faucet.circle.com/) to send testnet USDC to the
    Arc Testnet wallet address from the wallet quickstart. Arc Testnet uses
    [USDC as its native gas token](https://docs.arc.io/arc/concepts/stablecoin-native-model#usdc-as-the-native-gas-token),
    so the faucet funds both the USDC deposit and the transaction fees.

    ## Step 4. Deposit USDC into Gateway

    <Tip>
      **Prefer a shorter deposit flow?** Use
      [Unified Balance Kit](https://docs.arc.io/app-kit/unified-balance) with the
      [Circle Wallets adapter](https://docs.arc.io/app-kit/tutorials/adapter-setups#circle-wallets).
      See
      [Deposit and spend a Unified Balance (Circle Wallets)](https://docs.arc.io/app-kit/quickstarts/unified-balance-deposit-and-spend)
      for Arc Testnet.
    </Tip>

    Before making a nanopayment, the wallet needs USDC in its Gateway balance. The
    following function:

    1. Checks the current Gateway balance.
    2. Approves the Gateway Wallet contract to spend USDC.
    3. Deposits USDC into Gateway.
    4. Waits until the deposited balance is available.

    Add these functions to `pay.ts`. They are standalone declarations, so copy them
    as-is below the initialization code.

    ```ts pay.ts theme={null}
    async function ensureGatewayBalance(): Promise<void> {
      let gatewayBalance = await getGatewayBalance();

      if (gatewayBalance >= Number(depositAmount)) {
        console.log(`Gateway balance: ${gatewayBalance} USDC`);
        return;
      }

      console.log(`Approving ${depositAmount} USDC for Gateway...`);
      const approval = await circleClient.createContractExecutionTransaction({
        walletAddress,
        blockchain: "ARC-TESTNET",
        contractAddress: chain.usdc,
        abiFunctionSignature: "approve(address,uint256)",
        abiParameters: [chain.gatewayWallet, depositAmountBaseUnits],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const approvalId = approval.data?.id;
      if (!approvalId) {
        throw new Error("USDC approval was not created.");
      }
      await waitForCircleTransaction(approvalId);

      console.log(`Depositing ${depositAmount} USDC into Gateway...`);
      const deposit = await circleClient.createContractExecutionTransaction({
        walletAddress,
        blockchain: "ARC-TESTNET",
        contractAddress: chain.gatewayWallet,
        abiFunctionSignature: "deposit(address,uint256)",
        abiParameters: [chain.usdc, depositAmountBaseUnits],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const depositId = deposit.data?.id;
      if (!depositId) {
        throw new Error("Gateway deposit was not created.");
      }
      await waitForCircleTransaction(depositId);

      console.log("Waiting for the Gateway balance to become available...");
      do {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        gatewayBalance = await getGatewayBalance();
      } while (gatewayBalance < Number(depositAmount));

      console.log(`Gateway balance: ${gatewayBalance} USDC`);
    }

    async function getGatewayBalance(): Promise<number> {
      const response = await fetch(`${gatewayApi}/v1/balances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "USDC",
          sources: [{ domain: 26, depositor: walletAddress }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Gateway balance request failed: ${response.status} ${await response.text()}`,
        );
      }

      const result = (await response.json()) as {
        balances: Array<{ domain: number; balance: string }>;
      };

      return Number(
        result.balances.find(({ domain }) => domain === 26)?.balance ?? "0",
      );
    }

    async function waitForCircleTransaction(transactionId: string): Promise<void> {
      const terminalStates = new Set([
        "COMPLETE",
        "CONFIRMED",
        "FAILED",
        "DENIED",
        "CANCELLED",
      ]);

      while (true) {
        const response = await circleClient.getTransaction({ id: transactionId });
        const state = response.data?.transaction?.state;

        if (state && terminalStates.has(state)) {
          if (state !== "COMPLETE" && state !== "CONFIRMED") {
            throw new Error(`Circle Wallet transaction ended in state: ${state}`);
          }
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    ```

    ## Step 5. Pay for a resource

    The first request to an x402-protected endpoint returns `402 Payment Required`
    and a `PAYMENT-REQUIRED` header. Sellers often advertise Gateway options for
    many blockchains. Select the Arc Testnet `GatewayWalletBatched` option so the
    EIP-712 `chainId` matches the Circle Wallets `ARC-TESTNET` signer, then create
    the authorization and retry with a `PAYMENT-SIGNATURE` that includes the chosen
    option and the `resource` metadata from the `402` response.

    Add `payForResource` to `pay.ts`:

    ```ts pay.ts theme={null}
    async function payForResource(url: string): Promise<unknown> {
      const unpaidResponse = await fetch(url);
      if (unpaidResponse.status !== 402) {
        throw new Error(
          `Expected 402 Payment Required, received ${unpaidResponse.status}.`,
        );
      }

      const paymentRequiredHeader = unpaidResponse.headers.get("PAYMENT-REQUIRED");
      if (!paymentRequiredHeader) {
        throw new Error("The endpoint did not return a PAYMENT-REQUIRED header.");
      }

      const paymentRequired = JSON.parse(
        Buffer.from(paymentRequiredHeader, "base64").toString("utf8"),
      ) as {
        x402Version: number;
        accepts: Array<{
          scheme: string;
          network: string;
          asset: string;
          amount: string;
          payTo: string;
          maxTimeoutSeconds: number;
          extra?: Record<string, unknown>;
        }>;
        resource?: unknown;
      };

      const arcNetwork = `eip155:${chain.chain.id}`;
      const gatewayOption = paymentRequired.accepts.find(
        (option) =>
          option.extra?.name === "GatewayWalletBatched" &&
          option.network === arcNetwork,
      );

      if (!gatewayOption) {
        throw new Error(
          `The endpoint does not support Gateway nanopayments on ${arcNetwork}.`,
        );
      }

      if (!paymentRequired.resource) {
        throw new Error("The endpoint did not return resource metadata.");
      }

      const paymentPayload = await batchScheme.createPaymentPayload(
        paymentRequired.x402Version,
        gatewayOption,
      );
      const paidResponse = await fetch(url, {
        headers: {
          "PAYMENT-SIGNATURE": Buffer.from(
            JSON.stringify({
              ...paymentPayload,
              accepted: gatewayOption,
              resource: paymentRequired.resource,
            }),
          ).toString("base64"),
        },
      });

      if (!paidResponse.ok) {
        throw new Error(
          `Payment failed: ${paidResponse.status} ${await paidResponse.text()}`,
        );
      }

      return paidResponse.json();
    }
    ```

    ## Step 6. Run the script

    At the end of `pay.ts`, add a small entry point that calls the functions in
    order:

    ```ts pay.ts theme={null}
    async function main(): Promise<void> {
      await ensureGatewayBalance();

      const data = await payForResource(protectedUrl);
      console.log("Paid response:");
      console.dir(data, { depth: null });
    }

    main().catch((error) => {
      console.error("Error:");
      console.dir(error, { depth: null });
      process.exit(1);
    });
    ```

    <Tip>
      Start the protected endpoint from the [seller
      quickstart](/gateway/nanopayments/quickstarts/seller) before running this
      script. It should be available at `http://localhost:3000/premium-data`.
    </Tip>

    Run the script:

    ```shell theme={null}
    npm run pay
    ```

    <Note>
      The seller returns the resource as soon as Gateway accepts the payment.
      Onchain settlement happens later when Gateway includes the [payment in a
      batch](/gateway/nanopayments/concepts/batched-settlement) (often several
      minutes). You do not need to wait for that to complete a successful pay. To
      inspect status later, query [Search x402
      Transfers](/api-reference/gateway/all/search-x402transfers) with the EIP-3009
      authorization nonce.
    </Note>
  </Tab>

  <Tab title="Self-managed">
    ## Prerequisites

    Before you begin, ensure that you've:

    * Installed [Node.js v22.6+](https://nodejs.org/).
    * Obtained an
      [EOA (externally owned account)](/wallets/account-types#externally-owned-accounts-eoa)
      wallet private key for signing transactions and payment authorizations.
    * Obtained testnet USDC from the [Circle Faucet](https://faucet.circle.com).
    * Funded your wallet with testnet ETH (or native gas token) for the one-time
      deposit transaction.

    <Warning>
      Nanopayments require an EOA wallet. Smart contract account (SCA) wallets are not
      supported for nanopayments because the batched settlement path verifies EIP-3009
      payment authorizations offchain using `ecrecover`, which is incompatible with
      ERC-1271 contract signatures. This limitation is specific to nanopayments;
      standard Gateway transfers support
      [ERC-1271 signatures](/gateway/references/erc-1271).
    </Warning>

    ## Step 1. Set up your project

    ### 1.1. Create the project and install dependencies

    ```shell theme={null}
    mkdir nanopayments-buyer
    cd nanopayments-buyer
    npm init -y
    npm pkg set type=module
    npm pkg set scripts.pay="node --env-file=.env pay.ts"
    npm install @circle-fin/x402-batching viem typescript
    npm install --save-dev @types/node
    ```

    ### 1.2. Configure TypeScript (optional)

    <Tip>
      This step is optional. It helps prevent missing types in your IDE or editor.
    </Tip>

    Create a `tsconfig.json` file:

    ```shell theme={null}
    npx tsc --init
    ```

    Then, update the `tsconfig.json` file:

    ```shell theme={null}
    cat <<'EOF' > tsconfig.json
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "types": ["node"]
      }
    }
    EOF
    ```

    ### 1.3. Set environment variables

    Open `.env` in your editor and add:

    ```text theme={null}
    PRIVATE_KEY=YOUR_PRIVATE_KEY
    ```

    * `PRIVATE_KEY` is the private key for the EOA you use to deposit USDC and sign
      nanopayment authorizations.

    <Tip>
      Open `.env` in your editor rather than writing values with shell commands, and
      add `.env` to your `.gitignore`. This prevents credentials from leaking into
      your shell history or version control.
    </Tip>

    The `npm run pay` command loads variables from `.env` using Node.js native
    env-file support.

    <Warning>
      This example uses one or more private keys for local testing. In production,
      use a secure key management solution and never expose or share private keys.
    </Warning>

    ## Step 2. Initialize the client

    Create a new file `pay.ts` and initialize the `GatewayClient` with your chain
    and private key:

    ```ts pay.ts theme={null}
    import { GatewayClient } from "@circle-fin/x402-batching/client";

    const client = new GatewayClient({
      chain: "arcTestnet",
      privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    });
    ```

    The `chain` parameter determines which blockchain the client connects to for
    deposits and withdrawals. See the
    [SDK reference](/gateway/nanopayments/references/sdk) for all supported chain
    names.

    ## Step 3. Deposit USDC into Gateway

    Before you can make gasless payments, deposit USDC from your wallet into the
    Gateway Wallet contract. This is a one-time onchain transaction:

    ```ts pay.ts theme={null}
    const balances = await client.getBalances();
    console.log(`Gateway balance: ${balances.gateway.formattedAvailable} USDC`);

    // 1 USDC = 1_000_000 base units (6 decimals)
    if (balances.gateway.available < 1_000_000n) {
      console.log("Depositing 1 USDC...");
      const deposit = await client.deposit("1");
      console.log(`Deposit tx: ${deposit.depositTxHash}`);
    }
    ```

    `getBalances()` calls the
    [Get Token Balances](/api-reference/gateway/all/get-token-balances) API
    endpoint. The deposit itself is an onchain transaction and does not use the
    Gateway API.

    After the deposit confirms, your Gateway balance can be used for gasless
    payments to any supported seller. See the discussion at
    [Fast deposits](/gateway/references/supported-blockchains#fast-deposits) about
    increasing deposit speeds.

    ## Step 4. Pay for a resource

    Add the payment logic to `pay.ts`. Call `client.pay()` with the URL of an
    x402-protected resource. The client handles the full payment flow automatically:

    1. Sends the initial request to the URL.
    2. Receives the `402 Payment Required` response with payment details.
    3. Signs an EIP-3009 authorization offchain (zero gas).
    4. Retries the request with the `PAYMENT-SIGNATURE` header.

    ```ts pay.ts theme={null}
    const url = "http://localhost:3000/premium-data";

    const { data, status } = await client.pay(url);

    console.log(`Status: ${status}`);
    console.log("Response:", data);
    ```

    Under the hood, `pay()` negotiates the `402` flow and submits the payment
    through the [Settle x402 Payment](/api-reference/gateway/all/settle-x402payment)
    API endpoint.

    <Tip>
      Don't have a seller URL to test with? Set up a local test API in two minutes
      using the [seller quickstart](/gateway/nanopayments/quickstarts/seller).
    </Tip>

    ## Step 5. Check your balance

    Add balance checking after the payment using the
    [Get Token Balances](/api-reference/gateway/all/get-token-balances) API
    endpoint:

    ```ts pay.ts theme={null}
    const updated = await client.getBalances();
    console.log(`Wallet USDC: ${updated.wallet.formatted}`);
    console.log(`Gateway available: ${updated.gateway.formattedAvailable}`);
    ```

    ## Step 6. Run the script

    Run the complete script:

    ```shell theme={null}
    npm run pay
    ```

    You should see the deposit transaction (if needed), the response from the paid
    resource, and your updated balance.

    ## Step 7. Withdraw funds (optional)

    You can withdraw USDC from Gateway back to your wallet at any time. Same-chain
    withdrawals are instant:

    ```ts pay.ts theme={null}
    const result = await client.withdraw("5");
    console.log(`Withdrew ${result.formattedAmount} USDC`);
    console.log(`Tx: ${result.mintTxHash}`);
    ```

    To withdraw to a different blockchain:

    ```ts pay.ts theme={null}
    const crossChain = await client.withdraw("5", { chain: "baseSepolia" });
    console.log(`Withdrew to ${crossChain.destinationChain}`);
    ```

    <Note>
      Crosschain withdrawals require native gas tokens on the destination blockchain
      to cover the minting transaction.
    </Note>

    ## Check support before paying

    Before attempting a payment, you can verify that the target URL supports Gateway
    batching. The `supports()` method requests the target URL, checks for a `402`
    response, and inspects the `PAYMENT-REQUIRED` header for a compatible Gateway
    batching option:

    ```ts theme={null}
    const support = await client.supports(url);

    if (!support.supported) {
      console.error("This URL does not support Gateway payments");
    } else {
      const { data } = await client.pay(url);
    }
    ```

    This is useful when building clients that interact with APIs where Gateway
    support is not guaranteed.
  </Tab>
</Tabs>






> ## Documentation Index
> Fetch the complete documentation index at: https://developers.circle.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart: Accept payments with nanopayments

> Add gasless USDC payment support to your Express API using Circle Gateway

In this quickstart, you will add Circle Gateway payment middleware to an Express
API so that it accepts gasless USDC payments via the x402 protocol. By the end,
your API will return `402 Payment Required` for unpaid requests and serve
resources when a valid payment signature is provided.

## Prerequisites

Before you begin, ensure you have:

* Installed [Node.js v22.6+](https://nodejs.org/)
* An EVM wallet address where you want to receive USDC payments

## Step 1: Set up your project

### 1.1. Create the project and install dependencies

```shell theme={null}
# Set up your directory and initialize a Node.js project
mkdir nanopayments-seller
cd nanopayments-seller

npm init -y

# Set up module type and start command
npm pkg set type=module
npm pkg set scripts.start="node server.ts"

# Install runtime dependencies
npm install @circle-fin/x402-batching @x402/core @x402/evm viem express typescript

# Install dev dependencies
npm install --save-dev @types/node @types/express
```

### 1.2. Configure TypeScript (optional)

<Tip>
  This step is optional. It helps prevent missing types in your IDE or editor.
</Tip>

Create a `tsconfig.json` file:

```shell theme={null}
npx tsc --init
```

Then, update the `tsconfig.json` file:

```shell theme={null}
cat <<'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["node"]
  }
}
EOF
```

## Step 2: Create the server

Create a new file `server.ts` with an Express app and the Gateway middleware:

```ts server.ts theme={null}
import express from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { formatUnits } from "viem";

// Extended Express Request type to include payment information
type PaidRequest = express.Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

const app = express();

const gateway = createGatewayMiddleware({
  sellerAddress: "0xYOUR_WALLET_ADDRESS",
  facilitatorUrl: "https://gateway-api-testnet.circle.com",
});
```

Replace `0xYOUR_WALLET_ADDRESS` with a valid EVM address where you want to
receive payments. This quickstart uses Arc Testnet, so it points to the testnet
Gateway API. The middleware still accepts payments from
[all supported networks](/gateway/nanopayments/supported-networks).

## Step 3: Protect a route

Use `gateway.require()` to protect any route with a price. When a request
arrives without a valid payment, the middleware returns `402 Payment Required`
with the payment details. When a valid payment signature is attached, the
middleware settles it with Gateway using the
[Settle x402 Payment](/api-reference/gateway/all/settle-x402payment) API
endpoint and calls `next()`:

```ts server.ts theme={null}
app.get("/premium-data", gateway.require("$0.01"), (req: PaidRequest, res) => {
  const { payer, amount, network } = req.payment!;
  const formattedAmount = formatUnits(BigInt(amount), 6);
  console.log(`Paid ${formattedAmount} USDC by ${payer} on ${network}`);

  res.json({
    secret: "The treasure is hidden under the doormat.",
    paid_by: payer,
  });
});

app.listen(3000, () => {
  console.log("Server listening at http://localhost:3000");
});
```

## Step 4: Test the server

### 4.1. Start the server

```shell theme={null}
npm start
```

### 4.2. Send an unpaid request

In a separate terminal, use `curl` to verify the server returns a `402`
response:

```shell theme={null}
curl -i http://localhost:3000/premium-data
```

You should see a `402 Payment Required` response with a `PAYMENT-REQUIRED`
header. The header contains the payment options.

### 4.3. Pay with a buyer client

Use the [buyer quickstart](/gateway/nanopayments/quickstarts/buyer) client to
make a gasless payment to your server:

```ts theme={null}
import { GatewayClient } from "@circle-fin/x402-batching/client";

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

const { data, status } = await client.pay("http://localhost:3000/premium-data");
console.log(`Status: ${status}`);
console.log("Data:", data);
```

If the payment succeeds, you'll see the JSON response from your protected
endpoint.

## Advanced: Use `BatchFacilitatorClient` directly

If you are not using Express, or need custom logic like dynamic pricing, use the
`BatchFacilitatorClient` directly. The `settle()` method calls the
[Settle x402 Payment](/api-reference/gateway/all/settle-x402payment) API
endpoint:

```ts server.ts expandable theme={null}
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";

const facilitator = new BatchFacilitatorClient({
  url: "https://gateway-api-testnet.circle.com",
});

const requirements = {
  scheme: "exact",
  network: "eip155:5042002", // CAIP-2 identifier for Arc Testnet (chain ID 5042002)
  asset: "0x...", // USDC contract address on Arc Testnet — see supported chains reference
  amount: "10000", // 0.01 USDC
  maxTimeoutSeconds: 604900,
  payTo: "0xYOUR_ADDRESS", // seller address that receives the payment
  extra: {
    name: "GatewayWalletBatched",
    version: "1",
    verifyingContract: "0x...", // Gateway Wallet contract on Arc Testnet — see supported chains reference
  },
};

async function handleRequest(paymentSignature?: string) {
  if (!paymentSignature) {
    const paymentRequired = {
      x402Version: 2,
      resource: {
        url: "/premium-data",
        description: "Paid resource",
        mimeType: "application/json",
      },
      accepts: [requirements],
    };

    return {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": Buffer.from(
          JSON.stringify(paymentRequired),
        ).toString("base64"),
      },
      body: {},
    };
  }

  const payload = JSON.parse(
    Buffer.from(paymentSignature, "base64").toString("utf8"),
  );

  const settlement = await facilitator.settle(payload, requirements);

  if (!settlement.success) {
    return {
      status: 402,
      body: { error: "Settlement failed" },
    };
  }

  return {
    status: 200,
    body: { data: "Your paid content" },
  };
}
```

<Note>
  Gateway's `settle()` endpoint is optimized for low latency and guarantees
  settlement. Use `settle()` directly rather than calling `verify()` followed by
  `settle()` in production flows.
</Note>

## Limit accepted networks (optional)

By default, the middleware accepts payments from any Gateway-supported
blockchain, discovered through the
[Get Supported x402 Payment Kinds](/api-reference/gateway/all/get-supported-x402payment-kinds)
API endpoint. This maximizes your reach since any buyer with a Gateway balance
on one of those accepted networks can pay you.

If you need to restrict payments to specific networks:

```ts theme={null}
const gateway = createGatewayMiddleware({
  sellerAddress: "0x...",
  networks: ["eip155:5042002"], // Only accept Arc Testnet
});
```

<Note>
  Payment signatures must have at least 7 days plus a small buffer of validity.
  The `validBefore` timestamp in the buyer's EIP-3009 authorization must be at
  least 7 days in the future, or Gateway will reject it.
</Note>




> ## Documentation Index
> Fetch the complete documentation index at: https://developers.circle.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart: Accept payments with nanopayments

> Add gasless USDC payment support to your Express API using Circle Gateway

In this quickstart, you will add Circle Gateway payment middleware to an Express
API so that it accepts gasless USDC payments via the x402 protocol. By the end,
your API will return `402 Payment Required` for unpaid requests and serve
resources when a valid payment signature is provided.

## Prerequisites

Before you begin, ensure you have:

* Installed [Node.js v22.6+](https://nodejs.org/)
* An EVM wallet address where you want to receive USDC payments

## Step 1: Set up your project

### 1.1. Create the project and install dependencies

```shell theme={null}
# Set up your directory and initialize a Node.js project
mkdir nanopayments-seller
cd nanopayments-seller

npm init -y

# Set up module type and start command
npm pkg set type=module
npm pkg set scripts.start="node server.ts"

# Install runtime dependencies
npm install @circle-fin/x402-batching @x402/core @x402/evm viem express typescript

# Install dev dependencies
npm install --save-dev @types/node @types/express
```

### 1.2. Configure TypeScript (optional)

<Tip>
  This step is optional. It helps prevent missing types in your IDE or editor.
</Tip>

Create a `tsconfig.json` file:

```shell theme={null}
npx tsc --init
```

Then, update the `tsconfig.json` file:

```shell theme={null}
cat <<'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["node"]
  }
}
EOF
```

## Step 2: Create the server

Create a new file `server.ts` with an Express app and the Gateway middleware:

```ts server.ts theme={null}
import express from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { formatUnits } from "viem";

// Extended Express Request type to include payment information
type PaidRequest = express.Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

const app = express();

const gateway = createGatewayMiddleware({
  sellerAddress: "0xYOUR_WALLET_ADDRESS",
  facilitatorUrl: "https://gateway-api-testnet.circle.com",
});
```

Replace `0xYOUR_WALLET_ADDRESS` with a valid EVM address where you want to
receive payments. This quickstart uses Arc Testnet, so it points to the testnet
Gateway API. The middleware still accepts payments from
[all supported networks](/gateway/nanopayments/supported-networks).

## Step 3: Protect a route

Use `gateway.require()` to protect any route with a price. When a request
arrives without a valid payment, the middleware returns `402 Payment Required`
with the payment details. When a valid payment signature is attached, the
middleware settles it with Gateway using the
[Settle x402 Payment](/api-reference/gateway/all/settle-x402payment) API
endpoint and calls `next()`:

```ts server.ts theme={null}
app.get("/premium-data", gateway.require("$0.01"), (req: PaidRequest, res) => {
  const { payer, amount, network } = req.payment!;
  const formattedAmount = formatUnits(BigInt(amount), 6);
  console.log(`Paid ${formattedAmount} USDC by ${payer} on ${network}`);

  res.json({
    secret: "The treasure is hidden under the doormat.",
    paid_by: payer,
  });
});

app.listen(3000, () => {
  console.log("Server listening at http://localhost:3000");
});
```

## Step 4: Test the server

### 4.1. Start the server

```shell theme={null}
npm start
```

### 4.2. Send an unpaid request

In a separate terminal, use `curl` to verify the server returns a `402`
response:

```shell theme={null}
curl -i http://localhost:3000/premium-data
```

You should see a `402 Payment Required` response with a `PAYMENT-REQUIRED`
header. The header contains the payment options.

### 4.3. Pay with a buyer client

Use the [buyer quickstart](/gateway/nanopayments/quickstarts/buyer) client to
make a gasless payment to your server:

```ts theme={null}
import { GatewayClient } from "@circle-fin/x402-batching/client";

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

const { data, status } = await client.pay("http://localhost:3000/premium-data");
console.log(`Status: ${status}`);
console.log("Data:", data);
```

If the payment succeeds, you'll see the JSON response from your protected
endpoint.

## Advanced: Use `BatchFacilitatorClient` directly

If you are not using Express, or need custom logic like dynamic pricing, use the
`BatchFacilitatorClient` directly. The `settle()` method calls the
[Settle x402 Payment](/api-reference/gateway/all/settle-x402payment) API
endpoint:

```ts server.ts expandable theme={null}
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";

const facilitator = new BatchFacilitatorClient({
  url: "https://gateway-api-testnet.circle.com",
});

const requirements = {
  scheme: "exact",
  network: "eip155:5042002", // CAIP-2 identifier for Arc Testnet (chain ID 5042002)
  asset: "0x...", // USDC contract address on Arc Testnet — see supported chains reference
  amount: "10000", // 0.01 USDC
  maxTimeoutSeconds: 604900,
  payTo: "0xYOUR_ADDRESS", // seller address that receives the payment
  extra: {
    name: "GatewayWalletBatched",
    version: "1",
    verifyingContract: "0x...", // Gateway Wallet contract on Arc Testnet — see supported chains reference
  },
};

async function handleRequest(paymentSignature?: string) {
  if (!paymentSignature) {
    const paymentRequired = {
      x402Version: 2,
      resource: {
        url: "/premium-data",
        description: "Paid resource",
        mimeType: "application/json",
      },
      accepts: [requirements],
    };

    return {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": Buffer.from(
          JSON.stringify(paymentRequired),
        ).toString("base64"),
      },
      body: {},
    };
  }

  const payload = JSON.parse(
    Buffer.from(paymentSignature, "base64").toString("utf8"),
  );

  const settlement = await facilitator.settle(payload, requirements);

  if (!settlement.success) {
    return {
      status: 402,
      body: { error: "Settlement failed" },
    };
  }

  return {
    status: 200,
    body: { data: "Your paid content" },
  };
}
```

<Note>
  Gateway's `settle()` endpoint is optimized for low latency and guarantees
  settlement. Use `settle()` directly rather than calling `verify()` followed by
  `settle()` in production flows.
</Note>

## Limit accepted networks (optional)

By default, the middleware accepts payments from any Gateway-supported
blockchain, discovered through the
[Get Supported x402 Payment Kinds](/api-reference/gateway/all/get-supported-x402payment-kinds)
API endpoint. This maximizes your reach since any buyer with a Gateway balance
on one of those accepted networks can pay you.

If you need to restrict payments to specific networks:

```ts theme={null}
const gateway = createGatewayMiddleware({
  sellerAddress: "0x...",
  networks: ["eip155:5042002"], // Only accept Arc Testnet
});
```

<Note>
  Payment signatures must have at least 7 days plus a small buffer of validity.
  The `validBefore` timestamp in the buyer's EIP-3009 authorization must be at
  least 7 days in the future, or Gateway will reject it.
</Note>
