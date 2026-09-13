import { createSimulatedExecutor } from "./simulated.js";
import { createViemExecutor } from "./viem.js";
import type { Executor } from "./types.js";

/**
 * Production factory. Tests never call this — they inject a simulated
 * executor so a leftover shell key cannot broadcast.
 *
 * The private key stays inside this package. The agent package does not
 * import @privent/blockchain.
 */
export function createExecutorFromEnv(): Executor {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return createSimulatedExecutor();
  }

  const privateKey = process.env.EXECUTOR_PRIVATE_KEY?.trim();
  if (!privateKey) {
    return createSimulatedExecutor();
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error("EXECUTOR_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key");
  }

  return createViemExecutor({
    privateKey: privateKey as `0x${string}`,
    rpcUrl:
      process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: Number(process.env.CHAIN_ID ?? 11155111),
  });
}
