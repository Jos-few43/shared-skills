# AGENTS.md

Guidelines for AI coding agents working in shared-skills.

## Overview

Tool-agnostic skill library. Skills authored in `source/` are transpiled and distributed to Claude Code, OpenCode, Gemini, Qwen, and OpenClaw.

## Commands

```bash
bash scripts/symlink-all.sh                    # Full transpile + distribute
bash scripts/symlink-all.sh --skip-transpile   # Distribute without transpile
cd transpiler && npx tsx src/index.ts           # Transpile only
cd transpiler && npx tsx src/index.ts --validate # Dry run
cd transpiler && npm test                       # Run transpiler tests
```

## Code Style

- Skills: Markdown + YAML frontmatter
- Transpiler: TypeScript 5.7, strict mode
- 2-space indentation, single quotes, semicolons
- Named imports only
- Test with Vitest

## File Structure

- `source/` — CANONICAL skill source (edit here only)
- `transpiler/` — TypeScript parser/resolver/renderers
- `dist/` — Generated output (gitignored, never edit)
- `config/tool-mappings.yaml` — Semantic tool → concrete tool mappings

## Anti-patterns

- Don't edit files in `dist/`
- Don't add semantic tool names without updating `tool-mappings.yaml`
- Don't break the `tool-mappings.yaml` symlink from shared-commands

## Agent Council

| Agent | Model | Role | Use When |
|---|---|---|---|
| sisyphus | claude-opus-4-6-thinking | Orchestrator | Multi-step features, complex implementation |
| oracle | claude-opus-4-6 | Debugger | Transpiler bugs, rendering issues |
| prometheus | gemini-3-pro-high | Strategist | Skill design, cross-tool compatibility |
| explore | gemini-3-flash | Search | Finding skills, checking mappings |
| librarian | gemini-3-flash | Docs | Tool API docs, format references |
