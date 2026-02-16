# Skill Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `openclaw-management.md` into 3 focused skills, fix stale content in `litellm-management.md` and `distrobox-management.md`, propagate changes.

**Architecture:** Extract sections from the monolithic 738-line openclaw skill into 3 new files (operations, troubleshooting, architecture). Rename and fix litellm skill. Update distrobox skill. Delete the old monolith. Re-run symlink propagation.

**Tech Stack:** Markdown skill files, bash symlink script, shared-skills git repo at `~/shared-skills/`

**Working directory:** `${HOME}/shared-skills/`

**Source of truth for current content:** `source/openclaw-management.md` (lines referenced below)

---

### Task 1: Create `openclaw-architecture.md`

**Why first:** The other two OpenClaw skills will cross-reference this one for file paths and config structure.

**Files:**
- Create: `source/openclaw-architecture.md`
- Reference: `source/openclaw-management.md` (lines 1-93 environment + file reference)

**Step 1: Write the file**

Extract from `openclaw-management.md`:
- Lines 8-23: Environment section (container, config dir, state dir, shadow config, etc.)
- Lines 27-93: Complete File Reference tree
- Add a brief "Shadow vs Main Config" explanation (distill from gotchas)
- Add a brief "Session State Model" explanation (distill from the session-model-locked failure pattern)

**Sanitize:**
- Remove the hardcoded Telegram bot token on line 22. Replace with:
  `- **Telegram bot token**: Managed via chezmoi (`~/.config/chezmoi/chezmoi.toml` → `[data].telegram_bot_token`)`
- Keep gateway port (18789) — not a secret

**Description field (YAML frontmatter):**
```yaml
name: openclaw-architecture
description: >-
  Use when you need to understand OpenClaw's file layout, config structure,
  or state directories. Use when asked about shadow config vs main config,
  session state model, credentials location, workspace paths, or provider
  configuration structure. Reference skill for openclaw-operations and
  openclaw-troubleshooting.
```

**Step 2: Verify**

Run: `wc -l source/openclaw-architecture.md` — should be ~80-120 lines.
Run: `grep -c 'AAH6' source/openclaw-architecture.md` — should be 0 (no bot token).

**Step 3: Commit**

```bash
git add source/openclaw-architecture.md
git commit -m "feat: create openclaw-architecture skill (split 1/3)"
```

---

### Task 2: Create `openclaw-operations.md`

**Files:**
- Create: `source/openclaw-operations.md`
- Reference: `source/openclaw-management.md` (lines 97-265 commands + operations, lines 709-737 autonomy rules)

**Step 1: Write the file**

Extract from `openclaw-management.md`:
- Lines 97-214: Commands Reference (all subsections: health, plugins, gateway, config, agents, sessions, channels, cron, security, messaging, memory, skills, other)
- Lines 218-265: Common Operations (quick health check, expected healthy state, auto-rotator health check, usage tracker, session count)
- Lines 709-737: Autonomy Rules

**Sanitize:**
- In the "Expected Healthy State" section, replace the hardcoded Telegram bot token in any example commands with `$TELEGRAM_BOT_TOKEN` and add a note: "Token from chezmoi: `chezmoi data | jq -r .telegram_bot_token`"
- The auto-rotator health check script (lines 237-253) reads auth-profiles.json — keep as-is, no secrets

**Description field:**
```yaml
name: openclaw-operations
description: >-
  Use when running OpenClaw CLI commands, checking health/status, managing
  plugins, sessions, agents, channels, gateway, or cron. Use when asked
  about expected healthy state, autonomy rules, usage tracking, or
  auto-rotator status. See openclaw-architecture for file paths and
  openclaw-troubleshooting for failure fixes.
```

**Step 2: Verify**

Run: `wc -l source/openclaw-operations.md` — should be ~120-160 lines.
Run: `grep -c 'AAH6' source/openclaw-operations.md` — should be 0.

**Step 3: Commit**

```bash
git add source/openclaw-operations.md
git commit -m "feat: create openclaw-operations skill (split 2/3)"
```

---

### Task 3: Create `openclaw-troubleshooting.md`

**Files:**
- Create: `source/openclaw-troubleshooting.md`
- Reference: `source/openclaw-management.md` (lines 327-706 failure patterns + gotchas)

**Step 1: Write the file**

