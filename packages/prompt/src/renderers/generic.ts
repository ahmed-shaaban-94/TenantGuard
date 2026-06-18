import type { Section } from "../sections.js";

/** Render sections as Markdown with `##` headings. The base/fallback renderer. */
export function renderGeneric(sections: Section[], preamble?: string): string {
  const parts: string[] = [];
  if (preamble) parts.push(preamble, "");
  for (const s of sections) {
    parts.push(`## ${s.heading}`);
    parts.push(...s.lines.filter((l) => l !== ""));
    parts.push(""); // blank line between sections
  }
  // Trim a single trailing blank for byte-stable output.
  return parts.join("\n").replace(/\n+$/, "\n");
}
