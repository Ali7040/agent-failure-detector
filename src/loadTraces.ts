import { readFileSync } from "node:fs";
import type { AgentTrace } from "./types.js";

/**
 * Loads traces from a JSON file. Today that file is a static fixture; the same
 * signature is what a real trace source (log tail, OTel exporter, webhook)
 * would slot into.
 */
export function loadTraces(path: string): AgentTrace[] {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${path} to contain an array of traces.`);
  }
  parsed.forEach((trace, index) => assertTrace(trace, `${path}[${index}]`));
  return parsed as AgentTrace[];
}

function assertTrace(value: unknown, where: string): void {
  const trace = value as Partial<AgentTrace> | null;
  if (!trace || typeof trace !== "object") {
    throw new Error(`${where}: expected an object.`);
  }
  for (const field of ["traceId", "agent", "userMessage", "finalResponse"] as const) {
    if (typeof trace[field] !== "string") {
      throw new Error(`${where}: missing string field "${field}".`);
    }
  }
  if (trace.reportedStatus !== "success" && trace.reportedStatus !== "error") {
    throw new Error(`${where}: reportedStatus must be "success" or "error".`);
  }
  if (!Array.isArray(trace.toolCalls)) {
    throw new Error(`${where}: toolCalls must be an array.`);
  }
}
