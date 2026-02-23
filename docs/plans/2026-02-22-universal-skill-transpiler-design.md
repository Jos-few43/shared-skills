# Universal Skill Transpiler Design

**Date:** 2026-02-22
**Status:** Approved
**Approach:** Template-Based Transpiler (Approach 1)

## Problem

Shared skills are authored in Claude Code's format and distributed via symlinks to OpenCode, Gemini CLI, Qwen, and OpenClaw. The files are shared but the content isn't translated — tool references, invocation patterns, and behavioral instructions are Claude-specific and meaningless to other tools.

## Solution

A vendor-agnostic universal skill format that gets transpiled to each target tool's native format during sync. Skills are authored once in the universal format, and a Node.js/TypeScript transpiler converts them to all targets.

## Requirements

- Universal vendor-agnostic skill format as the authoring source of truth
- Conversion triggered during sync (extends existing `symlink-all.sh` flow)
- Translates tool references, invocation patterns, and behavioral instructions
- Node.js/TypeScript CLI tool
- Layered format: core spec + optional extensions per tool capability
- Targets: Claude Code, OpenCode, Gemini CLI, Qwen, OpenClaw

## Universal Skill Format

### Frontmatter (YAML)

```yaml
---
# Core (required)
name: skill-name
description: >
  When to use this skill — triggers and context.
version: 1.0.0

# Invocation
triggers:
  slash_command: /command-name    # optional
  auto_match: true                # match on description keywords

# Required capabilities (skill skipped if target lacks these)
requires:
  - shell_exec

# Optional capabilities (graceful degradation)
optional:
  - subagents
  - ask_user
  - file_read

# Per-target overrides (extension layer)
targets:
  claude_code:
    description: >
      Extended description for Claude Code.
  openclaw:
    category: "system"

# Restrict output to specific targets
targets_only: [openclaw]          # optional, omit to generate for all
---
```

### Body (Markdown with semantic placeholders)

- `{{tool:X}}` — semantic tool reference, resolved per target from mappings
- `{{#if supports:X}}...{{/if}}` — conditional block, included only if target supports capability X
- All other markdown passes through unchanged

### Example

```markdown
# Non-Interactive Shell Commands

When running commands via {{tool:shell_exec}}, always use non-interactive flags.

| Tool | WRONG | CORRECT |
|------|-------|---------|
| apt  | `apt-get install pkg` | `apt-get install -y pkg` |

{{#if supports:file_read}}
## Reading Config Files

Use {{tool:file_read}} to check config before running commands.
{{/if}}

{{#if supports:subagents}}
## Parallel Execution

Use {{tool:subagent}} to run independent commands concurrently.
{{/if}}
```

## Tool Mapping Registry

`config/tool-mappings.yaml` maps semantic names to each target's concrete tool names.

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
    claude_code: null
    opencode: "ls"
    gemini: "list_directory"
    qwen: "list_directory"
    openclaw: "file_browser"

  subagent:
    claude_code: "Task"
    opencode: null
    gemini: null
    qwen: "task"
    openclaw: "agent_spawn"

  ask_user:
    claude_code: "AskUserQuestion"
    opencode: "input"
    gemini: null
    qwen: null
    openclaw: "user_prompt"

  web_fetch:
    claude_code: "WebFetch"
    opencode: null
    gemini: "web_fetch"
    qwen: "web_fetch"
    openclaw: null

  web_search:
    claude_code: "WebSearch"
    opencode: null
    gemini: "google_web_search"
    qwen: "web_search"
    openclaw: null

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

- `null` = not supported; `{{#if supports:X}}` blocks omitted, bare `{{tool:X}}` emits empty string + warning
- Adding a new tool = add a column + write a renderer

## Transpiler Architecture

### Project Structure

