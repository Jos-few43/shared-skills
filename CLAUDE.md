# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A tool-agnostic skill library for all AI agents in the ecosystem. Skills are authored once in `source/` using the **Claude Skills 2.0** directory format (`skill-name/SKILL.md`) and automatically propagated via symlinks to Claude Code, OpenCode, Gemini, Qwen, and OpenClaw. Claude Code reads skills natively from `source/`; other tools receive transpiled flat-file output.

## Tech Stack

| Component | Technology |
|---|---|
| Skills | Markdown + YAML frontmatter (Skills 2.0 spec) |
| Transpiler | TypeScript 5.7, tsx (runner), Vitest 3.0 |
| Dependencies | yaml, glob (transpiler only) |
| Distribution | Bash symlink script |
| Configuration | YAML (tool-mappings.yaml) |

## Project Structure

```
shared-skills/
├── source/                      # CANONICAL skill source (edit here only)
│   └── <skill-name>/           # Skills 2.0 directory format (~38 skills)
│       ├── SKILL.md            # Core skill (YAML frontmatter + markdown body)
│       ├── templates/          # Optional supporting files
│       └── examples/           # Optional examples
├── candidates/                  # Skill discovery proposals (YAML)
├── metrics/                     # Trigger logs, health data (local-only, gitignored)
├── config/
│   └── tool-mappings.yaml       # Semantic tool names → per-platform mappings
├── scripts/
│   ├── symlink-all.sh           # Propagation: symlink/transpile to all tools
│   └── health.sh                # Skill health dashboard
├── transpiler/
│   ├── src/
│   │   ├── index.ts             # CLI entry, skill discovery, output writing
│   │   ├── parser.ts            # YAML frontmatter + universal format parsing
│   │   ├── resolver.ts          # Tool ref + conditional resolution per target
│   │   ├── renderer.ts          # AST → output string conversion
│   │   └── renderers/           # claude-code.ts, opencode.ts, gemini.ts, qwen.ts, openclaw.ts
│   ├── tests/
│   └── package.json
├── dist/                        # Generated transpiled output (gitignored)
│   └── {claude-code,opencode,gemini,qwen,openclaw}/
└── docs/plans/
```

## Key Commands

```bash
# Propagate skills to all tools (main workflow)
bash scripts/symlink-all.sh
bash scripts/symlink-all.sh --skip-transpile   # Source-only (no transpile for other tools)

# Skill health dashboard
bash scripts/health.sh

# Transpiler (for OpenCode/OpenClaw/Gemini/Qwen output)
cd transpiler && npm install
npx tsx src/index.ts                            # Transpile all
npx tsx src/index.ts --validate                 # Dry run
npx tsx src/index.ts --target opencode          # Single target

# Tests
npm run test
npm run test:watch
```

## Skill Format (Skills 2.0)

All skills use the directory format: `source/<skill-name>/SKILL.md`

### Frontmatter Schema

```yaml
---
name: skill-slug
description: "Clear description of when to use this skill"
# Skills 2.0 fields
argument-hint: "[args]"                 # Hint for argument syntax
context: fork                           # Run in isolated subagent
disable-model-invocation: true          # User-invoked only (no auto-trigger)
user-invocable: false                   # Background/reference only
allowed-tools: Bash(*), Read, Write     # Tool permissions
model: sonnet                           # Preferred model
# Transpiler-only fields (stripped for Claude Code, used for other tools)
targets_only: [claude_code]             # Restrict to specific tools
targets:
  openclaw:
    description: "Override"             # Per-target overrides
---
```

### Dynamic Context Injection

Skills can inject live data at load time:

```markdown
## Current status
!`docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null`
```

### Supporting Files

Skills can include templates, examples, and scripts alongside SKILL.md:

```
source/deep-research/
├── SKILL.md
└── templates/
    └── report-template.md
```

Reference with: `See [templates/report-template.md](templates/report-template.md)`

## Skill Growth System

### Discovery → Implementation → Evaluation

1. **`/skill-discover`** — scans sessions for repeated patterns, writes candidates to `candidates/`
2. **`/skill-implement <candidate>`** — generates full Skills 2.0 skill from approved candidate
3. **`/skill-health`** — dashboard showing trigger metrics, staleness, health per skill

### Candidate Lifecycle

`proposed` → `approved` → `implemented` → `evaluated`

Candidates live in `candidates/*.yaml`. Capability uplift skills get 90-day review; workflow skills get 180-day.

## Distribution Pipeline

```
source/ (Skills 2.0 directories)
    │
    ├──→ ~/.claude/plugins/skills/  (direct symlinks, always)
    │
    └──→ transpiler → dist/
              ├── opencode/    (flat .md)
              ├── openclaw/    (flat .md, copied into container)
              ├── gemini/      (flat .md)
              └── qwen/        (flat .md)
```

Claude Code reads native Skills 2.0 format directly. Transpiler only runs for other tools.

| Tool | Location | Method |
|---|---|---|
| Claude Code | `~/.claude/plugins/skills/` | Direct symlink from source/ |
| OpenCode | `~/opt-ai-agents/opencode/skills/` | Symlink from dist/ (or source/ fallback) |
| OpenClaw | `/opt/openclaw/config/workspace/skills/` | Copy into container |
| Gemini CLI | `~/.config/gemini-cli/skills/` | Symlink from dist/ |
| Qwen Code | `~/.config/qwen-code/skills/` | Symlink from dist/ |

## Development Workflow

**Creating a skill**:
1. `mkdir source/my-skill && touch source/my-skill/SKILL.md`
2. Add YAML frontmatter (name, description, allowed-tools)
3. Write markdown body with instructions
4. `bash scripts/symlink-all.sh` → skill available in all tools

**Universal format** (for cross-tool skills):
- `{{tool:shell_exec}}` → resolved per target via `tool-mappings.yaml`
- `{{#if supports:subagents}}...{{/if}}` → conditional sections
- Per-target `targets:` overrides merge with base frontmatter

## Things to Avoid

- Don't edit files in `dist/` — overwritten by transpiler
- Don't create flat `.md` skills in `source/` — use directory format only
- Don't forget `npm install` in `transpiler/` before first transpile
- Don't symlink into OpenClaw — container isolation requires copy
- Don't add a new semantic tool without updating `tool-mappings.yaml`
- Don't put secrets or API keys in skill files
