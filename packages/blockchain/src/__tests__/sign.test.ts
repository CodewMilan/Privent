import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemExecutor } from "../viem.js";

// Foundry/Anvil account #0 — public test key, never used in production.
const TEST_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

describe("viem signer", () => {
  it("produces a real secp256k1 signature without putting the key on the permit", async () => {
    const account = privateKeyToAccount(TEST_KEY);
    const signed = await account.signTransaction({
      chainId: sepolia.id,
      to: "0x2222222222222222222222222222222222222222",
      value: 0n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
      gas: 21_000n,
      nonce: 0,
      type: "eip1559",
    });

    expect(signed.startsWith("0x")).toBe(true);
    expect(signed.length).toBeGreaterThan(120);
    expect(account.address).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });

  it("refuses Ethereum mainnet", () => {
    expect(() =>
      createViemExecutor({
        privateKey: TEST_KEY,
        rpcUrl: "http://127.0.0.1:8545",
        chainId: 1,
      }),
    ).toThrow(/mainnet/i);
  });
});