```
~/shared-skills/
├── source/                          # Universal format skills (source of truth)
├── config/
│   ├── tool-mappings.yaml           # Tool/capability registry
│   └── targets/                     # Per-target renderer config
│       ├── claude-code.yaml
│       ├── opencode.yaml
│       ├── gemini.yaml
│       ├── qwen.yaml
│       └── openclaw.yaml
├── dist/                            # Transpiled output per target (gitignored)
│   ├── claude-code/
│   ├── opencode/
│   ├── gemini/
│   ├── qwen/
│   └── openclaw/
├── transpiler/                      # Node.js/TypeScript CLI
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                 # CLI entry point
│   │   ├── parser.ts                # Universal format → AST
│   │   ├── resolver.ts              # Resolves tool refs & conditionals
│   │   ├── renderer.ts              # Base renderer interface
│   │   ├── renderers/
│   │   │   ├── claude-code.ts
│   │   │   ├── opencode.ts
│   │   │   ├── gemini.ts
│   │   │   ├── qwen.ts
│   │   │   └── openclaw.ts
│   │   └── types.ts                 # Shared types
│   └── tests/
├── scripts/
│   └── symlink-all.sh               # Updated: transpile then symlink from dist/
└── docs/plans/
```

### Pipeline

```
source/*.md → Parser → SkillAST → Resolver(target, mappings) → Renderer(target) → dist/<target>/*.md
```

1. **Parser** — Extracts YAML frontmatter, tokenizes body into `TextSegment`, `ToolRefSegment`, `ConditionalBlock`
2. **Resolver** — Takes AST + target + mappings. Resolves tool refs to concrete names, evaluates conditionals, merges frontmatter overrides.
3. **Renderer** — Per-target output formatting:
   - Claude Code: YAML frontmatter + markdown (near passthrough)
   - OpenCode: markdown skill format
   - Gemini/Qwen: system prompt / instruction markdown
   - OpenClaw: SKILL.md in directory structure + category metadata

### CLI

```
skill-transpile                    # All skills → all targets
skill-transpile --target opencode  # All skills → one target
skill-transpile --skill foo.md     # One skill → all targets
skill-transpile --validate         # Dry run, report warnings
```

### Updated Sync Flow

`symlink-all.sh` updated to:
1. Run transpiler (`npx tsx src/index.ts`)
2. Symlink/copy from `dist/<target>/` instead of `source/`

## Migration Strategy

### One-time migration of existing skills

1. **Automated first pass** — Migration script scans existing skills, detects Claude-specific tool references (`Read`, `Edit`, `Bash`, `Grep`, `Glob`, `Task`, `AskUserQuestion`), wraps in `{{tool:X}}` placeholders, detects behavioral patterns and wraps in conditionals.
2. **Manual review** — Verify mappings, add `requires`/`optional` to frontmatter, test with `--validate`.
3. **Incremental adoption** — Start with simple skills (tables, flags) that need minimal changes.

### Single-tool skills

Skills that only make sense for one tool use `targets_only`:

```yaml
targets_only: [openclaw]
```

Transpiler skips this skill for all other targets.

## Error Handling

| Scenario | Severity | Behavior |
|----------|----------|----------|
| `{{tool:X}}` outside conditional, target has `null` | Warning | Empty string, logged |
| Unknown `{{tool:X}}` not in mappings | Error | Build fails for that skill |
| Malformed frontmatter | Error | Build fails, line number shown |
| Unclosed `{{#if}}` block | Error | Build fails, location shown |
| `requires: [X]` but target lacks X | Skip | Skill not generated for target |
| `targets_only` excludes target | Skip | Silent skip |
| No `description` in frontmatter | Error | Required for all tools |

### Example Output

```
$ skill-transpile
  ✓ non-interactive-shell → claude-code, opencode, gemini, qwen, openclaw
  ✓ container-command → claude-code, opencode, gemini, qwen, openclaw
  ⚠ openclaw-token-refresh → openclaw only (targets_only)
  ⚠ arr-media-stack → {{tool:subagent}} on line 42 unguarded, empty for: opencode, gemini, qwen
  ✗ broken-skill → error: unclosed {{#if}} block at line 15

  19/21 skills transpiled, 2 warnings, 1 error
```

## Adding a New Target Tool

1. Add tool names to `config/tool-mappings.yaml`
2. Create `config/targets/<new-tool>.yaml`
3. Write `transpiler/src/renderers/<new-tool>.ts` implementing `Renderer` interface
4. Add symlink/copy step to `symlink-all.sh`
5. Run sync — all skills automatically available
