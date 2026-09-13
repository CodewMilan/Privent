import type { PolicyEvaluation } from "@privent/shared";

export type GraphPulseStatus = "ok" | "unconfigured" | "error";

export interface ProtocolPulse {
  status: GraphPulseStatus;
  simulated: boolean;
  protocol: string;
  pair: string;
  pool: string;
  tvlUsd: number | null;
  volume24hUsd: number | null;
  previousVolumeUsd: number | null;
  ethPriceUsd: number | null;
  asOf: string;
  source: string;
  error: string | null;
}

export interface GraphClient {
  readonly kind: "static" | "gateway" | "unconfigured";
  readPulse(): Promise<ProtocolPulse>;
}

export interface PulseEvaluation {
  evaluation: PolicyEvaluation;
  pulse: ProtocolPulse;
}
