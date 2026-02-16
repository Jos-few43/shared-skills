#!/bin/bash
# Propagate source/ skills to all AI tools via symlinks
set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../source" && pwd)"
SKILL_COUNT=$(ls "$SOURCE"/*.md 2>/dev/null | wc -l)

if [ "$SKILL_COUNT" -eq 0 ]; then
  echo "No .md files found in $SOURCE"
  exit 1
fi

link_skills() {
  local target_dir=$1
  local tool_name=$2
  mkdir -p "$target_dir"
  local linked=0
  for f in "$SOURCE"/*.md; do
    name=$(basename "$f")
    ln -sf "$f" "$target_dir/$name"
    linked=$((linked + 1))
  done
  echo "  $tool_name ← $linked skills linked"
}

echo "Symlinking $SKILL_COUNT skills from $SOURCE"
echo ""

# Claude Code
link_skills "$HOME/.claude/plugins/skills" "Claude Code"

# OpenCode (ai-agents)
link_skills "$HOME/opt-ai-agents/opencode/skills" "OpenCode"

# OpenClaw — config is inside openclaw-dev container at /opt/openclaw/config/
# Skills live at /opt/openclaw/config/workspace/skills/<name>/SKILL.md
OPENCLAW_STAGING="$HOME/opt-openclaw-skills"
mkdir -p "$OPENCLAW_STAGING"
for f in "$SOURCE"/*.md; do
  cp "$f" "$OPENCLAW_STAGING/"
done

OPENCLAW_SKILLS_DIR="/opt/openclaw/config/workspace/skills"
copied=0
skipped=0
if distrobox enter openclaw-dev -- true 2>/dev/null; then
  for f in "$SOURCE"/*.md; do
    name=$(basename "$f" .md)
    target="$OPENCLAW_SKILLS_DIR/$name/SKILL.md"
    if distrobox enter openclaw-dev -- test -f "$target" 2>/dev/null; then
      distrobox enter openclaw-dev -- cp "${HOME}/opt-openclaw-skills/$(basename "$f")" "$target"
      copied=$((copied + 1))
    else
      skipped=$((skipped + 1))
    fi
  done
  echo "  OpenClaw ← $copied skills copied into container ($skipped skipped — no matching skill dir)"
else
  echo "  OpenClaw → staged at ~/opt-openclaw-skills/ (openclaw-dev not running)"
fi

echo ""
echo "Done. $SKILL_COUNT skills propagated."
