# Shared Commands — Universal Command Standard

**Date:** 2026-02-24
**Status:** Design approved
**Repo:** `~/shared-commands/` (new, separate from shared-skills)

## Problem

Commands (slash commands, user-invocable prompts) are tool-specific. A `/commit` command written for Claude Code doesn't work in OpenCode, Gemini, Qwen, or OpenClaw. Each tool has different frontmatter fields, shell injection syntax, and capability sets. We need a universal command format that transpiles to native formats per target — the same pattern as shared-skills, but for commands.

## Approach: Hybrid (Best of All Worlds)

| Quality | How |
|---------|-----|
| Independent repo | Separate `~/shared-commands/` with own transpiler |
| No config duplication | `tool-mappings.yaml` symlinked from shared-skills |
| Extensible transpiler | Same parser-resolver-renderer pipeline, extended for commands |
| Future merge path | Identical structure enables mechanical merge later |

## Directory Structure

```
~/shared-commands/
├── source/                         # Universal command format
│   ├── commit.md                   # Flat command
│   └── deploy/COMMAND.md           # Directory-based command
├── dist/                           # Transpiled per-target output
│   ├── claude-code/
│   ├── opencode/
│   ├── gemini/
│   ├── qwen/
│   └── openclaw/
├── transpiler/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # CLI entry
│       ├── types.ts                # CommandAST, CommandFrontmatter
│       ├── parser.ts               # Command-specific parsing
│       ├── resolver.ts             # Tool refs + command feature resolution
│       ├── renderer.ts             # Base rendering utilities
│       └── renderers/
│           ├── claude-code.ts
│           ├── opencode.ts
│           ├── gemini.ts
│           ├── qwen.ts
│           └── openclaw.ts
├── config/
│   └── tool-mappings.yaml          # Symlink to shared-skills/config/tool-mappings.yaml
├── scripts/
│   └── symlink-all.sh
├── docs/plans/
└── README.md
```

## Universal Command Format

### Frontmatter

```yaml
---
name: commit
description: Create a git commit
version: 1.0.0

# Command-specific fields
argument_hint: "<message>"
allowed_tools:
  - shell_exec(git add:*)
  - shell_exec(git commit:*)
  - shell_exec(git status:*)
disable_model_invocation: false

# Capability requirements (same as skills)
requires: [shell_exec]
optional: [file_read]

# Per-target overrides
targets:
  openclaw:
    category: "workflow"
  claude_code:
    description: "Extended Claude-specific description"
---
```

### Command-Specific Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `argument_hint` | string | Hint for command arguments (e.g., `<message>`) |
| `allowed_tools` | string[] | Tool whitelist using semantic names |
| `disable_model_invocation` | bool | Prevents model from being invoked (passthrough only) |

### Body Syntax

Commands extend the skill body syntax with these additions:

#### Context Injection: `{{context_inject:command}}`

Gathers live context before the command runs:

```markdown
## Context

- Git status: {{context_inject:git status}}
- Current diff: {{context_inject:git diff HEAD}}
- Branch: {{context_inject:git branch --show-current}}
```

**Transpilation per target:**

| Target | Output |
|--------|--------|
| Claude Code | Shell injection backtick syntax |
| OpenCode | Shell injection backtick syntax |
| Gemini | Manual instruction to run command |
| Qwen | Manual instruction to run command |
| OpenClaw | Terminal pre-exec syntax |

#### Command Instruction Block

Wraps the main instruction in tool-specific tags using conditional blocks:

```markdown
{{#if supports:command_instruction}}
<command-instruction>
{{/if}}

Based on the above context, create a single git commit.
Use {{tool:shell_exec}} to stage and commit.

{{#if supports:command_instruction}}
</command-instruction>
{{/if}}
```

### Allowed Tools Transpilation

Semantic `allowed_tools` entries use the same tool mapping as body references:

```yaml
allowed_tools:
  - shell_exec(git add:*)
  - shell_exec(git commit:*)
```

| Target | Output |
|--------|--------|
| Claude Code | `allowed-tools: Bash(git add:*), Bash(git commit:*)` |
| OpenCode | `allowed-tools: shell(git add:*), shell(git commit:*)` |
| Gemini | Dropped (replaced with instruction text) |
| Qwen | Dropped (replaced with instruction text) |
| OpenClaw | `constraints: [terminal(git add:*), terminal(git commit:*)]` |

