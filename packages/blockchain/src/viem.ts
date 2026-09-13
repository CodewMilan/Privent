import {
  createPublicClient,
  createWalletClient,
  http,
  stringToHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, sepolia } from "viem/chains";
import { authorizeExecution } from "./authorize.js";
import type { ExecutionPermit, ExecutionResult, Executor } from "./types.js";

export interface ViemExecutorConfig {
  privateKey: Hex;
  rpcUrl: string;
  chainId: number;
}

function chainFor(chainId: number) {
  if (chainId === 1) {
    throw new Error("Refusing to sign on Ethereum mainnet");
  }
  if (chainId === sepolia.id) return sepolia;
  if (chainId === foundry.id) return foundry;
  return {
    ...sepolia,
    id: chainId,
    name: `chain-${chainId}`,
  };
}

export function createViemExecutor(config: ViemExecutorConfig): Executor {
  const account = privateKeyToAccount(config.privateKey);
  const chain = chainFor(config.chainId);
  const transport = http(config.rpcUrl);
  const wallet = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });

  return {
    mode: "testnet",
    fromAddress: account.address,
    async send(permit: ExecutionPermit): Promise<ExecutionResult> {
      const authorized = authorizeExecution(permit);
      if (!authorized.ok) {
        return {
          status: "failed",
          hash: null,
          fromAddress: account.address,
          toAddress: permit.transfer.to,
          mode: "testnet",
          error: authorized.reason,
        };
      }

      try {
        const hash = await wallet.sendTransaction({
          to: permit.transfer.to as Hex,
          value: 0n,
          data: stringToHex(
            `privent:${permit.transfer.actionRequestId}:${permit.transfer.amountCents}`,
          ),
        });

        try {
          await publicClient.waitForTransactionReceipt({
            hash,
            timeout: 60_000,
          });
          return {
            status: "confirmed",
            hash,
            fromAddress: account.address,
            toAddress: permit.transfer.to,
            mode: "testnet",
            error: null,
          };
        } catch {
          return {
            status: "broadcast",
            hash,
            fromAddress: account.address,
            toAddress: permit.transfer.to,
            mode: "testnet",
            error: null,
          };
        }
      } catch (error) {
        return {
          status: "failed",
          hash: null,
          fromAddress: account.address,
          toAddress: permit.transfer.to,
          mode: "testnet",
          error: error instanceof Error ? error.message : "Broadcast failed",
        };
      }
    },
  };
}
