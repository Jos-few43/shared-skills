# Universal Skill Transpiler Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Node.js/TypeScript CLI that transpiles vendor-agnostic universal skills into native formats for Claude Code, OpenCode, Gemini CLI, Qwen Code, and OpenClaw.

**Architecture:** A pipeline of Parser → Resolver → Renderer. The parser tokenizes universal skill markdown (YAML frontmatter + body with `{{tool:X}}` and `{{#if supports:X}}` placeholders). The resolver maps semantic references to concrete tool names per target. Per-target renderers format the output into each tool's native skill format.

**Tech Stack:** Node.js, TypeScript, vitest for tests, yaml (npm) for frontmatter parsing, no template engine (custom tokenizer for `{{}}` syntax)

**Design doc:** `docs/plans/2026-02-22-universal-skill-transpiler-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `transpiler/package.json`
- Create: `transpiler/tsconfig.json`
- Create: `transpiler/src/types.ts`

**Step 1: Initialize the project**

```bash
cd ~/shared-skills && mkdir -p transpiler/src transpiler/tests
```

**Step 2: Create package.json**

Create `transpiler/package.json`:
```json
{
  "name": "skill-transpile",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "skill-transpile": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "transpile": "tsx src/index.ts"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  },
  "dependencies": {
    "yaml": "^2.7.0",
    "glob": "^11.0.0"
  }
}
```

**Step 3: Create tsconfig.json**

Create `transpiler/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests", "dist"]
}
```

**Step 4: Create types.ts**

Create `transpiler/src/types.ts` with all shared types:

```typescript
// --- Frontmatter types ---

export interface SkillFrontmatter {
  name: string;
  description: string;
  version?: string;
  triggers?: {
    slash_command?: string;
    auto_match?: boolean;
  };
  requires?: string[];
  optional?: string[];
  targets?: Record<string, TargetOverride>;
  targets_only?: string[];
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
```

**Step 5: Install dependencies**

```bash
cd ~/shared-skills/transpiler && npm install
```

**Step 6: Commit**

```bash
cd ~/shared-skills
git add transpiler/package.json transpiler/tsconfig.json transpiler/src/types.ts transpiler/package-lock.json
git commit -m "feat: scaffold transpiler project with types"
```

---

### Task 2: Parser — Tokenize Universal Format

**Files:**
- Create: `transpiler/src/parser.ts`
- Create: `transpiler/tests/parser.test.ts`

**Step 1: Write the failing tests**

Create `transpiler/tests/parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parse } from "../src/parser.js";

const SIMPLE_SKILL = `---
name: test-skill
description: A test skill
version: "1.0.0"
requires:
  - shell_exec
optional:
  - file_read
---

# Test Skill

Use {{tool:shell_exec}} to run commands.
`;

const CONDITIONAL_SKILL = `---
name: conditional-skill
description: Skill with conditionals
---

# Header

Some text.

{{#if supports:subagents}}
## Subagent Section

Use {{tool:subagent}} here.
{{/if}}

More text after.
`;

const NESTED_REFS = `---
name: multi-ref
description: Multiple refs
---

Use {{tool:file_read}} then {{tool:file_write}} on same line.
`;

