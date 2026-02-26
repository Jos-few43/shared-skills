import yaml from "yaml";

export interface AuditReport {
  skillName: string;
  sourcePath: string;
  hardcodedTools: string[];
  suggestedRequires: string[];
  missingToolRefs: string[];
}

const CLAUDE_TOOLS: Record<string, string> = {
  "Bash": "shell_exec",
  "Read": "file_read",
  "Write": "file_write",
  "Edit": "file_edit",
  "Glob": "file_search",
  "Grep": "content_search",
  "Task": "subagent",
  "WebFetch": "web_fetch",
  "WebSearch": "web_search",
  "AskUserQuestion": "ask_user",
};

const CAPABILITY_HINTS: Record<string, RegExp[]> = {
  shell_exec: [/```bash/i, /```sh\n/i, /run this command/i, /execute.*command/i],
  file_read: [/read.*file/i, /view.*file/i],
  file_write: [/create.*file/i, /write.*to.*file/i],
  file_search: [/find.*files/i, /search.*for.*files/i],
  content_search: [/search.*content/i, /find.*in.*files/i],
};

export function auditSkill(source: string, sourcePath: string): AuditReport {
  const fmMatch = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fmText = fmMatch?.[1] ?? "";
  const body = fmMatch?.[2] ?? source;

  let fm: Record<string, unknown> = {};
  try { fm = yaml.parse(fmText) ?? {}; } catch { /* ignore */ }

  const existingRequires = new Set<string>(
    Array.isArray(fm.requires) ? fm.requires : []
  );

  // Strip code blocks before checking for hardcoded tool names
  const bodyOutsideCode = body.replace(/```[\s\S]*?```/g, "");

  const hardcodedTools: string[] = [];
  const missingToolRefs: string[] = [];

  for (const [toolName, capability] of Object.entries(CLAUDE_TOOLS)) {
    const pattern = new RegExp(`\\b${toolName}\\b`, "g");
    if (pattern.test(bodyOutsideCode)) {
      hardcodedTools.push(toolName);
      missingToolRefs.push(`${toolName} → {{tool:${capability}}}`);
    }
  }

  const suggestedRequires: string[] = [];
  for (const [cap, patterns] of Object.entries(CAPABILITY_HINTS)) {
    if (existingRequires.has(cap)) continue;
    if (patterns.some(p => p.test(body))) {
      suggestedRequires.push(cap);
    }
  }

  return {
    skillName: (fm.name as string) ?? sourcePath,
    sourcePath,
    hardcodedTools,
    suggestedRequires,
    missingToolRefs,
  };
}
