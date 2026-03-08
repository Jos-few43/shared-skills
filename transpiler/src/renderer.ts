import type { Segment, SkillFrontmatter } from "./types.js";

export function segmentsToString(segments: Segment[]): string {
  return segments.map((s) => {
    if (s.type === "text") return s.content;
    if (s.type === "tool_ref") return s.raw;
    if (s.type === "conditional") return segmentsToString(s.body);
    return "";
  }).join("");
}

export function renderFrontmatter(fm: SkillFrontmatter, includeSkills2Fields = false): string {
  const lines: string[] = ["---"];
  lines.push(`name: ${fm.name}`);
  lines.push(`description: ${fm.description}`);

  if (includeSkills2Fields) {
    // Pass through Skills 2.0 fields for Claude Code
    if (fm["argument-hint"]) lines.push(`argument-hint: "${fm["argument-hint"]}"`);
    if (fm["disable-model-invocation"] !== undefined) lines.push(`disable-model-invocation: ${fm["disable-model-invocation"]}`);
    if (fm["user-invocable"] !== undefined) lines.push(`user-invocable: ${fm["user-invocable"]}`);
    if (fm["allowed-tools"]) lines.push(`allowed-tools: "${fm["allowed-tools"]}"`);
    if (fm.model) lines.push(`model: ${fm.model}`);
    if (fm.context) lines.push(`context: ${fm.context}`);
    if (fm.agent) lines.push(`agent: ${fm.agent}`);
    if (fm.hooks && Object.keys(fm.hooks).length > 0) {
      lines.push("hooks:");
      for (const [k, v] of Object.entries(fm.hooks)) {
        lines.push(`  ${k}: ${JSON.stringify(v)}`);
      }
    }
  }

  lines.push("---");
  return lines.join("\n");
}
