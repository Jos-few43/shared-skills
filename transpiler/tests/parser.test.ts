import { describe, it, expect } from "vitest";
import { parse } from "../src/parser.js";
import type { Segment } from "../src/types.js";

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
    const toolRefs = ast.body.filter((s: Segment) => s.type === "tool_ref");
    expect(toolRefs).toHaveLength(1);
    expect(toolRefs[0].type === "tool_ref" && toolRefs[0].tool).toBe("shell_exec");
  });

  it("tokenizes conditional blocks", () => {
    const ast = parse(CONDITIONAL_SKILL, "test.md");
    const conditionals = ast.body.filter((s: Segment) => s.type === "conditional");
    expect(conditionals).toHaveLength(1);
    if (conditionals[0].type === "conditional") {
      expect(conditionals[0].capability).toBe("subagents");
      const innerRefs = conditionals[0].body.filter((s: Segment) => s.type === "tool_ref");
      expect(innerRefs).toHaveLength(1);
    }
  });

  it("handles multiple tool refs on same line", () => {
    const ast = parse(NESTED_REFS, "test.md");
    const toolRefs = ast.body.filter((s: Segment) => s.type === "tool_ref");
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
