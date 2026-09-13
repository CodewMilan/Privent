import type { PrivyPolicyBody } from "./policy.js";

export interface CreatedPrivyPolicy {
  id: string;
  name: string;
}

export interface PrivyClient {
  createPolicy(body: PrivyPolicyBody): Promise<CreatedPrivyPolicy>;
}

export function createHttpPrivyClient(
  appId: string,
  appSecret: string,
  baseUrl = "https://api.privy.io",
): PrivyClient {
  const authorization = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;

  return {
    async createPolicy(body) {
      const response = await fetch(`${baseUrl}/v1/policies`, {
        method: "POST",
        headers: {
          authorization,
          "privy-app-id": appId,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        id?: string;
        name?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok || !payload.id) {
        throw new Error(
          payload.error ?? payload.message ?? `Privy policy create failed (${response.status})`,
        );
      }
      return { id: payload.id, name: payload.name ?? body.name };
    },
  };
}
