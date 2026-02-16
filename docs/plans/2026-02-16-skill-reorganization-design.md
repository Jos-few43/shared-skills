# Skill Reorganization Design

**Date**: 2026-02-16
**Status**: Approved

## Problem

Shared skills have outdated content, confusing titles, and inconsistent grouping. The `openclaw-management.md` skill is 738 lines trying to be a reference manual, troubleshooting runbook, and operational playbook simultaneously. Other skills have stale paths and references to nonexistent skills.

## Decision

- **Taxonomy**: One skill per tool/system ("by tool" mental model)
- **OpenClaw**: Split into 3 focused skills (operations, troubleshooting, architecture)
- **Cross-cutting skills**: Keep `non-interactive-shell` and `distrobox-management` as separate standalone skills
- **Total skills**: 8 (up from 6)

## New Skill Inventory

| # | Filename | Scope | Source |
|---|---|---|---|
| 1 | `openclaw-operations.md` | CLI commands, health checks, expected state, autonomy rules, usage tracking | Split from `openclaw-management.md` |
| 2 | `openclaw-troubleshooting.md` | Failure patterns, fix scripts, gotchas table | Split from `openclaw-management.md` |
| 3 | `openclaw-architecture.md` | File paths, config structure, shadow vs main, session state model, providers | Split from `openclaw-management.md` |
| 4 | `litellm-proxy.md` | Blue-green proxy management | Renamed + fixed from `litellm-management.md` |
| 5 | `arr-media-stack.md` | Docker *arr stack | Unchanged |
| 6 | `distrobox-management.md` | Container management | Updated (remove stale refs) |
| 7 | `non-interactive-shell.md` | Shell safety for non-interactive terminals | Unchanged |
| 8 | `ujust-bazzite-admin.md` | Bazzite system administration | Unchanged |

## Content Fixes

### litellm-proxy.md (renamed from litellm-management.md)
- Fix paths: `~/distrobox-configs/litellm/` -> `~/litellm-stack/`
- Fix paths: `~/litellm/blue/` -> `~/litellm-stack/blue/`
- Remove `nano` references (non-interactive shell)
- Add note to use Edit tool for `.env` files

### distrobox-management.md (content update)
- Remove reference to nonexistent `ai-tools-container-isolation` skill
- Replace with inline note about container isolation pattern

### openclaw-operations.md (new)
- CLI command reference (health, plugins, gateway, config, agents, sessions, channels)
- Expected healthy state checklist
- Autonomy rules (do freely / confirm first / never)
- Auto-rotator health check script
- Usage tracker commands
- Target: ~120 lines

### openclaw-troubleshooting.md (new)
- All "FAILURE:" sections with fix scripts
- Gotchas table
- Remove hardcoded Telegram bot token — reference chezmoi
- Parameterize default model names in fix scripts
- Target: ~200 lines

### openclaw-architecture.md (new)
- Environment variables and paths
- Complete file reference tree
- Shadow config vs main config explanation
- Session state model (sessions.json metadata vs .jsonl history)
- Provider configuration structure
- Target: ~100 lines

### Unchanged
- `arr-media-stack.md` — already well-scoped
- `non-interactive-shell.md` — already well-scoped
- `ujust-bazzite-admin.md` — already well-scoped

## Implementation Steps

1. Create `openclaw-operations.md` from operations sections of `openclaw-management.md`
2. Create `openclaw-troubleshooting.md` from failure/gotcha sections (sanitize secrets)
3. Create `openclaw-architecture.md` from environment/file-reference sections
4. Rename + fix `litellm-management.md` -> `litellm-proxy.md`
5. Update `distrobox-management.md` (remove stale refs)
6. Delete old `openclaw-management.md`
7. Run `symlink-all.sh` to propagate changes
8. Verify symlinks in Claude Code and OpenCode skill directories

## Risks

- **Description matching**: 3 OpenClaw skills need precise `description` fields so AI tools pick the right one. Mitigated by using distinct trigger keywords in each description.
- **OpenClaw container skills**: The `symlink-all.sh` script copies to OpenClaw staging. If `openclaw-dev` is running, skills with NEW filenames won't have matching skill directories — they'll be skipped. Manual creation of skill dirs may be needed.
