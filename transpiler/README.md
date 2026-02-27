# skill-transpile

Convert universal AI skill definitions to target-specific formats for Claude Code, OpenCode, Gemini, Qwen, and OpenClaw.

## Install

```bash
npm install -g skill-transpile
```

Or use without installing:

```bash
npx skill-transpile
```

## Universal Skill Format

Skills are written once in Markdown with YAML frontmatter, then transpiled to each target's native format.

```markdown
---
name: my-skill
description: Use when you need to do X.
requires:
  - shell_exec
  - file_read
targets:
  - claude_code
  - opencode
  - gemini
  - qwen
  - openclaw
---

# My Skill

Run the command with {{tool:shell_exec}}, then read the output file with {{tool:file_read}}.

{{#if claude_code}}
Claude Code specific instructions here.
{{/if}}
```

### Frontmatter Fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Skill identifier (kebab-case) |
| `description` | Yes | One-line description shown in skill pickers |
| `requires` | No | List of tool capabilities needed (used for target filtering) |
| `targets` | No | Explicit list of targets to transpile for (defaults to all) |
| `version` | No | Skill version string |
| `author` | No | Skill author |
| `tags` | No | List of tags for categorization |

## Tool Mappings

Use `{{tool:CAPABILITY}}` in skill prose. Each capability maps to the target's native tool name:

| Capability | claude_code | opencode | gemini | qwen | openclaw |
|---|---|---|---|---|---|
| `shell_exec` | `Bash` | `shell` | `run_shell_command` | `run_shell_command` | `terminal` |
| `file_read` | `Read` | `read` | `read_file` | `read_file` | `file_viewer` |
| `file_write` | `Write` | `write` | `write_file` | `write_file` | `file_editor` |
| `file_edit` | `Edit` | `edit` | `replace` | `edit` | `file_editor` |
| `file_search` | `Glob` | `glob` | `glob` | `glob` | `file_search` |
| `content_search` | `Grep` | `grep` | `grep_search` | `grep_search` | `search` |
| `list_dir` | _(none)_ | `ls` | `list_directory` | `list_directory` | `file_browser` |
| `subagent` | `Task` | _(none)_ | _(none)_ | `task` | `agent_spawn` |
| `ask_user` | `AskUserQuestion` | `input` | _(none)_ | _(none)_ | `user_prompt` |
| `web_fetch` | `WebFetch` | _(none)_ | `web_fetch` | `web_fetch` | _(none)_ |
| `web_search` | `WebSearch` | _(none)_ | `google_web_search` | `web_search` | _(none)_ |

When a capability is `_(none)_` for a target, the `{{tool:X}}` reference is removed from that target's output. If a skill declares a `requires` entry that is unsupported by a target, the skill is skipped for that target.

## CLI Usage

```bash
# Transpile all skills to dist/
skill-transpile

# Validate without writing output
skill-transpile --validate

# Transpile a single skill
skill-transpile --skill my-skill.md

# Transpile to a single target
skill-transpile --target claude_code

# Audit skills for hardcoded tool names and missing requires
skill-transpile --audit
```

### Options

| Flag | Description |
|---|---|
| _(none)_ | Transpile all skills in `source/` to `dist/` |
| `--validate` | Dry-run — parse and resolve all skills without writing files |
| `--audit` | Report skills with hardcoded tool names or missing `requires` |
| `--skill <file>` | Transpile a single skill file |
| `--target <name>` | Transpile to one target only (`claude_code`, `opencode`, `gemini`, `qwen`, `openclaw`) |

## Conditional Blocks

Use Handlebars-style conditionals to include target-specific content:

```markdown
{{#if claude_code}}
This section only appears in Claude Code output.
{{/if}}

{{#if opencode}}
This section only appears in OpenCode output.
{{/if}}
```

Supported target names: `claude_code`, `opencode`, `gemini`, `qwen`, `openclaw`.

## Output Structure

Transpiled skills are written to `dist/` organized by target:

```
dist/
├── claude-code/       # Claude Code .md skill files
├── opencode/          # OpenCode .md skill files
├── gemini/            # Gemini .md skill files
├── qwen/              # Qwen .md skill files
└── openclaw/          # OpenClaw .md skill files
```

## Programmatic API

```typescript
import { transpileSkill, loadMappings, discoverSkills, auditAllSkills } from "skill-transpile";

const mappings = loadMappings("config/tool-mappings.yaml");
const skillPaths = discoverSkills("source/");

for (const skillPath of skillPaths) {
  const result = transpileSkill(skillPath, mappings);
  console.log(result.skill, result.targets);
}

// Audit all skills
const reports = auditAllSkills("source/");
const flagged = reports.filter(r => r.hardcodedTools.length > 0 || r.suggestedRequires.length > 0);
```

## License

MIT — see [LICENSE](./LICENSE).
