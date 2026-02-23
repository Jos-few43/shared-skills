#!/bin/bash
# Propagate source/ skills to all AI tools via symlinks
# Optionally transpiles universal-format skills first via the transpiler
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="$ROOT_DIR/source"
DIST="$ROOT_DIR/dist"
TRANSPILER="$ROOT_DIR/transpiler"

SKIP_TRANSPILE=false
if [[ "${1:-}" == "--skip-transpile" ]]; then
  SKIP_TRANSPILE=true
fi

# --- Step 1: Transpile (if available) ---
if [ "$SKIP_TRANSPILE" = false ] && [ -d "$TRANSPILER/node_modules" ]; then
  echo "Transpiling universal skills..."
  if (cd "$TRANSPILER" && npx tsx src/index.ts 2>&1); then
    echo ""
    USE_DIST=true
  else
    echo "  Transpiler failed, falling back to source/"
    echo ""
    USE_DIST=false
  fi
else
  if [ "$SKIP_TRANSPILE" = true ]; then
    echo "Skipping transpile (--skip-transpile)"
  else
    echo "Transpiler not installed, using source/ directly"
    echo "  (run 'cd transpiler && npm install' to enable transpilation)"
  fi
  echo ""
  USE_DIST=false
fi

# --- Step 2: Count skills ---
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

# --- Step 3: Link skills to targets ---

link_skills_from_source() {
  local target_dir=$1
  local tool_name=$2
  mkdir -p "$target_dir"
  local linked=0

  for f in "$SOURCE"/*.md; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    ln -sf "$f" "$target_dir/$name"
    linked=$((linked + 1))
  done

  for d in "$SOURCE"/*/; do
    [ -f "$d/SKILL.md" ] || continue
    name=$(basename "$d")
    ln -sfn "$d" "$target_dir/$name"
    linked=$((linked + 1))
  done

  echo "  $tool_name ← $linked skills linked (from source/)"
}

link_skills_from_dist() {
  local target_dir=$1
  local dist_subdir=$2
  local tool_name=$3
  local dist_path="$DIST/$dist_subdir"
  mkdir -p "$target_dir"
  local linked=0

  if [ ! -d "$dist_path" ]; then
    echo "  $tool_name ← dist/$dist_subdir not found, skipping"
    return
  fi

  for f in "$dist_path"/*.md; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    ln -sf "$f" "$target_dir/$name"
    linked=$((linked + 1))
  done

  for d in "$dist_path"/*/; do
    [ -f "$d/SKILL.md" ] || continue
    name=$(basename "$d")
    ln -sfn "$d" "$target_dir/$name"
    linked=$((linked + 1))
  done

  echo "  $tool_name ← $linked skills linked (from dist/$dist_subdir)"
}

echo "Distributing $SKILL_COUNT skills"
echo ""

if [ "$USE_DIST" = true ]; then
  # Claude Code
  link_skills_from_dist "$HOME/.claude/plugins/skills" "claude-code" "Claude Code"

  # OpenCode
  link_skills_from_dist "$HOME/opt-ai-agents/opencode/skills" "opencode" "OpenCode"

  # Gemini — link to config dir if it exists
  if [ -d "$HOME/.config/gemini-cli" ]; then
    link_skills_from_dist "$HOME/.config/gemini-cli/skills" "gemini" "Gemini CLI"
  fi

  # Qwen — link to config dir if it exists
  if [ -d "$HOME/.config/qwen-code" ]; then
    link_skills_from_dist "$HOME/.config/qwen-code/skills" "qwen" "Qwen Code"
  fi
else
  # Fallback: symlink source/ directly (original behavior)
  link_skills_from_source "$HOME/.claude/plugins/skills" "Claude Code"
  link_skills_from_source "$HOME/opt-ai-agents/opencode/skills" "OpenCode"
fi

# OpenClaw — always uses copy (container isolation)
OPENCLAW_SOURCE="$SOURCE"
if [ "$USE_DIST" = true ] && [ -d "$DIST/openclaw" ]; then
  OPENCLAW_SOURCE="$DIST/openclaw"
fi

OPENCLAW_STAGING="$HOME/opt-openclaw-skills"
mkdir -p "$OPENCLAW_STAGING"
# Stage flat .md files
for f in "$OPENCLAW_SOURCE"/*.md; do
  [ -f "$f" ] || continue
  cp "$f" "$OPENCLAW_STAGING/"
done
# Stage directory-based skills
for d in "$OPENCLAW_SOURCE"/*/; do
  [ -f "$d/SKILL.md" ] || continue
  name=$(basename "$d")
  mkdir -p "$OPENCLAW_STAGING/$name"
  cp "$d/SKILL.md" "$OPENCLAW_STAGING/$name/"
done

OPENCLAW_SKILLS_DIR="/opt/openclaw/config/workspace/skills"
copied=0
skipped=0
if distrobox enter openclaw-dev -- true 2>/dev/null; then
  for f in "$OPENCLAW_SOURCE"/*.md; do
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
  for d in "$OPENCLAW_SOURCE"/*/; do
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
