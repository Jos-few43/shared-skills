---
name: transpile-and-distribute
description: "Transpile universal skills and distribute to all AI tools. Triggers: 'transpile skills', 'distribute skills', 'sync skills', 'propagate skills'."
---

# Transpile & Distribute — shared-skills

## PHASE 1: TRANSPILE
```bash
cd ~/shared-skills/transpiler && npx tsx src/index.ts
```
Expected: Generates `dist/{claude-code,opencode,gemini,qwen,openclaw}/` directories.

## PHASE 2: DISTRIBUTE
```bash
bash ~/shared-skills/scripts/symlink-all.sh
```
Expected: Symlinks created to all tool locations.

## PHASE 3: VERIFY
```bash
ls -la ~/.claude/plugins/skills/ | head -10
ls -la ~/opt-ai-agents/opencode/skills/ | head -10
```
Expected: Skills symlinked to both Claude Code and OpenCode locations.

## PHASE 4: REPORT
- Transpiled: N skills to M targets
- Symlinks: created / updated / failed
