import type { AgentTrace, Detector, ToolCall } from "../types.js";
import { canonicalize } from "./shared.js";

const MIN_REPEATS = 3;

/** Hedging language that promises work rather than reporting a result. */
const VAGUE_CLOSING =
  /\b(still (checking|looking|working)|checking on|look(ing)? into|let me check|i'?ll check|one moment|hold on|bear with|give me a (moment|second)|investigating|pulling up|pull up)\b/i;

/**
 * Detector 2 — Stall loops.
 *
 * The same tool is called 3+ times with identical arguments, every call comes
 * back with the same thing it did the first time, and the agent signs off with
 * "I'm looking into it" rather than an answer. The run is marked successful and
 * the user is left waiting for a reply that never comes.
 */
export const stallLoops: Detector = (traces) => {
  const affectedTraceIds = traces.filter(trips).map((trace) => trace.traceId);
  if (affectedTraceIds.length === 0) return null;

  return {
    id: "stall-loops",
    title: "Agent retries the same tool call and closes without answering",
    description:
      `The agent called one tool ${MIN_REPEATS}+ times with byte-identical ` +
      "arguments, received the same result every time, then ended the " +
      "conversation with a holding phrase (\"I'm looking into it\", \"one " +
      "moment\") instead of an answer. The run is recorded as a success, but " +
      "the user's question was never resolved and no follow-up is coming.",
    affectedTraceIds,
    totalTraces: traces.length,
    suggestedFix:
      "Deduplicate identical tool calls within a run: after the second " +
      "identical call, return a cached result plus a retry-exhausted signal. " +
      "Then require the closing turn to either answer the question or hand off " +
      "to a human — treat a holding phrase as a terminal state, not a success.",
  };
};

function trips(trace: AgentTrace): boolean {
  if (trace.reportedStatus !== "success") return false;
  if (!VAGUE_CLOSING.test(trace.finalResponse)) return false;

  for (const calls of groupByCallSignature(trace.toolCalls).values()) {
    if (calls.length >= MIN_REPEATS && yieldsNothingNew(calls)) return true;
  }
  return false;
}

function groupByCallSignature(toolCalls: ToolCall[]): Map<string, ToolCall[]> {
  const groups = new Map<string, ToolCall[]>();
  for (const call of toolCalls) {
    const signature = `${call.name}::${canonicalize(call.args)}`;
    const existing = groups.get(signature);
    if (existing) existing.push(call);
    else groups.set(signature, [call]);
  }
  return groups;
}

/** Every repeat returned exactly what the first one did — no new information. */
function yieldsNothingNew(calls: ToolCall[]): boolean {
  const [first] = calls;
  if (!first) return false;
  const baseline = canonicalize(first.result);
  return calls.every((call) => canonicalize(call.result) === baseline);
}
