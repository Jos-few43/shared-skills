import { describe, it, expect } from "vitest";
import { loadMappings, discoverSkills } from "../src/index.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    for (const s of skills) {
      expect(s).toMatch(/\.md$/);
    }
  });
});