Extract from `openclaw-management.md`:
- Lines 327-682: All "FAILURE:" sections (8 patterns total):
  1. Plugins disabled (lines 329-377)
  2. CRITICAL OAuth dir missing (lines 381-389)
  3. Usage tracker wrong history (lines 393-423)
  4. Telegram channel no token (lines 427-432)
  5. Telegram polling dead (lines 436-463)
  6. Gateway --force blocked (lines 467-478)
  7. Session model locked (lines 482-545)
  8. Git cannot lock ref (lines 549-570)
  9. State directory split (lines 574-581)
  10. Legacy store shadow-active (lines 585-680)
- Lines 684-706: Gotchas table

**Sanitize — CRITICAL:**
- Every occurrence of the hardcoded Telegram bot token `8187629510:AAH6WtuEkC485yFEIIuwn-6RA9ANZ3L4yCY` must be replaced with `$TELEGRAM_BOT_TOKEN`
- Affected lines: 341, 365 (in fix scripts with `openclaw config set channels.telegram.botToken`)
- Add a note at the top: "**Note:** `$TELEGRAM_BOT_TOKEN` refers to the token managed via chezmoi. Retrieve with: `chezmoi data | jq -r .telegram_bot_token`"

**Parameterize model defaults:**
- Replace hardcoded `gemini-2.5-flash` in fix scripts with a clearly marked placeholder comment
- Example: where scripts set `v['model'] = 'gemini-2.5-flash'`, change to `v['model'] = 'gemini-2.5-flash'  # UPDATE: set to your current default model`
- Same for `google-gemini-cli` provider references — keep but mark as potentially needing update

**Description field:**
```yaml
name: openclaw-troubleshooting
description: >-
  Use when OpenClaw has errors, failures, or unexpected behavior. Use when
  plugins are disabled, Telegram shows "no token" or "SETUP", bot returns
  empty responses, sessions are model-locked, gateway won't start,
  credentials are missing, state is split, or usage tracker shows wrong data.
  See openclaw-architecture for file paths and openclaw-operations for
  normal CLI commands.
```

**Step 2: Verify**

Run: `wc -l source/openclaw-troubleshooting.md` — should be ~200-250 lines.
Run: `grep -c 'AAH6' source/openclaw-troubleshooting.md` — should be 0.
Run: `grep -c 'TELEGRAM_BOT_TOKEN' source/openclaw-troubleshooting.md` — should be >= 2.

**Step 3: Commit**

```bash
git add source/openclaw-troubleshooting.md
git commit -m "feat: create openclaw-troubleshooting skill (split 3/3)"
```

---

### Task 4: Rename and fix `litellm-management.md` → `litellm-proxy.md`

**Files:**
- Delete: `source/litellm-management.md`
- Create: `source/litellm-proxy.md`

**Step 1: Write the updated file**

Copy content from `litellm-management.md` with these fixes:

| Find | Replace |
|------|---------|
| `name: litellm-management` | `name: litellm-proxy` |
| `~/distrobox-configs/litellm/status.sh` | `~/litellm-stack/status.sh` (verify this file exists first — if not, use `~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh`) |
| `~/distrobox-configs/litellm/promote.sh` | `~/litellm-stack/promote.sh` (verify — may not exist) |
| `~/distrobox-configs/litellm/rollback.sh` | `~/litellm-stack/rollback.sh` (verify) |
| `~/distrobox-configs/litellm/start-all.sh` | `~/litellm-stack/start-all.sh` (verify) |
| `~/litellm/blue/start.sh` | `~/litellm-stack/blue/start.sh` |
| `~/litellm/green/start.sh` | `~/litellm-stack/green/start.sh` |
| `~/litellm/green/litellm.log` | `~/litellm-stack/green/litellm.log` |
| `nano ~/litellm/blue/.env` | `# Use Edit tool on ~/litellm-stack/blue/.env` |
| `nano ~/litellm/green/.env` | `# Use Edit tool on ~/litellm-stack/green/.env` |

**IMPORTANT:** Before writing, verify which scripts actually exist:
```bash
ls ~/litellm-stack/*.sh ~/litellm-stack/blue/*.sh ~/litellm-stack/green/*.sh 2>/dev/null
ls ~/PROJECTz/ai-container-configs/scripts/litellm*.sh 2>/dev/null
```

Update paths to match what actually exists. If promote/rollback/start-all scripts don't exist at `~/litellm-stack/`, check `~/PROJECTz/ai-container-configs/scripts/` and CLAUDE.md for the correct paths.

**Step 2: Verify**

