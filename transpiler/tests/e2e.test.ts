import { describe, it, expect } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { loadMappings, transpileSkill } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.resolve(__dirname, "../../config/tool-mappings.yaml");
const FIXTURE = path.resolve(__dirname, "fixtures/sample-skill/SKILL.md");

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