## Graceful Degradation Matrix

| Feature | Claude Code | OpenCode | Gemini | Qwen | OpenClaw |
|---------|-------------|----------|--------|------|----------|
| `allowed_tools` | Native frontmatter | Native frontmatter | Instruction text | Instruction text | Action constraints |
| `argument_hint` | Native frontmatter | Native frontmatter | Dropped | Dropped | Dropped |
| `context_inject` | Shell injection | Shell injection | "Run first:" text | "Run first:" text | Terminal pre-exec |
| `command_instruction` | XML tags | XML tags | Plain markdown | Plain markdown | Plain markdown |
| `disable_model_invocation` | Native support | Native support | Dropped | Dropped | Dropped |
| `{{tool:X}}` | Resolved | Resolved | Resolved | Resolved | Resolved |
| `{{#if supports:X}}` | Evaluated | Evaluated | Evaluated | Evaluated | Evaluated |

## Target Output Locations

| Target | Command Path | Format |
|--------|-------------|--------|
| Claude Code | `~/.claude/commands/` | `.md` with YAML frontmatter |
| OpenCode | `~/opt-ai-agents/opencode/.opencode/command/` | `.md` with YAML frontmatter |
| Gemini | `~/.config/gemini-cli/commands/` | `.md` prompt template |
| Qwen | `~/.config/qwen-code/commands/` | `.md` prompt template |
| OpenClaw | Staged then container copy | `.md` action template |

## Symlink Script

Same pattern as shared-skills:

1. Run transpiler (if `transpiler/node_modules` exists)
2. If transpiler succeeds: symlink from `dist/`
3. If transpiler fails: fallback to symlinking `source/` directly
4. OpenClaw: stage at `~/opt-openclaw-commands/`, copy into container

## CLI Interface

Identical to shared-skills transpiler:

```bash
# Transpile all commands for all targets
npx tsx transpiler/src/index.ts

# Transpile specific command
npx tsx transpiler/src/index.ts --command source/commit.md

# Transpile for specific target
npx tsx transpiler/src/index.ts --target claude_code

# Validate only (dry run)
npx tsx transpiler/src/index.ts --validate

# Skip transpile (symlink source directly)
bash scripts/symlink-all.sh --skip-transpile
```

## Example: /commit Command

### Universal Source (source/commit.md)

```markdown
---
name: commit
description: Create a git commit
argument_hint: "<message>"
allowed_tools:
  - shell_exec(git add:*)
  - shell_exec(git status:*)
  - shell_exec(git commit:*)
requires: [shell_exec]
---

## Context

- Current git status: {{context_inject:git status}}
- Current diff: {{context_inject:git diff HEAD}}
- Current branch: {{context_inject:git branch --show-current}}
- Recent commits: {{context_inject:git log --oneline -10}}

## Your task

Based on the above changes, create a single git commit.

Use {{tool:shell_exec}} to stage and create the commit. Do not use any other tools.
```

### Claude Code Output (dist/claude-code/commit.md)

Native format with shell injection and allowed-tools frontmatter.

### OpenCode Output (dist/opencode/commit.md)

Native format with shell injection and allowed-tools frontmatter, tool names mapped to OpenCode equivalents.

### Gemini Output (dist/gemini/commit.md)

Degraded format: context injection becomes "Run these commands first" instructions, allowed_tools becomes a textual constraint, tool references resolved to Gemini names.

## Capability Registry Extensions

Add to tool-mappings.yaml:

```yaml
capabilities:
  # New command-specific capabilities
  shell_inject:     [claude_code, opencode]
  command_instruction: [claude_code, opencode]
  allowed_tools_frontmatter: [claude_code, opencode]
  argument_hint:    [claude_code, opencode]
  disable_model:    [claude_code, opencode]
```

## Future Merge Path

Both repos have identical structure. Mechanical merge possible:

```
~/shared-ai-assets/
├── skills/source/
├── commands/source/
├── transpiler/         # Unified (handles both)
├── config/
│   └── tool-mappings.yaml
└── scripts/
    └── symlink-all.sh
```

## Non-Goals

- Not building a general-purpose prompt template engine
- Not supporting arbitrary frontmatter fields (only the defined set)
- Not auto-discovering commands from existing tool configs
- Not handling command dependencies or chaining
