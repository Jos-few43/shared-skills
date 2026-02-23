import { describe, it, expect } from "vitest";
import { ClaudeCodeRenderer } from "../src/renderers/claude-code.js";
import { OpenCodeRenderer } from "../src/renderers/opencode.js";
import { GeminiRenderer } from "../src/renderers/gemini.js";
import { QwenRenderer } from "../src/renderers/qwen.js";
import { OpenClawRenderer } from "../src/renderers/openclaw.js";
import type { SkillAST, ToolMappings } from "../src/types.js";

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
