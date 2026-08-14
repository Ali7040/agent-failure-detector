import { severityFor, sharePercent } from "../severity.js";
import type { Issue, Report } from "../types.js";

export function renderHtml(report: Report, agent: string, generatedAt: Date): string {
  const { totalTraces, issues } = report;
  const affected = new Set(issues.flatMap((issue) => issue.affectedTraceIds));
  const clean = totalTraces - affected.size;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Silent failure report — ${escapeHtml(agent)}</title>
<style>
  :root {
    --bg:            #0c0d0e;
    --surface:       #111213;
    --surface-2:     #161718;
    --line:          #202223;
    --line-strong:   #2b2d2f;
    --text:          #eceded;
    --text-dim:      #9ea3a8;
    --text-mute:     #6a6f75;
    --critical:      #e5484d;
    --high:          #e8a33d;
    --medium:        #6e8bb5;
    --mono: ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .wrap { max-width: 860px; margin: 0 auto; padding: 0 28px; }

  /* ---------- top bar ---------- */
  .topbar {
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }
  .topbar-inner {
    max-width: 860px; margin: 0 auto; padding: 0 28px;
    height: 46px; display: flex; align-items: center; gap: 14px;
    font-family: var(--mono); font-size: 11.5px; color: var(--text-mute);
  }
  .brand { color: var(--text-dim); letter-spacing: .01em; }
  .brand b { color: var(--text); font-weight: 500; }
  .dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--critical); display: inline-block;
    margin-right: 7px; vertical-align: 1px;
  }
  .dot.clear { background: #3fb27f; }
  .topbar .sep { color: var(--line-strong); }
  .topbar .right { margin-left: auto; }

  /* ---------- header ---------- */
  header { padding: 52px 0 0; }
  .kicker {
    font-family: var(--mono); font-size: 11px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--text-mute); margin-bottom: 14px;
  }
  h1 {
    margin: 0 0 12px; font-size: 23px; line-height: 1.25;
    font-weight: 600; letter-spacing: -0.015em;
  }
  .lede { margin: 0; color: var(--text-dim); max-width: 60ch; font-size: 14.5px; }
  .lede b { color: var(--text); font-weight: 600; }

  /* ---------- metrics strip ---------- */
  .metrics {
    display: grid; grid-template-columns: repeat(4, 1fr);
    border: 1px solid var(--line); border-radius: 4px;
    margin: 34px 0 46px; background: var(--surface);
  }
  .metric { padding: 14px 18px; border-left: 1px solid var(--line); }
  .metric:first-child { border-left: 0; }
  .metric .k {
    font-family: var(--mono); font-size: 10.5px; letter-spacing: .085em;
    text-transform: uppercase; color: var(--text-mute); white-space: nowrap;
  }
  .metric .v {
    font-family: var(--mono); font-size: 21px; font-weight: 500;
    margin-top: 7px; letter-spacing: -0.01em; font-variant-numeric: tabular-nums;
  }
  .metric.flag .v { color: var(--critical); }
  .metric.good .v { color: #3fb27f; }

  /* ---------- issue list ---------- */
  .list-head {
    display: flex; align-items: baseline; justify-content: space-between;
    font-family: var(--mono); font-size: 11px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--text-mute);
    padding-bottom: 10px; border-bottom: 1px solid var(--line-strong);
  }
  .issues { border: 1px solid var(--line); border-top: 0; border-radius: 0 0 4px 4px; }
  .issue {
    position: relative; padding: 26px 26px 26px 28px;
    border-top: 1px solid var(--line); background: var(--surface);
  }
  .issue:first-child { border-top: 0; }
  .issue::before {
    content: ""; position: absolute; left: 0; top: -1px; bottom: -1px; width: 2px;
    background: var(--sev, var(--medium));
  }
  .issue[data-sev="critical"] { --sev: var(--critical); }
  .issue[data-sev="high"]     { --sev: var(--high); }
  .issue[data-sev="medium"]   { --sev: var(--medium); }

  .meta {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    font-family: var(--mono); font-size: 11px; margin-bottom: 13px;
  }
  .sev {
    letter-spacing: .09em; text-transform: uppercase; font-weight: 500;
    color: var(--sev); border: 1px solid currentColor; border-radius: 3px;
    padding: 2.5px 7px; opacity: .95;
  }
  .key { color: var(--text-mute); }
  .meta .right { margin-left: auto; color: var(--text-mute); }
  .meta .right b {
    color: var(--text); font-weight: 500; font-variant-numeric: tabular-nums;
  }

  h2 {
    margin: 0 0 9px; font-size: 16.5px; font-weight: 600;
    letter-spacing: -0.008em; line-height: 1.35;
  }
  .desc { margin: 0 0 22px; color: var(--text-dim); max-width: 68ch; font-size: 13.8px; }

  /* ---------- impact ---------- */
  .impact { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
  .impact .n {
    font-family: var(--mono); font-size: 19px; font-weight: 500;
    font-variant-numeric: tabular-nums; letter-spacing: -0.01em; white-space: nowrap;
  }
  .impact .n span { color: var(--text-mute); }
  .track {
    flex: 0 1 240px; height: 2px; background: var(--line-strong); position: relative;
  }
  .track i { position: absolute; inset: 0 auto 0 0; background: var(--sev); }
  .impact .cap {
    font-family: var(--mono); font-size: 11px; color: var(--text-mute); white-space: nowrap;
  }

  /* ---------- fields ---------- */
  .field { margin-top: 18px; }
  .field-k {
    font-family: var(--mono); font-size: 10.5px; letter-spacing: .085em;
    text-transform: uppercase; color: var(--text-mute); margin-bottom: 9px;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip {
    font-family: var(--mono); font-size: 11.5px; color: var(--text-dim);
    background: var(--surface-2); border: 1px solid var(--line);
    border-radius: 3px; padding: 3.5px 7px;
  }
  .fix {
    margin: 0; color: var(--text-dim); font-size: 13.5px;
    border-left: 1px solid var(--line-strong); padding-left: 14px; max-width: 68ch;
  }
  .fix code {
    font-family: var(--mono); font-size: 12px; color: var(--text);
    background: var(--surface-2); border: 1px solid var(--line);
    border-radius: 3px; padding: 0.5px 4px;
  }

  .empty {
    border: 1px solid var(--line); border-top: 0; border-radius: 0 0 4px 4px;
    background: var(--surface); padding: 44px; text-align: center;
    color: var(--text-mute); font-family: var(--mono); font-size: 12.5px;
  }

  footer {
    margin: 40px 0 64px; padding-top: 16px; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap;
    font-family: var(--mono); font-size: 11px; color: var(--text-mute);
  }

  @media (max-width: 680px) {
    .wrap, .topbar-inner { padding: 0 18px; }
    .metrics { grid-template-columns: repeat(2, 1fr); }
    .metric:nth-child(3) { border-left: 0; }
    .metric:nth-child(n+3) { border-top: 1px solid var(--line); }
    h1 { font-size: 20px; }
  }
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-inner">
    <span class="brand">
      <span class="dot${issues.length === 0 ? " clear" : ""}"></span><b>failure-detector</b>
    </span>
    <span class="sep">/</span>
    <span>${escapeHtml(agent)}</span>
    <span class="sep">/</span>
    <span>batch ${totalTraces} runs</span>
    <span class="right">${formatTimestamp(generatedAt)}</span>
  </div>
</div>

<div class="wrap">
  <header>
    <div class="kicker">Silent failure report</div>
    <h1>${affected.size} of ${totalTraces} runs reported success without doing the work</h1>
    <p class="lede">
      Every run flagged below terminated <b>cleanly</b>. No exception was thrown, no tool call
      returned an error the agent surfaced, and none of them would appear in conventional error
      monitoring. The failure is only visible by reading the trace against what the agent claimed.
    </p>
  </header>

  <div class="metrics">
    <div class="metric">
      <div class="k">Runs analyzed</div>
      <div class="v">${totalTraces}</div>
    </div>
    <div class="metric flag">
      <div class="k">Silent failures</div>
      <div class="v">${affected.size}</div>
    </div>
    <div class="metric flag">
      <div class="k">Failure rate</div>
      <div class="v">${percent(affected.size, totalTraces)}</div>
    </div>
    <div class="metric good">
      <div class="k">Clean runs</div>
      <div class="v">${clean}</div>
    </div>
  </div>

  <div class="list-head">
    <span>Detected issues</span>
    <span>${String(issues.length).padStart(2, "0")}</span>
  </div>
  ${
    issues.length > 0
      ? `<div class="issues">\n${issues.map(renderIssue).join("\n")}\n  </div>`
      : `<div class="empty">No silent failures detected in this batch.</div>`
  }

  <footer>
    <span>Rule-based detection · 3 detectors · ${totalTraces} traces</span>
    <span>Scan completed ${formatTimestamp(generatedAt)}</span>
  </footer>
</div>

</body>
</html>
`;
}

function renderIssue(issue: Issue): string {
  const count = issue.affectedTraceIds.length;
  const share = sharePercent(count, issue.totalTraces);
  const severity = severityFor(share);

  return `    <article class="issue" data-sev="${severity}">
      <div class="meta">
        <span class="sev">${severity}</span>
        <span class="key">${escapeHtml(issue.id)}</span>
        <span class="right"><b>${percent(count, issue.totalTraces)}</b> of runs affected</span>
      </div>
      <h2>${escapeHtml(issue.title)}</h2>
      <p class="desc">${escapeHtml(issue.description)}</p>

      <div class="impact">
        <span class="n">${count}<span> / ${issue.totalTraces}</span></span>
        <span class="track"><i style="width:${share.toFixed(1)}%"></i></span>
        <span class="cap">runs affected</span>
      </div>

      <div class="field">
        <div class="field-k">Affected traces</div>
        <div class="chips">
          ${issue.affectedTraceIds.map((id) => `<span class="chip">${escapeHtml(id)}</span>`).join("\n          ")}
        </div>
      </div>

      <div class="field">
        <div class="field-k">Recommended fix</div>
        <p class="fix">${withInlineCode(issue.suggestedFix)}</p>
      </div>
    </article>`;
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function formatTimestamp(date: Date): string {
  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape first, then promote identifier-ish tokens to <code> for readability. */
function withInlineCode(value: string): string {
  return escapeHtml(value).replace(
    /(\/[^\s/]+\/|[a-zA-Z_]+\.[a-zA-Z_]+\(\)|\b[a-z_]+_[a-z_]+\b|matched: false)/g,
    "<code>$1</code>",
  );
}
