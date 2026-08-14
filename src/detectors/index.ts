import type { AgentTrace, Detector, Issue } from "../types.js";
import { fabricatedIdentifiers } from "./fabricatedIdentifiers.js";
import { stallLoops } from "./stallLoops.js";
import { unverifiedClaims } from "./unverifiedClaims.js";

export const detectors: Detector[] = [fabricatedIdentifiers, stallLoops, unverifiedClaims];

/**
 * Run every detector over the corpus. Each detector groups all of its matches
 * into a single issue, so the output is a short list of patterns to fix rather
 * than one alert per bad run.
 */
export function runDetectors(traces: AgentTrace[]): Issue[] {
  return detectors
    .map((detect) => detect(traces))
    .filter((issue): issue is Issue => issue !== null)
    .sort((a, b) => b.affectedTraceIds.length - a.affectedTraceIds.length);
}

export { fabricatedIdentifiers, stallLoops, unverifiedClaims };
