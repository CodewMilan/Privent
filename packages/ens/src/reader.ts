import { createPublicClient, http, type Address } from "viem";
import { mainnet, sepolia } from "viem/chains";
import type { EnsReader } from "./types.js";

export function createViemEnsReader(rpcUrl?: string, chainId = 1): EnsReader {
  const chain = chainId === 11155111 ? sepolia : mainnet;
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl ?? "https://ethereum-rpc.publicnode.com"),
  });

  return {
    async getEnsAddress(name: string) {
      const address = await client.getEnsAddress({ name });
      return address;
    },
    async getEnsText(name: string, key: string) {
      return client.getEnsText({ name, key });
    },
  };
}

export function createStaticEnsReader(
  entries: Record<
    string,
    { address: Address | null; texts: Record<string, string | null> }
  >,
): EnsReader {
  return {
    async getEnsAddress(name: string) {
      return entries[name.toLowerCase()]?.address ?? null;
    },
    async getEnsText(name: string, key: string) {
      return entries[name.toLowerCase()]?.texts[key] ?? null;
    },
  };
}
