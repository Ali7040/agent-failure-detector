import type { AgentTrace, Detector } from "../types.js";
import { callsNamed, isFabricatedId, isPlaceholderValue, usesFabricatedId } from "./shared.js";

/**
 * Detector 1 — Fabricated identifiers.
 *
 * The agent never resolved who the customer was (the lookup errored, or ran on
 * a placeholder email), invented an ID to keep going instead of asking the
 * user, and then reported success. Every individual tool call returns 200, so
 * nothing here looks like an error from the outside.
 */
export const fabricatedIdentifiers: Detector = (traces) => {
  const affectedTraceIds = traces.filter(trips).map((trace) => trace.traceId);
  if (affectedTraceIds.length === 0) return null;

  return {
    id: "fabricated-identifiers",
    title: "Agent invents a customer ID after identity lookup fails",
    description:
      "The customer lookup failed or ran on a placeholder email, so the agent " +
      "never established who it was talking to. Instead of stopping to ask, it " +
      "substituted a fabricated ID (e.g. cus_UNKNOWN) into downstream calls — " +
      "including refunds and cancellations — and closed the conversation as a " +
      "success. Every tool call returned 200, so no error was ever raised.",
    affectedTraceIds,
    totalTraces: traces.length,
    suggestedFix:
      "Make identity a hard precondition for any account-mutating tool. Reject " +
      "customerId values matching /^[a-z]+_(unknown|null|placeholder)$/ at the " +
      "tool boundary, and have the agent ask a clarifying question when " +
      "lookup_customer errors or returns matched: false.",
  };
};

function trips(trace: AgentTrace): boolean {
  if (trace.reportedStatus !== "success") return false;

  const lookups = callsNamed(trace, "lookup_customer");
  const identityUnresolved = lookups.some(
    (call) =>
      call.result.status === "error" ||
      isPlaceholderValue(call.args["email"]) ||
      isFabricatedId(call.result.data?.["customerId"]),
  );
  if (!identityUnresolved) return false;

  // ...and the agent carried on anyway, with an ID it made up.
  return trace.toolCalls.some((call) => call.name !== "lookup_customer" && usesFabricatedId(call));
}
