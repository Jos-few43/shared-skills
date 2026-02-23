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
