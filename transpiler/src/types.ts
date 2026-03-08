// --- Frontmatter types ---

export interface SkillFrontmatter {
  name: string;
  description: string;
  // Skills 2.0 fields (pass through for Claude Code, strip for others)
  "argument-hint"?: string;
  "disable-model-invocation"?: boolean;
  "user-invocable"?: boolean;
  "allowed-tools"?: string;
  model?: string;
  context?: "fork";
  agent?: string;
  hooks?: Record<string, unknown>;
  // Transpiler-only fields
  requires?: string[];
  optional?: string[];
  targets?: Record<string, TargetOverride>;
  targets_only?: string[];
  // REMOVED: version, triggers (no longer in schema)
}

export interface TargetOverride {
  description?: string;
  category?: string;
  [key: string]: unknown;
}

// --- AST types ---

export type Segment =
  | TextSegment
  | ToolRefSegment
  | ConditionalBlock;

export interface TextSegment {
  type: "text";
  content: string;
}

export interface ToolRefSegment {
  type: "tool_ref";
  tool: string;        // semantic name e.g. "shell_exec"
  raw: string;         // original e.g. "{{tool:shell_exec}}"
  line: number;
}

export interface ConditionalBlock {
  type: "conditional";
  capability: string;  // e.g. "subagents"
  body: Segment[];
  line: number;
}

export interface SkillAST {
  frontmatter: SkillFrontmatter;
  body: Segment[];
  sourcePath: string;
}

// --- Mapping types ---

export interface ToolMappings {
  tools: Record<string, Record<string, string | null>>;
  capabilities: Record<string, string[]>;
}

// --- Renderer types ---

export type TargetName = "claude_code" | "opencode" | "gemini" | "qwen" | "openclaw";

export interface RenderResult {
  content: string;
  filename: string;
  /** subdirectory for directory-based skills */
  dirname?: string;
}

export interface TranspileResult {
  skill: string;
  targets: Record<string, RenderResult | null>;
  warnings: string[];
  errors: string[];
}

export interface Renderer {
  target: TargetName;
  render(ast: SkillAST, mappings: ToolMappings): RenderResult;
}
