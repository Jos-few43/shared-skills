import { describe, it, expect } from "vitest";
import { auditSkill } from "../src/audit.js";

describe("audit", () => {
  it("detects hardcoded Claude tool names", () => {
    const source = `---
name: test-skill
description: A test skill
---

Use the Bash tool to run commands.
Use the Read tool to view files.
`;
    const report = auditSkill(source, "test-skill.md");
    expect(report.hardcodedTools).toContain("Bash");
    expect(report.hardcodedTools).toContain("Read");
  });

  it("suggests requires for shell-heavy skills", () => {
    const source = `---
name: shell-skill
description: Runs shell commands
---

Run this command:
\`\`\`bash
docker ps
\`\`\`
`;
    const report = auditSkill(source, "shell-skill.md");
    expect(report.suggestedRequires).toContain("shell_exec");
  });

  it("reports clean for well-formed skills", () => {
    const source = `---
name: clean-skill
description: Already good
requires:
  - shell_exec
---

Run commands with {{tool:shell_exec}}.
`;
    const report = auditSkill(source, "clean-skill.md");
    expect(report.hardcodedTools).toHaveLength(0);
    expect(report.suggestedRequires).toHaveLength(0);
  });

  it("ignores tool names inside code blocks", () => {
    const source = `---
name: code-skill
description: Has code examples
---

Example output:
\`\`\`
Bash: command executed
Read: file opened
\`\`\`
`;
    const report = auditSkill(source, "code-skill.md");
    expect(report.hardcodedTools).toHaveLength(0);
  });

  it("does not suggest requires already declared", () => {
    const source = `---
name: declared-skill
description: Already has requires
requires:
  - shell_exec
---

\`\`\`bash
echo hello
\`\`\`
`;
    const report = auditSkill(source, "declared-skill.md");
    expect(report.suggestedRequires).not.toContain("shell_exec");
  });
});
