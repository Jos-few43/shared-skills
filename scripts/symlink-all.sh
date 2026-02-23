#!/bin/bash
# Propagate source/ skills to all AI tools via symlinks
set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../source" && pwd)"

# Count both flat .md files and directory-based skills (dir/SKILL.md)
MD_COUNT=0
for f in "$SOURCE"/*.md; do
  [ -f "$f" ] && MD_COUNT=$((MD_COUNT + 1))
done
DIR_COUNT=0
for d in "$SOURCE"/*/SKILL.md; do
  [ -f "$d" ] && DIR_COUNT=$((DIR_COUNT + 1))
done
SKILL_COUNT=$((MD_COUNT + DIR_COUNT))

if [ "$SKILL_COUNT" -eq 0 ]; then
  echo "No skills found in $SOURCE"
  exit 1
fi

link_skills() {
  local target_dir=$1
  local tool_name=$2
  mkdir -p "$target_dir"
  local linked=0

  # Flat .md files
  for f in "$SOURCE"/*.md; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    ln -sf "$f" "$target_dir/$name"
    linked=$((linked + 1))
  done

  # Directory-based skills (dir/SKILL.md) — symlink the directory
  for d in "$SOURCE"/*/; do
    [ -f "$d/SKILL.md" ] || continue
    name=$(basename "$d")
    ln -sfn "$d" "$target_dir/$name"
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
  [ -f "$f" ] || continue
  cp "$f" "$OPENCLAW_STAGING/"
done
# Copy directory-based skills to staging
for d in "$SOURCE"/*/; do
  [ -f "$d/SKILL.md" ] || continue
  name=$(basename "$d")
  mkdir -p "$OPENCLAW_STAGING/$name"
  cp "$d/SKILL.md" "$OPENCLAW_STAGING/$name/"
done

OPENCLAW_SKILLS_DIR="/opt/openclaw/config/workspace/skills"
copied=0
skipped=0
if distrobox enter openclaw-dev -- true 2>/dev/null; then
  # Flat .md skills
  for f in "$SOURCE"/*.md; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .md)
    target="$OPENCLAW_SKILLS_DIR/$name/SKILL.md"
    if distrobox enter openclaw-dev -- test -f "$target" 2>/dev/null; then
      distrobox enter openclaw-dev -- cp "${HOME}/opt-openclaw-skills/$(basename "$f")" "$target"
      copied=$((copied + 1))
    else
      skipped=$((skipped + 1))
    fi
  done
  # Directory-based skills
  for d in "$SOURCE"/*/; do
    [ -f "$d/SKILL.md" ] || continue
    name=$(basename "$d")
    target="$OPENCLAW_SKILLS_DIR/$name/SKILL.md"
    distrobox enter openclaw-dev -- mkdir -p "$OPENCLAW_SKILLS_DIR/$name" 2>/dev/null
    distrobox enter openclaw-dev -- cp "${HOME}/opt-openclaw-skills/$name/SKILL.md" "$target" 2>/dev/null
    copied=$((copied + 1))
  done
  echo "  OpenClaw ← $copied skills copied into container ($skipped skipped — no matching skill dir)"
else
  echo "  OpenClaw → staged at ~/opt-openclaw-skills/ (openclaw-dev not running)"
fi

echo ""
echo "Done. $SKILL_COUNT skills propagated."
