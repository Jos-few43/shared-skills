import type { Segment, SkillFrontmatter } from "./types.js";

export function segmentsToString(segments: Segment[]): string {
  return segments.map((s) => {
    if (s.type === "text") return s.content;
    if (s.type === "tool_ref") return s.raw;
    if (s.type === "conditional") return segmentsToString(s.body);
    return "";
  }).join("");
}

export function renderFrontmatter(fm: SkillFrontmatter): string {
  const lines: string[] = ["---"];
  lines.push(`name: ${fm.name}`);
  lines.push(`description: ${fm.description}`);
  if (fm.version) lines.push(`version: "${fm.version}"`);
  if (fm.triggers?.slash_command) lines.push(`  slash_command: ${fm.triggers.slash_command}`);
  lines.push("---");
  return lines.join("\n");
}
