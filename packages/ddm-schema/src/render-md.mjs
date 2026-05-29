// Sovereign Dispatch — Markdown renderer (Epic 6/7 sibling, P1 first end-to-end).
//
// Pure: renderMarkdown(layoutModel) → { text, warnings }. Consumes the same
// presentation-neutral Layout Model (Epic 5) that PDF/DOCX will consume, so it
// proves the full render spine before Chromium/OOXML land. It adds presentation
// only (Markdown syntax); it computes NO numbers/order/refs (the engine did).

function esc(s) {
  return String(s ?? "").replace(/([\\`*_{}\[\]<>])/g, "\\$1");
}

function renderBlock(b, warnings) {
  switch (b.kind) {
    case "paragraph": {
      const t = esc(b.text);
      return b.style === "lead" ? `**${t}**` : b.style === "note" ? `> _${t}_` : t;
    }
    case "bullets": {
      const lines = [];
      const walk = (items, depth) => {
        items.forEach((it, i) => {
          const indent = "  ".repeat(depth);
          const marker = b.ordered ? `${i + 1}.` : "-";
          const ref = it.noteRef ? ` [^${it.noteRef}]` : "";
          lines.push(`${indent}${marker} ${esc(it.text)}${ref}`);
          if (it.children?.length) walk(it.children, depth + 1);
        });
      };
      walk(b.items, 0);
      return lines.join("\n");
    }
    case "table": {
      const head = `**${b.number ? b.number + ". " : ""}${esc(b.caption || "")}**`.trim();
      const cols = b.columns.map((c) => esc(c.label));
      const sep = b.columns.map((c) => (c.align === "right" ? "---:" : c.align === "center" ? ":---:" : "---"));
      const rows = b.rows.map((r) => `| ${r.map((cell) => esc(cell.text)).join(" | ")} |`);
      const out = [`| ${cols.join(" | ")} |`, `| ${sep.join(" | ")} |`, ...rows];
      if (head !== "****") out.unshift(head);
      if (b.footnotes?.length) out.push(b.footnotes.map((f) => `_${esc(f)}_`).join("  \n"));
      return out.join("\n");
    }
    case "kpi":
      return b.items
        .map((k) => `**${esc(k.label)}:** ${esc(k.value)}${k.unit ? " " + esc(k.unit) : ""}${k.delta ? ` (${esc(k.delta)})` : ""}`)
        .join("  \n");
    case "chart": {
      // MD has no native chart → render the underlying data as a table (fallback).
      warnings.push({ code: "CHART_RASTERIZED", blockId: b.nodeId, detail: "chart rendered as data table in markdown" });
      const cap = `**${b.number ? b.number + ". " : ""}${esc(b.caption || "Chart")}** (${b.chartType})`;
      const xk = b.spec?.xKey || b.spec?.labelKey || "x";
      const series = b.spec?.series || [];
      const header = [xk, ...series.map((s) => s.label)];
      const rows = (b.spec?.data || []).map((d) => [d[xk], ...series.map((s) => d[s.key])]);
      const out = [cap, `| ${header.map(esc).join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`,
        ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`)];
      return out.join("\n");
    }
    case "quote": {
      const ref = b.noteRef ? ` [^${b.noteRef}]` : "";
      const attr = b.attribution ? `\n> — ${esc(b.attribution)}` : "";
      return `> ${esc(b.text)}${ref}${attr}`;
    }
    case "callout": {
      const label = b.style.toUpperCase();
      const title = b.title ? ` ${esc(b.title)}` : "";
      return `> **[${label}]${title}** ${esc(b.text)}`;
    }
    case "timeline":
      return b.events.map((e) => `- **${esc(e.ts)}** — ${esc(e.label)}${e.detail ? `: ${esc(e.detail)}` : ""}`).join("\n");
    case "image": {
      if (!b.altText) warnings.push({ code: "MISSING_ALT_TEXT", blockId: b.nodeId, detail: "image lacks altText" });
      const src = b.source?.src || (b.source?.evidenceId ? `evidence:${b.source.evidenceId}` : "");
      const cap = b.caption ? `\n*${b.number ? b.number + ". " : ""}${esc(b.caption)}*` : "";
      return `![${esc(b.altText || "")}](${src})${cap}`;
    }
    case "reference":
      return ""; // collapses into host text as [^n]; nothing standalone
    case "pagebreak":
      return "\n---\n";
    case "signature":
      return `\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  (${esc(b.signatureRef)})`;
    default:
      return esc(b.text || "");
  }
}

function renderSection(s, warnings) {
  const hashes = "#".repeat(Math.min(Math.max(s.level + 1, 2), 6)); // body headings start at H2 (cover is H1)
  const num = s.kind === "appendix" || s.kind === "annex"
    ? `Appendix ${s.number || ""} — `
    : s.number ? `${s.number} ` : "";
  const head = `${hashes} ${num}${esc(s.heading)}`.replace(/\s+$/, "");
  const blocks = (s.blocks || []).map((b) => renderBlock(b, warnings)).filter((t) => t !== "");
  return [head, "", ...blocks.flatMap((b) => [b, ""])].join("\n");
}

/**
 * Render a Layout Model to Markdown.
 * @returns {{ text: string, warnings: Array }}
 */
export function renderMarkdown(lm) {
  const warnings = [];
  const out = [];

  // Cover (H1) from resolved metadata.
  const c = lm.cover;
  out.push(`# ${esc(c.title)}`);
  if (c.subtitle) out.push(`### ${esc(c.subtitle)}`);
  const meta = [];
  if (c.owningBody) meta.push(esc(c.owningBody));
  if (c.authors?.length) meta.push(c.authors.map((a) => esc(a.name)).join(", "));
  if (c.date) meta.push(esc(c.date));
  if (c.referenceCode) meta.push(`Ref: ${esc(c.referenceCode)}`);
  if (c.version) meta.push(`v${esc(c.version)}`);
  if (c.status) meta.push(esc(c.status));
  if (meta.length) out.push(`_${meta.join(" · ")}_`);

  // Classification banner (if sensitive).
  const lvl = lm.classification?.level;
  const sensitive = lvl && !/^(unclassified|none)$/i.test(lvl);
  if (lm.renderHints.classificationBanner !== "none" && sensitive) {
    out.push("", `**${esc(lm.classification.scheme?.toUpperCase() || "")} ${esc(lvl)}**`);
  }
  out.push("", "---", "");

  // TOC (no page numbers — render-time concern absent in MD).
  if (lm.toc?.length) {
    out.push("## Contents", "");
    for (const e of lm.toc) out.push(`- ${e.number ? e.number + " " : ""}${esc(e.title)}`);
    out.push("", "---", "");
  }

  // Body, then appendices.
  for (const s of lm.body) out.push(renderSection(s, warnings));
  for (const s of lm.appendices) out.push(renderSection(s, warnings));

  // Sources (endnotes / numbered).
  if (lm.sources?.entries?.length) {
    out.push("## Sources", "");
    for (const e of lm.sources.entries) {
      const f = e.formattedFields || {};
      const parts = [f.title, (f.authors || []).join(", "), f.publisher, f.url].filter(Boolean).map(esc);
      out.push(`[^${e.ordinal}]: ${parts.join(". ")}`);
    }
    out.push("");
  }

  return { text: out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n", warnings };
}