Run: `grep -c 'distrobox-configs' source/litellm-proxy.md` — should be 0.
Run: `grep -c 'nano' source/litellm-proxy.md` — should be 0.

**Step 3: Commit**

```bash
git rm source/litellm-management.md
git add source/litellm-proxy.md
git commit -m "feat: rename litellm-management to litellm-proxy, fix stale paths"
```

---

### Task 5: Update `distrobox-management.md`

**Files:**
- Modify: `source/distrobox-management.md` (lines 99-108)

**Step 1: Edit the file**

Replace the "AI Tools Container Isolation" section (lines 99-108) which references the nonexistent `ai-tools-container-isolation` skill. Replace with:

```markdown
## AI Tools Container Isolation

AI tools (OpenCode, OpenClaw, Gemini, Qwen) use dedicated config directories inside containers — NOT `~/.config/` (which is shared with host):

- Config dir: `/opt/<tool>/config/` or `~/opt-ai-agents/<tool>/`
- Environment: `/etc/profile.d/<tool>.sh` exports `<TOOL>_CONFIG_DIR`
- See `~/CLAUDE.md` Container Architecture section for full details
```

**Step 2: Verify**

Run: `grep -c 'ai-tools-container-isolation' source/distrobox-management.md` — should be 0.

**Step 3: Commit**

```bash
git add source/distrobox-management.md
git commit -m "fix: remove reference to nonexistent ai-tools-container-isolation skill"
```

---

### Task 6: Delete old `openclaw-management.md`

**Files:**
- Delete: `source/openclaw-management.md`

**Step 1: Verify all 3 new OpenClaw skills exist**

```bash
ls -la source/openclaw-architecture.md source/openclaw-operations.md source/openclaw-troubleshooting.md
```

All 3 must exist before deleting the original.

**Step 2: Delete**

```bash
git rm source/openclaw-management.md
git commit -m "chore: remove monolithic openclaw-management (replaced by 3 focused skills)"
```

---

### Task 7: Propagate symlinks

**Step 1: Run symlink script**

```bash
bash ~/shared-skills/scripts/symlink-all.sh
```

**Step 2: Verify Claude Code symlinks**

```bash
ls -la ~/.claude/plugins/skills/openclaw-*.md
ls -la ~/.claude/plugins/skills/litellm-*.md
```

Expected:
- `openclaw-architecture.md` → source
- `openclaw-operations.md` → source
- `openclaw-troubleshooting.md` → source
- `litellm-proxy.md` → source
- No `openclaw-management.md` (deleted)
- No `litellm-management.md` (deleted)

**Step 3: Clean up stale symlinks**

The script uses `ln -sf` which creates new links but won't remove old ones for deleted files:

```bash
rm -f ~/.claude/plugins/skills/openclaw-management.md
rm -f ~/.claude/plugins/skills/litellm-management.md
rm -f ~/opt-ai-agents/opencode/skills/openclaw-management.md
rm -f ~/opt-ai-agents/opencode/skills/litellm-management.md
```

**Step 4: Verify OpenCode symlinks**

```bash
ls -la ~/opt-ai-agents/opencode/skills/openclaw-*.md
ls -la ~/opt-ai-agents/opencode/skills/litellm-*.md
```

**Step 5: Commit cleanup (if symlink-all.sh was modified)**

No commit needed — symlinks are not tracked in git.

---

### Task 8: Final verification

**Step 1: Count skills**

```bash
ls source/*.md | wc -l
```

Expected: 8

**Step 2: List all skills with line counts**

```bash
wc -l source/*.md
```

Expected rough sizes:
- `arr-media-stack.md` ~178
- `distrobox-management.md` ~100
- `litellm-proxy.md` ~60
- `non-interactive-shell.md` ~89
- `openclaw-architecture.md` ~80-120
- `openclaw-operations.md` ~120-160
- `openclaw-troubleshooting.md` ~200-250
- `ujust-bazzite-admin.md` ~191

**Step 3: Verify no secrets leaked**

```bash
grep -r 'AAH6' source/
```

Expected: 0 matches.

**Step 4: Verify all YAML frontmatter has name + description**

```bash
for f in source/*.md; do
  name=$(head -5 "$f" | grep '^name:' | head -1)
  desc=$(head -5 "$f" | grep '^description:' | head -1)
  echo "$(basename $f): name=${name:+OK} desc=${desc:+OK}"
done
```

All should show `name=OK desc=OK`.
