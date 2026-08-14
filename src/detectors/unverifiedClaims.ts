import type { AgentTrace, Detector } from "../types.js";
import { hasVerifiedIdentity } from "./shared.js";

/** The agent telling the user money moved or a plan ended. */
const MONEY_CLAIM = /refund(ed|s)?|cancell?(ed|ation)?/i;

/**
 * Detector 3 — Unverified claims.
 *
 * The closing message confirms a refund or a cancellation, but nowhere in the
 * trace did the agent establish a verified customer identity. Whatever it
 * confirmed, it confirmed about nobody in particular.
 */
export const unverifiedClaims: Detector = (traces) => {
  const affectedTraceIds = traces.filter(trips).map((trace) => trace.traceId);
  if (affectedTraceIds.length === 0) return null;

  return {
    id: "unverified-claims",
    title: "Agent confirms a refund or cancellation it never verified",
    description:
      "The final message tells the customer their refund went through or their " +
      "subscription was cancelled, but the trace contains no successful " +
      "lookup_customer returning a real customer ID. The claim is stated with " +
      "full confidence and lands in a support transcript as resolved — this is " +
      "the class of failure that surfaces later as a chargeback or an angry " +
      "second ticket.",
    affectedTraceIds,
    totalTraces: traces.length,
    suggestedFix:
      "Gate the closing message on evidence: before emitting a confirmation " +
      "that matches /refund|cancel/, assert the run holds both a verified " +
      "customerId and a successful mutating call whose result ID is echoed in " +
      "the response. If either is missing, downgrade the wording to a request " +
      "for confirmation.",
  };
};

function trips(trace: AgentTrace): boolean {
  if (!MONEY_CLAIM.test(trace.finalResponse)) return false;
  return !hasVerifiedIdentity(trace);
}