describe("parser", () => {
  it("parses frontmatter correctly", () => {
    const ast = parse(SIMPLE_SKILL, "test.md");
    expect(ast.frontmatter.name).toBe("test-skill");
    expect(ast.frontmatter.description).toBe("A test skill");
    expect(ast.frontmatter.requires).toEqual(["shell_exec"]);
    expect(ast.frontmatter.optional).toEqual(["file_read"]);
    expect(ast.sourcePath).toBe("test.md");
  });

  it("tokenizes tool references", () => {
    const ast = parse(SIMPLE_SKILL, "test.md");
    const toolRefs = ast.body.filter((s) => s.type === "tool_ref");
    expect(toolRefs).toHaveLength(1);
    expect(toolRefs[0].type === "tool_ref" && toolRefs[0].tool).toBe("shell_exec");
  });

  it("tokenizes conditional blocks", () => {
    const ast = parse(CONDITIONAL_SKILL, "test.md");
    const conditionals = ast.body.filter((s) => s.type === "conditional");
    expect(conditionals).toHaveLength(1);
    if (conditionals[0].type === "conditional") {
      expect(conditionals[0].capability).toBe("subagents");
      const innerRefs = conditionals[0].body.filter((s) => s.type === "tool_ref");
      expect(innerRefs).toHaveLength(1);
    }
  });

  it("handles multiple tool refs on same line", () => {
    const ast = parse(NESTED_REFS, "test.md");
    const toolRefs = ast.body.filter((s) => s.type === "tool_ref");
    expect(toolRefs).toHaveLength(2);
  });

  it("throws on missing name", () => {
    const bad = `---\ndescription: no name\n---\nBody`;
    expect(() => parse(bad, "bad.md")).toThrow(/name/i);
  });

  it("throws on missing description", () => {
    const bad = `---\nname: foo\n---\nBody`;
    expect(() => parse(bad, "bad.md")).toThrow(/description/i);
  });

  it("throws on unclosed conditional", () => {
    const bad = `---\nname: x\ndescription: x\n---\n{{#if supports:foo}}\ntext`;
    expect(() => parse(bad, "bad.md")).toThrow(/unclosed/i);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/parser.test.ts
```
Expected: FAIL — `parser.ts` doesn't exist yet.

**Step 3: Implement parser**

Create `transpiler/src/parser.ts`:

```typescript
import YAML from "yaml";
import type { SkillAST, SkillFrontmatter, Segment, ToolRefSegment, ConditionalBlock, TextSegment } from "./types.js";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const TOOL_REF_RE = /\{\{tool:(\w+)\}\}/g;
const IF_OPEN_RE = /^\{\{#if supports:(\w+)\}\}\s*$/;
const IF_CLOSE_RE = /^\{\{\/if\}\}\s*$/;

export function parse(source: string, sourcePath: string): SkillAST {
  const fmMatch = source.match(FRONTMATTER_RE);
  if (!fmMatch) {
    throw new Error(`${sourcePath}: No YAML frontmatter found`);
  }

  const frontmatter = YAML.parse(fmMatch[1]) as SkillFrontmatter;
  if (!frontmatter.name) {
    throw new Error(`${sourcePath}: Missing required field 'name' in frontmatter`);
  }
  if (!frontmatter.description) {
    throw new Error(`${sourcePath}: Missing required field 'description' in frontmatter`);
  }

  const bodyText = fmMatch[2];
  const body = tokenizeBody(bodyText, sourcePath);

  return { frontmatter, body, sourcePath };
}

function tokenizeBody(text: string, sourcePath: string): Segment[] {
  const lines = text.split("\n");
  const segments: Segment[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const ifMatch = line.match(IF_OPEN_RE);

    if (ifMatch) {
      // Collect conditional block
      const capability = ifMatch[1];
      const startLine = i + 1;
      const innerLines: string[] = [];
      i++;
      let found = false;

      while (i < lines.length) {
        if (IF_CLOSE_RE.test(lines[i])) {
          found = true;
          i++;
          break;
        }
        innerLines.push(lines[i]);
        i++;
      }

      if (!found) {
        throw new Error(
          `${sourcePath}: Unclosed {{#if supports:${capability}}} block starting at line ${startLine}`
        );
      }

      const innerBody = tokenizeLine(innerLines.join("\n"), startLine);
      const conditional: ConditionalBlock = {
        type: "conditional",
        capability,
        body: innerBody,
        line: startLine,
      };
      segments.push(conditional);
    } else {
      // Regular line — tokenize for tool refs
      const lineSegments = tokenizeLine(line + "\n", i + 1);
      segments.push(...lineSegments);
      i++;
    }
  }

  return segments;
}

function tokenizeLine(text: string, lineNum: number): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TOOL_REF_RE)) {
    const before = text.slice(lastIndex, match.index);
    if (before) {
      segments.push({ type: "text", content: before });
    }
    const ref: ToolRefSegment = {
      type: "tool_ref",
      tool: match[1],
      raw: match[0],
      line: lineNum,
    };
    segments.push(ref);
    lastIndex = match.index + match[0].length;
  }

  const after = text.slice(lastIndex);
  if (after) {
    segments.push({ type: "text", content: after });
  }

  return segments;
}
```

**Step 4: Run tests to verify they pass**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/parser.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
cd ~/shared-skills
git add transpiler/src/parser.ts transpiler/tests/parser.test.ts
git commit -m "feat: implement parser for universal skill format"
```

---

### Task 3: Resolver — Map Tools and Evaluate Conditionals

**Files:**
- Create: `transpiler/src/resolver.ts`
- Create: `transpiler/tests/resolver.test.ts`

**Step 1: Write the failing tests**

Create `transpiler/tests/resolver.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolve } from "../src/resolver.js";
import type { SkillAST, ToolMappings, Segment } from "../src/types.js";

const MAPPINGS: ToolMappings = {
  tools: {
    shell_exec: { claude_code: "Bash", opencode: "shell", gemini: "run_shell_command", qwen: "run_shell_command", openclaw: "terminal" },
    subagent: { claude_code: "Task", opencode: null, gemini: null, qwen: "task", openclaw: "agent_spawn" },
    file_read: { claude_code: "Read", opencode: "read", gemini: "read_file", qwen: "read_file", openclaw: "file_viewer" },
  },
  capabilities: {
    shell_exec: ["claude_code", "opencode", "gemini", "qwen", "openclaw"],
    subagents: ["claude_code", "qwen", "openclaw"],
    file_read: ["claude_code", "opencode", "gemini", "qwen", "openclaw"],
  },
};

function makeAST(body: Segment[], overrides?: Partial<SkillAST["frontmatter"]>): SkillAST {
  return {
    frontmatter: { name: "test", description: "test", ...overrides },
    body,
    sourcePath: "test.md",
  };
}

describe("resolver", () => {
  it("resolves tool refs for claude_code", () => {
    const ast = makeAST([
      { type: "text", content: "Use " },
      { type: "tool_ref", tool: "shell_exec", raw: "{{tool:shell_exec}}", line: 1 },
      { type: "text", content: " here." },
    ]);
    const result = resolve(ast, "claude_code", MAPPINGS);
    expect(result.resolved).toEqual([
      { type: "text", content: "Use " },
      { type: "text", content: "Bash" },
      { type: "text", content: " here." },
    ]);
    expect(result.warnings).toHaveLength(0);
  });

  it("resolves null tool to empty string with warning", () => {
    const ast = makeAST([
      { type: "tool_ref", tool: "subagent", raw: "{{tool:subagent}}", line: 5 },
    ]);
    const result = resolve(ast, "opencode", MAPPINGS);
    expect(result.resolved).toEqual([{ type: "text", content: "" }]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/subagent.*line 5/);
  });

  it("includes conditional block when target supports capability", () => {
    const ast = makeAST([
      { type: "conditional", capability: "subagents", body: [{ type: "text", content: "inner" }], line: 1 },
    ]);
    const result = resolve(ast, "claude_code", MAPPINGS);
    expect(result.resolved).toEqual([{ type: "text", content: "inner" }]);
  });

  it("excludes conditional block when target lacks capability", () => {
    const ast = makeAST([
      { type: "conditional", capability: "subagents", body: [{ type: "text", content: "inner" }], line: 1 },
    ]);
    const result = resolve(ast, "opencode", MAPPINGS);
    expect(result.resolved).toEqual([]);
  });

  it("merges target-specific frontmatter overrides", () => {
    const ast = makeAST([], {
      targets: {
        claude_code: { description: "Claude-specific description" },
      },
    });
    const result = resolve(ast, "claude_code", MAPPINGS);
    expect(result.frontmatter.description).toBe("Claude-specific description");
  });

  it("skips skill when requires capability not supported", () => {
    const ast = makeAST([], { requires: ["subagents"] });
    const result = resolve(ast, "opencode", MAPPINGS);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toMatch(/subagents/);
  });

  it("errors on unknown tool reference", () => {
    const ast = makeAST([
      { type: "tool_ref", tool: "nonexistent", raw: "{{tool:nonexistent}}", line: 3 },
    ]);
    const result = resolve(ast, "claude_code", MAPPINGS);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/nonexistent/);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/resolver.test.ts
```
Expected: FAIL

**Step 3: Implement resolver**

Create `transpiler/src/resolver.ts`:

```typescript
import type {
  SkillAST, SkillFrontmatter, Segment, TextSegment,
  ToolMappings, TargetName,
} from "./types.js";

export interface ResolveResult {
  frontmatter: SkillFrontmatter;
  resolved: Segment[];
  warnings: string[];
  errors: string[];
  skipped: boolean;
  skipReason?: string;
}

export function resolve(
  ast: SkillAST,
  target: TargetName,
  mappings: ToolMappings
): ResolveResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check requires
  if (ast.frontmatter.requires) {
    for (const cap of ast.frontmatter.requires) {
      const supported = mappings.capabilities[cap] ?? [];
      if (!supported.includes(target)) {
        return {
          frontmatter: ast.frontmatter,
          resolved: [],
          warnings: [],
          errors: [],
          skipped: true,
          skipReason: `Target '${target}' does not support required capability '${cap}'`,
        };
      }
    }
  }

  // Check targets_only
  if (ast.frontmatter.targets_only && !ast.frontmatter.targets_only.includes(target)) {
    return {
      frontmatter: ast.frontmatter,
      resolved: [],
      warnings: [],
      errors: [],
      skipped: true,
      skipReason: `Skill restricted to targets: ${ast.frontmatter.targets_only.join(", ")}`,
    };
  }

  // Merge frontmatter overrides
  let frontmatter = { ...ast.frontmatter };
  const targetOverride = ast.frontmatter.targets?.[target];
  if (targetOverride) {
    frontmatter = { ...frontmatter, ...targetOverride };
  }

  // Resolve body segments
  const resolved = resolveSegments(ast.body, target, mappings, ast.sourcePath, warnings, errors);

  return { frontmatter, resolved, warnings, errors, skipped: false };
}

function resolveSegments(
  segments: Segment[],
  target: TargetName,
  mappings: ToolMappings,
  sourcePath: string,
  warnings: string[],
  errors: string[]
): Segment[] {
  const result: Segment[] = [];

  for (const seg of segments) {
    switch (seg.type) {
      case "text":
        result.push(seg);
        break;

      case "tool_ref": {
        const toolMap = mappings.tools[seg.tool];
        if (!toolMap) {
          errors.push(`${sourcePath}:${seg.line}: Unknown tool '${seg.tool}'`);
          result.push({ type: "text", content: seg.raw });
          break;
        }
        const concrete = toolMap[target];
        if (concrete === null || concrete === undefined) {
          warnings.push(
            `${sourcePath}:${seg.line}: '${seg.tool}' not supported by '${target}', replaced with empty string`
          );
          result.push({ type: "text", content: "" } as TextSegment);
        } else {
          result.push({ type: "text", content: concrete } as TextSegment);
        }
        break;
      }

      case "conditional": {
        const supported = mappings.capabilities[seg.capability] ?? [];
        if (supported.includes(target)) {
          const inner = resolveSegments(seg.body, target, mappings, sourcePath, warnings, errors);
          result.push(...inner);
        }
        // else: omit entire block
        break;
      }
    }
  }

  return result;
}
```

**Step 4: Run tests to verify they pass**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/resolver.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
cd ~/shared-skills
git add transpiler/src/resolver.ts transpiler/tests/resolver.test.ts
git commit -m "feat: implement resolver for tool mapping and conditionals"
```

---

### Task 4: Renderers — Per-Target Output Formatting

**Files:**
- Create: `transpiler/src/renderer.ts`
- Create: `transpiler/src/renderers/claude-code.ts`
- Create: `transpiler/src/renderers/opencode.ts`
- Create: `transpiler/src/renderers/gemini.ts`
- Create: `transpiler/src/renderers/qwen.ts`
- Create: `transpiler/src/renderers/openclaw.ts`
- Create: `transpiler/tests/renderers.test.ts`

**Step 1: Write the failing tests**

Create `transpiler/tests/renderers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ClaudeCodeRenderer } from "../src/renderers/claude-code.js";
import { OpenCodeRenderer } from "../src/renderers/opencode.js";
import { GeminiRenderer } from "../src/renderers/gemini.js";
import { QwenRenderer } from "../src/renderers/qwen.js";
import { OpenClawRenderer } from "../src/renderers/openclaw.js";
import type { SkillAST, ToolMappings, Segment } from "../src/types.js";

const MAPPINGS: ToolMappings = {
  tools: {
    shell_exec: { claude_code: "Bash", opencode: "shell", gemini: "run_shell_command", qwen: "run_shell_command", openclaw: "terminal" },
  },
  capabilities: {
    shell_exec: ["claude_code", "opencode", "gemini", "qwen", "openclaw"],
  },
};

// Pre-resolved AST (all segments are TextSegment after resolver)
function makeResolvedAST(content: string): SkillAST {
  return {
    frontmatter: { name: "test-skill", description: "A test skill" },
    body: [{ type: "text", content }],
    sourcePath: "test-skill.md",
  };
}

describe("ClaudeCodeRenderer", () => {
  it("renders YAML frontmatter + markdown body", () => {
    const renderer = new ClaudeCodeRenderer();
    const ast = makeResolvedAST("# Hello\n\nUse Bash to run.");
    const result = renderer.render(ast, MAPPINGS);
    expect(result.content).toContain("---");
    expect(result.content).toContain("name: test-skill");
    expect(result.content).toContain("# Hello");
    expect(result.filename).toBe("test-skill.md");
  });
});

describe("OpenCodeRenderer", () => {
  it("renders markdown skill format", () => {
    const renderer = new OpenCodeRenderer();
    const ast = makeResolvedAST("# Hello\n\nUse shell to run.");
    const result = renderer.render(ast, MAPPINGS);
    expect(result.content).toContain("# Hello");
    expect(result.filename).toBe("test-skill.md");
  });
});

describe("GeminiRenderer", () => {
  it("renders instruction markdown", () => {
    const renderer = new GeminiRenderer();
    const ast = makeResolvedAST("# Hello\n\nUse run_shell_command.");
    const result = renderer.render(ast, MAPPINGS);
    expect(result.content).toContain("# Hello");
    expect(result.filename).toBe("test-skill.md");
  });
});

describe("QwenRenderer", () => {
  it("renders instruction markdown", () => {
    const renderer = new QwenRenderer();
    const ast = makeResolvedAST("# Hello\n\nUse run_shell_command.");
    const result = renderer.render(ast, MAPPINGS);
    expect(result.content).toContain("# Hello");
    expect(result.filename).toBe("test-skill.md");
  });
});

describe("OpenClawRenderer", () => {
  it("renders SKILL.md in directory structure", () => {
    const renderer = new OpenClawRenderer();
    const ast = makeResolvedAST("# Hello\n\nUse terminal.");
    const result = renderer.render(ast, MAPPINGS);
    expect(result.content).toContain("# Hello");
    expect(result.filename).toBe("SKILL.md");
    expect(result.dirname).toBe("test-skill");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/renderers.test.ts
```
Expected: FAIL

**Step 3: Implement base renderer and all 5 renderers**

Create `transpiler/src/renderer.ts`:

```typescript
import type { SkillAST, ToolMappings, RenderResult, Segment, SkillFrontmatter } from "./types.js";

export function segmentsToString(segments: Segment[]): string {
  return segments.map((s) => {
    if (s.type === "text") return s.content;
    // After resolver, all segments should be text. This is a safety fallback.
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
```

Create `transpiler/src/renderers/claude-code.ts`:

```typescript
import type { SkillAST, ToolMappings, RenderResult, Renderer } from "../types.js";
import { segmentsToString, renderFrontmatter } from "../renderer.js";

export class ClaudeCodeRenderer implements Renderer {
  target = "claude_code" as const;

  render(ast: SkillAST, _mappings: ToolMappings): RenderResult {
    const fm = renderFrontmatter(ast.frontmatter);
    const body = segmentsToString(ast.body);
    return {
      content: fm + "\n\n" + body,
      filename: `${ast.frontmatter.name}.md`,
    };
  }
}
```

Create `transpiler/src/renderers/opencode.ts`:

```typescript
import type { SkillAST, ToolMappings, RenderResult, Renderer } from "../types.js";
import { segmentsToString, renderFrontmatter } from "../renderer.js";

export class OpenCodeRenderer implements Renderer {
  target = "opencode" as const;

  render(ast: SkillAST, _mappings: ToolMappings): RenderResult {
    const fm = renderFrontmatter(ast.frontmatter);
    const body = segmentsToString(ast.body);
    return {
      content: fm + "\n\n" + body,
      filename: `${ast.frontmatter.name}.md`,
    };
  }
}
```

Create `transpiler/src/renderers/gemini.ts`:

```typescript
import type { SkillAST, ToolMappings, RenderResult, Renderer } from "../types.js";
import { segmentsToString, renderFrontmatter } from "../renderer.js";

export class GeminiRenderer implements Renderer {
  target = "gemini" as const;

  render(ast: SkillAST, _mappings: ToolMappings): RenderResult {
    const fm = renderFrontmatter(ast.frontmatter);
    const body = segmentsToString(ast.body);
    return {
      content: fm + "\n\n" + body,
      filename: `${ast.frontmatter.name}.md`,
    };
  }
}
```

Create `transpiler/src/renderers/qwen.ts`:

```typescript
import type { SkillAST, ToolMappings, RenderResult, Renderer } from "../types.js";
import { segmentsToString, renderFrontmatter } from "../renderer.js";

export class QwenRenderer implements Renderer {
  target = "qwen" as const;

  render(ast: SkillAST, _mappings: ToolMappings): RenderResult {
    const fm = renderFrontmatter(ast.frontmatter);
    const body = segmentsToString(ast.body);
    return {
      content: fm + "\n\n" + body,
      filename: `${ast.frontmatter.name}.md`,
    };
  }
}
```

Create `transpiler/src/renderers/openclaw.ts`:

```typescript
import type { SkillAST, ToolMappings, RenderResult, Renderer } from "../types.js";
import { segmentsToString, renderFrontmatter } from "../renderer.js";

export class OpenClawRenderer implements Renderer {
  target = "openclaw" as const;

  render(ast: SkillAST, _mappings: ToolMappings): RenderResult {
    const fm = renderFrontmatter(ast.frontmatter);
    const body = segmentsToString(ast.body);
    return {
      content: fm + "\n\n" + body,
      filename: "SKILL.md",
      dirname: ast.frontmatter.name,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/renderers.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
cd ~/shared-skills
git add transpiler/src/renderer.ts transpiler/src/renderers/ transpiler/tests/renderers.test.ts
git commit -m "feat: implement per-target renderers for all 5 tools"
```

---

### Task 5: CLI Entry Point and Config Loading

**Files:**
- Create: `transpiler/src/index.ts`
- Create: `config/tool-mappings.yaml`
- Create: `transpiler/tests/index.test.ts`

**Step 1: Create the tool-mappings config**

Create `config/tool-mappings.yaml`:

```yaml
tools:
  shell_exec:
    claude_code: "Bash"
    opencode: "shell"
    gemini: "run_shell_command"
    qwen: "run_shell_command"
    openclaw: "terminal"

  file_read:
    claude_code: "Read"
    opencode: "read"
    gemini: "read_file"
    qwen: "read_file"
    openclaw: "file_viewer"

  file_write:
    claude_code: "Write"
    opencode: "write"
    gemini: "write_file"
    qwen: "write_file"
    openclaw: "file_editor"

  file_edit:
    claude_code: "Edit"
    opencode: "edit"
    gemini: "replace"
    qwen: "edit"
    openclaw: "file_editor"

  file_search:
    claude_code: "Glob"
    opencode: "glob"
    gemini: "glob"
    qwen: "glob"
    openclaw: "file_search"

  content_search:
    claude_code: "Grep"
    opencode: "grep"
    gemini: "grep_search"
    qwen: "grep_search"
    openclaw: "search"

  list_dir:
    claude_code: ~
    opencode: "ls"
    gemini: "list_directory"
    qwen: "list_directory"
    openclaw: "file_browser"

  subagent:
    claude_code: "Task"
    opencode: ~
    gemini: ~
    qwen: "task"
    openclaw: "agent_spawn"

  ask_user:
    claude_code: "AskUserQuestion"
    opencode: "input"
    gemini: ~
    qwen: ~
    openclaw: "user_prompt"

  web_fetch:
    claude_code: "WebFetch"
    opencode: ~
    gemini: "web_fetch"
    qwen: "web_fetch"
    openclaw: ~

  web_search:
    claude_code: "WebSearch"
    opencode: ~
    gemini: "google_web_search"
    qwen: "web_search"
    openclaw: ~

capabilities:
  shell_exec:     [claude_code, opencode, gemini, qwen, openclaw]
  file_read:      [claude_code, opencode, gemini, qwen, openclaw]
  file_write:     [claude_code, opencode, gemini, qwen, openclaw]
  file_edit:      [claude_code, opencode, gemini, qwen, openclaw]
  file_search:    [claude_code, opencode, gemini, qwen, openclaw]
  content_search: [claude_code, opencode, gemini, qwen, openclaw]
  list_dir:       [opencode, gemini, qwen, openclaw]
  subagents:      [claude_code, qwen, openclaw]
  ask_user:       [claude_code, opencode, openclaw]
  web_fetch:      [claude_code, gemini, qwen]
  web_search:     [claude_code, gemini, qwen]
  hooks:          [claude_code]
  mcp_servers:    [claude_code, opencode]
```

**Step 2: Write the failing test for CLI**

Create `transpiler/tests/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadMappings, discoverSkills, transpileSkill } from "../src/index.js";
import path from "path";

describe("loadMappings", () => {
  it("loads tool-mappings.yaml", () => {
    const mappings = loadMappings(path.resolve(__dirname, "../../config/tool-mappings.yaml"));
    expect(mappings.tools.shell_exec.claude_code).toBe("Bash");
    expect(mappings.tools.subagent.opencode).toBeNull();
    expect(mappings.capabilities.shell_exec).toContain("claude_code");
  });
});

describe("discoverSkills", () => {
  it("finds .md files and SKILL.md directories in source/", () => {
    const skills = discoverSkills(path.resolve(__dirname, "../../source"));
    expect(skills.length).toBeGreaterThan(0);
    // Every path should end in .md
    for (const s of skills) {
      expect(s).toMatch(/\.md$/);
    }
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/index.test.ts
```
Expected: FAIL

**Step 4: Implement CLI entry point**

Create `transpiler/src/index.ts`:

```typescript
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { glob } from "glob";
import { parse } from "./parser.js";
import { resolve } from "./resolver.js";
import { segmentsToString } from "./renderer.js";
import { ClaudeCodeRenderer } from "./renderers/claude-code.js";
import { OpenCodeRenderer } from "./renderers/opencode.js";
import { GeminiRenderer } from "./renderers/gemini.js";
import { QwenRenderer } from "./renderers/qwen.js";
import { OpenClawRenderer } from "./renderers/openclaw.js";
import type { ToolMappings, TargetName, Renderer, TranspileResult } from "./types.js";

const ALL_TARGETS: TargetName[] = ["claude_code", "opencode", "gemini", "qwen", "openclaw"];

const RENDERERS: Record<TargetName, Renderer> = {
  claude_code: new ClaudeCodeRenderer(),
  opencode: new OpenCodeRenderer(),
  gemini: new GeminiRenderer(),
  qwen: new QwenRenderer(),
  openclaw: new OpenClawRenderer(),
};

export function loadMappings(configPath: string): ToolMappings {
  const raw = fs.readFileSync(configPath, "utf-8");
  return YAML.parse(raw) as ToolMappings;
}

export function discoverSkills(sourceDir: string): string[] {
  const flat = glob.sync("*.md", { cwd: sourceDir, absolute: true });
  const nested = glob.sync("*/SKILL.md", { cwd: sourceDir, absolute: true });
  return [...flat, ...nested].sort();
}

export function transpileSkill(
  skillPath: string,
  mappings: ToolMappings,
  targets: TargetName[] = ALL_TARGETS
): TranspileResult {
  const source = fs.readFileSync(skillPath, "utf-8");
  const ast = parse(source, skillPath);
  const allWarnings: string[] = [];
  const allErrors: string[] = [];
  const results: Record<string, ReturnType<Renderer["render"]> | null> = {};

  for (const target of targets) {
    const resolved = resolve(ast, target, mappings);
    allWarnings.push(...resolved.warnings);
    allErrors.push(...resolved.errors);

    if (resolved.skipped) {
      results[target] = null;
      continue;
    }

    const resolvedAST = { ...ast, frontmatter: resolved.frontmatter, body: resolved.resolved };
    const renderer = RENDERERS[target];
    results[target] = renderer.render(resolvedAST, mappings);
  }

  return {
    skill: ast.frontmatter.name,
    targets: results,
    warnings: allWarnings,
    errors: allErrors,
  };
}

function writeOutput(distDir: string, target: TargetName, result: ReturnType<Renderer["render"]>): void {
  const targetDir = path.join(distDir, target.replace("_", "-"));
  if (result.dirname) {
    const dir = path.join(targetDir, result.dirname);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, result.filename), result.content);
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, result.filename), result.content);
  }
}

// CLI
function main(): void {
  const args = process.argv.slice(2);
  const validate = args.includes("--validate");
  const targetFlag = args.indexOf("--target");
  const skillFlag = args.indexOf("--skill");

  const rootDir = path.resolve(import.meta.dirname ?? __dirname, "../..");
  const configPath = path.join(rootDir, "config", "tool-mappings.yaml");
  const sourceDir = path.join(rootDir, "source");
  const distDir = path.join(rootDir, "dist");

  const mappings = loadMappings(configPath);

  const targets: TargetName[] = targetFlag >= 0
    ? [args[targetFlag + 1] as TargetName]
    : ALL_TARGETS;

  const skillPaths = skillFlag >= 0
    ? [path.resolve(sourceDir, args[skillFlag + 1])]
    : discoverSkills(sourceDir);

  let totalWarnings = 0;
  let totalErrors = 0;
  let totalTranspiled = 0;

  for (const skillPath of skillPaths) {
    try {
      const result = transpileSkill(skillPath, mappings, targets);
      const targetNames: string[] = [];
      const skippedNames: string[] = [];

      for (const target of targets) {
        const output = result.targets[target];
        if (output) {
          if (!validate) {
            writeOutput(distDir, target, output);
          }
          targetNames.push(target);
        } else {
          skippedNames.push(target);
        }
      }

      const icon = result.errors.length > 0 ? "\u2717" : result.warnings.length > 0 ? "\u26A0" : "\u2713";
      const targetList = targetNames.join(", ") || "none";
      console.log(`  ${icon} ${result.skill} \u2192 ${targetList}`);

      if (skippedNames.length > 0) {
        console.log(`    skipped: ${skippedNames.join(", ")}`);
      }

      for (const w of result.warnings) console.log(`    warn: ${w}`);
      for (const e of result.errors) console.log(`    error: ${e}`);

      totalWarnings += result.warnings.length;
      totalErrors += result.errors.length;
      totalTranspiled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  \u2717 ${path.basename(skillPath)} \u2192 error: ${msg}`);
      totalErrors++;
    }
  }

  console.log("");
  console.log(`  ${totalTranspiled}/${skillPaths.length} skills transpiled, ${totalWarnings} warnings, ${totalErrors} errors`);

  if (totalErrors > 0) process.exit(1);
}

// Only run CLI when executed directly (not imported in tests)
const isDirectRun = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isDirectRun) {
  main();
}
```

**Step 5: Run tests to verify they pass**

```bash
cd ~/shared-skills/transpiler && npx vitest run tests/index.test.ts
```
Expected: ALL PASS

**Step 6: Commit**

```bash
cd ~/shared-skills
git add transpiler/src/index.ts config/tool-mappings.yaml transpiler/tests/index.test.ts
git commit -m "feat: implement CLI entry point with config loading and skill discovery"
```

---

### Task 6: Integration Test — End-to-End Transpile

**Files:**
- Create: `transpiler/tests/e2e.test.ts`
- Create: `transpiler/tests/fixtures/sample-skill.md`

**Step 1: Create test fixture**

Create `transpiler/tests/fixtures/sample-skill.md`:

```markdown
---
name: sample-skill
description: A sample skill for testing the transpiler end-to-end.
version: "1.0.0"
requires:
  - shell_exec
optional:
  - subagents
  - file_read
---

# Sample Skill

Run commands with {{tool:shell_exec}}.

Read files with {{tool:file_read}}.

{{#if supports:subagents}}
## Parallel Tasks

Use {{tool:subagent}} for parallel work.
{{/if}}

## Always Included

This section has no conditionals.
```

**Step 2: Write the e2e test**

Create `transpiler/tests/e2e.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "path";
import { loadMappings, transpileSkill } from "../src/index.js";

const CONFIG = path.resolve(__dirname, "../../config/tool-mappings.yaml");
const FIXTURE = path.resolve(__dirname, "fixtures/sample-skill.md");

describe("end-to-end transpile", () => {
  const mappings = loadMappings(CONFIG);

  it("transpiles for claude_code with all sections", () => {
    const result = transpileSkill(FIXTURE, mappings, ["claude_code"]);
    const output = result.targets.claude_code!;
    expect(output).not.toBeNull();
    expect(output.content).toContain("Bash");
    expect(output.content).toContain("Read");
    expect(output.content).toContain("Task");
    expect(output.content).toContain("## Parallel Tasks");
    expect(result.warnings).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("transpiles for opencode without subagent section", () => {
    const result = transpileSkill(FIXTURE, mappings, ["opencode"]);
    const output = result.targets.opencode!;
    expect(output).not.toBeNull();
    expect(output.content).toContain("shell");
    expect(output.content).toContain("read");
    expect(output.content).not.toContain("## Parallel Tasks");
    expect(output.content).toContain("## Always Included");
  });

  it("transpiles for qwen with subagent section", () => {
    const result = transpileSkill(FIXTURE, mappings, ["qwen"]);
    const output = result.targets.qwen!;
    expect(output).not.toBeNull();
    expect(output.content).toContain("run_shell_command");
    expect(output.content).toContain("task");
    expect(output.content).toContain("## Parallel Tasks");
  });

  it("transpiles for gemini without subagent section", () => {
    const result = transpileSkill(FIXTURE, mappings, ["gemini"]);
    const output = result.targets.gemini!;
    expect(output).not.toBeNull();
    expect(output.content).toContain("run_shell_command");
    expect(output.content).not.toContain("## Parallel Tasks");
  });

  it("transpiles for openclaw with directory structure", () => {
    const result = transpileSkill(FIXTURE, mappings, ["openclaw"]);
    const output = result.targets.openclaw!;
    expect(output).not.toBeNull();
    expect(output.filename).toBe("SKILL.md");
    expect(output.dirname).toBe("sample-skill");
    expect(output.content).toContain("terminal");
    expect(output.content).toContain("## Parallel Tasks");
  });
});
```

**Step 3: Run tests**

```bash
cd ~/shared-skills/transpiler && npx vitest run
```
Expected: ALL PASS across all test files

**Step 4: Commit**

```bash
cd ~/shared-skills
git add transpiler/tests/e2e.test.ts transpiler/tests/fixtures/
git commit -m "test: add end-to-end transpiler integration tests"
```

---

### Task 7: Update Sync Script

**Files:**
- Modify: `scripts/symlink-all.sh`

**Step 1: Read current script**

Read `~/shared-skills/scripts/symlink-all.sh` to understand current structure.

**Step 2: Update script to run transpiler first, then symlink from dist/**

Modify `scripts/symlink-all.sh` to:
1. Run the transpiler before symlinking
2. Symlink from `dist/<target>/` instead of `source/`
3. Keep OpenClaw copy logic but source from `dist/openclaw/`
4. Add a `--skip-transpile` flag for when you just want to re-link without rebuilding

Key changes:
```bash
# At top of script, after set -euo pipefail:
SKIP_TRANSPILE=false
if [[ "${1:-}" == "--skip-transpile" ]]; then
  SKIP_TRANSPILE=true
fi

# Before symlinking:
if [ "$SKIP_TRANSPILE" = false ]; then
  echo "Transpiling skills..."
  TRANSPILER="$SCRIPT_DIR/../transpiler"
  if [ -d "$TRANSPILER/node_modules" ]; then
    (cd "$TRANSPILER" && npx tsx src/index.ts)
  else
    echo "  Warning: transpiler not installed, run 'cd transpiler && npm install' first"
    echo "  Falling back to source/ directory"
    # Fall back to old behavior
  fi
  echo ""
fi

# Change source for symlinks:
DIST="$(cd "$(dirname "${BASH_SOURCE[0]}")/../dist" && pwd)"

# link_skills uses $DIST/claude-code, $DIST/opencode, etc.
link_skills "$HOME/.claude/plugins/skills"        "$DIST/claude-code"  "Claude Code"
link_skills "$HOME/opt-ai-agents/opencode/skills" "$DIST/opencode"     "OpenCode"
```

**Step 3: Test the updated script**

```bash
bash ~/shared-skills/scripts/symlink-all.sh
```
Expected: Transpiler runs, dist/ populated, symlinks created from dist/.

**Step 4: Commit**

```bash
cd ~/shared-skills
git add scripts/symlink-all.sh
git commit -m "feat: update sync script to transpile before symlinking"
```

---

### Task 8: Migrate One Existing Skill as Proof of Concept

**Files:**
- Modify: `source/non-interactive-shell.md`

**Step 1: Read the current skill**

Read `~/shared-skills/source/non-interactive-shell.md`.

**Step 2: Convert to universal format**

This skill is mostly tables and text with no tool references — it's the simplest migration. Add the universal frontmatter fields (`version`, `requires`, `optional`) and wrap any tool-specific content in conditionals. The skill already has valid `name` and `description` frontmatter.

Changes:
- Add `version: "1.0.0"` and `requires: [shell_exec]` to frontmatter
- Replace any bare references to tool names with `{{tool:X}}` syntax (if any exist)
- This skill is mostly tool-agnostic content, so minimal changes needed

**Step 3: Run transpiler on just this skill**

```bash
cd ~/shared-skills/transpiler && npx tsx src/index.ts --skill non-interactive-shell.md
```
Expected: Transpiles to all 5 targets with no errors.

**Step 4: Verify output**

Check `dist/claude-code/non-interactive-shell.md` and `dist/opencode/non-interactive-shell.md` look correct.

**Step 5: Commit**

```bash
cd ~/shared-skills
git add source/non-interactive-shell.md
git commit -m "feat: migrate non-interactive-shell to universal skill format"
```

---

### Task 9: Add .gitignore for dist/ and Final Cleanup

**Files:**
- Modify: `.gitignore` (create if needed)

**Step 1: Add gitignore**

Add to `~/shared-skills/.gitignore`:
```
dist/
transpiler/node_modules/
transpiler/dist/
```

**Step 2: Run full test suite**

```bash
cd ~/shared-skills/transpiler && npx vitest run
```
Expected: ALL PASS

**Step 3: Run full sync**

```bash
bash ~/shared-skills/scripts/symlink-all.sh
```
Expected: All skills transpiled, symlinked, OpenClaw staging populated.

**Step 4: Commit**

```bash
cd ~/shared-skills
git add .gitignore
git commit -m "chore: add gitignore for transpiler build artifacts"
```

---

Plan complete and saved to `docs/plans/2026-02-22-universal-skill-transpiler-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints

Which approach?