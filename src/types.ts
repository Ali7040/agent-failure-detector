export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: {
    status: "success" | "error";
    data?: Record<string, unknown>;
  };
}

export interface AgentTrace {
  traceId: string;
  agent: string;
  userMessage: string;
  toolCalls: ToolCall[];
  finalResponse: string;
  /** What the agent SAYS happened — not necessarily what did happen. */
  reportedStatus: "success" | "error";
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  affectedTraceIds: string[];
  totalTraces: number;
  suggestedFix: string;
}

export interface Report {
  totalTraces: number;
  issues: Issue[];
}

/**
 * A detector scans the whole corpus and returns a single grouped Issue,
 * or null when nothing in the corpus trips the pattern.
 */
export type Detector = (traces: AgentTrace[]) => Issue | null;
