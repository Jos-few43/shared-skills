# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A tool-agnostic skill library for all AI agents in the ecosystem. Skills are authored once in `source/` and automatically propagated via symlinks to Claude Code, OpenCode, Gemini, Qwen, and OpenClaw. Includes a TypeScript transpiler that converts universal skill format (with conditional tool references and capability gates) into tool-specific distributions.

## Tech Stack

| Component | Technology |
|---|---|
| Skills | Markdown + YAML frontmatter |
| Transpiler | TypeScript 5.7, tsx (runner), Vitest 3.0 |
| Dependencies | yaml, glob (transpiler only) |
| Distribution | Bash symlink script |
| Configuration | YAML (tool-mappings.yaml) |

## Project Structure

```
shared-skills/
├── source/                      # CANONICAL skill source (edit here only)
│   ├── *.md                     # Flat skills (37 files)
│   └── <skill-name>/           # Directory-based skills (12 dirs)
│       └── SKILL.md
├── config/
│   └── tool-mappings.yaml       # Semantic tool names → per-platform mappings
├── scripts/
│   └── symlink-all.sh           # Propagation: transpile → symlink/copy to all tools
├── transpiler/
│   ├── src/
│   │   ├── index.ts             # CLI entry, skill discovery, output writing
│   │   ├── parser.ts            # YAML frontmatter + universal format parsing
│   │   ├── resolver.ts          # Tool ref + conditional resolution per target
│   │   ├── renderer.ts          # AST → output string conversion
│   │   └── renderers/           # claude-code.ts, opencode.ts, gemini.ts, qwen.ts, openclaw.ts
│   ├── tests/                   # Unit + integration tests
│   └── package.json
├── dist/                        # Generated transpiled output (gitignored)
│   └── {claude-code,opencode,gemini,qwen,openclaw}/
└── docs/plans/                  # Implementation plan documents
```

## Key Commands

```bash
# Propagate skills to all tools (main workflow)
bash scripts/symlink-all.sh
bash scripts/symlink-all.sh --skip-transpile   # Use source/ directly

# Transpiler
cd transpiler && npm install
npx tsx src/index.ts                            # Transpile all
npx tsx src/index.ts --validate                 # Dry run
npx tsx src/index.ts --skill non-interactive-shell.md  # Single skill
npx tsx src/index.ts --target claude_code       # Single target

# Tests
npm run test
npm run test:watch
```

## Architecture

### Universal Skill Format

Skills use tool-agnostic placeholders resolved per target:

```markdown
Use {{tool:shell_exec}} to run commands.
{{#if supports:subagents}}
For multi-step work, use {{tool:subagent}}.
{{/if}}
```

### Transpilation Pipeline

1. **Parser**: Split YAML frontmatter from body → tokenize into segments (text, tool_ref, context_inject, conditional)
2. **Resolver**: Map semantic tool names via `tool-mappings.yaml`, evaluate capability conditionals
3. **Renderer**: Convert resolved AST to native per-tool markdown format

### Skill Frontmatter Schema

```yaml
---
name: skill-slug
description: "One-liner"
version: "1.0.0"              # optional
requires: [subagents]          # skip if target lacks capability
targets_only: [claude_code]    # restrict to specific tools
targets:
  openclaw:
    description: "Override"    # per-target overrides
---
```

### Distribution Targets

| Tool | Location | Method |
|---|---|---|
| Claude Code | `~/.claude/plugins/skills/` | Symlink |
| OpenCode | `~/opt-ai-agents/opencode/skills/` | Symlink |
| OpenClaw | `/opt/openclaw/config/workspace/skills/` | Copy (container) |
| Gemini CLI | `~/.config/gemini-cli/skills/` | Symlink (if exists) |
| Qwen Code | `~/.config/qwen-code/skills/` | Symlink (if exists) |

## Configuration

`config/tool-mappings.yaml` defines:
- **tools**: Semantic name → concrete tool name per target (e.g., `shell_exec` → `Bash` for Claude Code)
- **capabilities**: Which tools support which features (e.g., `subagents: [claude_code, qwen, openclaw]`)

## Development Workflow

**Creating a skill**: Write `source/my-skill.md` with frontmatter → `bash scripts/symlink-all.sh` → skill immediately available in all tools.

**Universal format gotchas**:
- `{{tool:name}}` must match exactly in tool-mappings.yaml — typos → empty string
- `{{#if supports:cap}}...{{/if}}` must be balanced
- Per-target `targets:` overrides merge with (don't replace) base frontmatter

## Cross-Repo Relationships

- **shared-commands**: Same transpiler pattern, shares `tool-mappings.yaml` (symlinked)
- **OpenClaw-Vault**: Imports skill catalog, links from chain notes
- **ai-container-configs**: Container setup installs transpiler deps

## Things to Avoid

- Don't edit files in `dist/` — they're overwritten by the transpiler
- Don't forget `npm install` in `transpiler/` before first transpile
- Don't symlink into OpenClaw — container isolation requires copy (handled by script)
- Don't add a new semantic tool without updating `tool-mappings.yaml`
