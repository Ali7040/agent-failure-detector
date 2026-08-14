import type { AgentTrace, ToolCall } from "../types.js";

/**
 * Values an agent uses when it doesn't actually know who it's talking to.
 * These show up as "successful" arguments, which is exactly why they're
 * invisible to ordinary error monitoring.
 */
const PLACEHOLDER_VALUES = new Set([
  "",
  "?",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "unknown",
  "unknown@unknown.com",
  "user@example.com",
  "customer",
]);

/** e.g. cus_UNKNOWN, sub_UNKNOWN, acct_PLACEHOLDER */
const FABRICATED_ID = /^[a-z]+_(unknown|null|none|placeholder|temp|test|xxx+)$/i;

export function isPlaceholderValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

export function isFabricatedId(value: unknown): boolean {
  return typeof value === "string" && FABRICATED_ID.test(value.trim());
}

/** True when any argument value looks like an invented identifier. */
export function usesFabricatedId(call: ToolCall): boolean {
  return Object.values(call.args).some(isFabricatedId);
}

export function callsNamed(trace: AgentTrace, name: string): ToolCall[] {
  return trace.toolCalls.filter((call) => call.name === name);
}

/**
 * The agent established a real customer identity: a lookup that succeeded and
 * returned a customerId that isn't a placeholder or an invented one.
 */
export function hasVerifiedIdentity(trace: AgentTrace): boolean {
  return callsNamed(trace, "lookup_customer").some((call) => {
    if (call.result.status !== "success") return false;
    const customerId = call.result.data?.["customerId"];
    if (typeof customerId !== "string") return false;
    return !isPlaceholderValue(customerId) && !isFabricatedId(customerId);
  });
}

/** Stable stringify so `{a:1,b:2}` and `{b:2,a:1}` compare equal. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`);
  return `{${entries.join(",")}}`;
}
