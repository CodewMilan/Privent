import { createSimulatedExecutor } from "./simulated.js";
import { createViemExecutor } from "./viem.js";
import type { Executor } from "./types.js";

export function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error("EXECUTOR_PRIVATE_KEY must be a 32-byte hex key");
  }
  return hex as `0x${string}`;
}

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

  return createViemExecutor({
    privateKey: normalizePrivateKey(privateKey),
    rpcUrl:
      process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: Number(process.env.CHAIN_ID ?? 11155111),
  });
}
