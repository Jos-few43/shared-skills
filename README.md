# Shared AI Skills

Tool-agnostic skills consumed by all AI agents via symlinks.
Edit files in `source/` — changes are immediately visible to all tools.

## Structure

- `source/` — canonical skill files (edit here only)
- `scripts/symlink-all.sh` — propagates source/ to all tools

## Tools that consume these skills

- **Claude Code** → `~/.claude/plugins/skills/`
- **OpenCode** → `~/opt-ai-agents/opencode/skills/`
- **OpenClaw** → copied via shared home on openclaw-dev start

## Adding a Skill

1. Write `source/my-skill.md` with YAML frontmatter (name, description)
2. `bash scripts/symlink-all.sh`
3. `git add source/my-skill.md && git commit -m "feat: add my-skill"`

## Updating

Edit `source/<skill>.md` — symlinks mean all tools see changes instantly.
