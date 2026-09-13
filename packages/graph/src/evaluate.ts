import type { PolicyEvaluation, ProposedAction } from "@privent/shared";
import type { ProtocolPulse } from "./types.js";

/** Public floors. Live Uniswap USDC/WETH sits well above these. */
export const THIN_TVL_USD = 1_000_000;
export const COOLING_VOLUME_RATIO = 0.5;

export const UNISWAP_V3_SUBGRAPH_ID =
  "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";
export const USDC_WETH_005_POOL =
  "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640";

export function evaluateProtocolPulse(
  _action: ProposedAction,
  pulse: ProtocolPulse,
): PolicyEvaluation {
  if (pulse.status === "unconfigured") {
    return {
      decision: "ALLOW",
      code: "GRAPH_NEUTRAL",
      reason: "Live protocol data is not configured, so Graph does not vote.",
    };
  }

  if (pulse.status === "error" || pulse.tvlUsd == null || pulse.volume24hUsd == null) {
    return {
      decision: "REQUIRE_APPROVAL",
      code: "GRAPH_UNAVAILABLE",
      reason:
        "Live protocol data could not be read. Automatic sends are paused until a human confirms.",
    };
  }

  if (pulse.tvlUsd < THIN_TVL_USD) {
    return {
      decision: "DENY",
      code: "GRAPH_DENIED",
      reason: `Live Uniswap V3 TVL is $${Math.round(pulse.tvlUsd).toLocaleString("en-US")}, below the public $${THIN_TVL_USD.toLocaleString("en-US")} floor.`,
    };
  }

  if (
    pulse.previousVolumeUsd != null &&
    pulse.previousVolumeUsd > 0 &&
    pulse.volume24hUsd < pulse.previousVolumeUsd * COOLING_VOLUME_RATIO
  ) {
    return {
      decision: "REQUIRE_APPROVAL",
      code: "GRAPH_REQUIRES_APPROVAL",
      reason:
        "Live Uniswap V3 volume cooled more than 50% versus the prior day. Human confirmation required.",
    };
  }

  return {
    decision: "ALLOW",
    code: "GRAPH_ALLOWED",
    reason: "Live Uniswap V3 liquidity and volume look healthy.",
  };
}
