---
name: openclaw-architecture
description: Reference skill for understanding OpenClaw file layout, config structure, state directories, shadow config vs main config, session model, credentials, and workspace paths. Background reference; not user-invocable.
user-invocable: false
---

# OpenClaw Architecture

## Key Paths

| Path | Purpose |
|---|---|
| Container | `openclaw-dev` (distrobox) |
| Config dir (`OPENCLAW_CONFIG_DIR`) | `/opt/openclaw/config/` |
| Shadow config (ACTIVE, CLI writes here) | `/opt/openclaw/config/.openclaw/openclaw.json` |
| Main config (reference only) | `/opt/openclaw/config/openclaw.json` |
| Active state dir | `/opt/openclaw/config/.openclaw/` |
| Legacy state (do not delete) | `~/.openclaw/` |
| Auth profiles | `/opt/openclaw/config/agents/main/agent/auth-profiles.json` |
| Active session store | `/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json` |
| Session logs (history, not model control) | `/opt/openclaw/config/.openclaw/agents/main/sessions/<uuid>.jsonl` |
| Cron jobs | `/opt/openclaw/config/cron/jobs.json` |
| Usage stats | `/opt/openclaw/config/usage-stats.json` |
| Config audit log | `/opt/openclaw/config/.openclaw/logs/config-audit.jsonl` |
| Telegram bot token | chezmoi: `~/.config/chezmoi/chezmoi.toml` → `[data].telegram_bot_token` |
| Gateway port | `18789` |

---

## Complete File Reference

```
CONFIG DIR: /opt/openclaw/config/
├── openclaw.json                          # Main config (providers, plugins, channels) — reference only
├── openclaw.json.bak-rotation-*           # Timestamped rotation backups
├── openclaw.json.backup-before-symlink    # Pre-symlink safety backup
│
├── agents/
│   ├── main/agent/auth-profiles.json      # OAuth tokens + usageStats + lastGood per provider
│   ├── main/agent/models.json             # Per-agent model overrides
│   └── discord-bot/agent/auth-profiles.json
│
├── credentials/                           # Symlinked from .openclaw/credentials
│   ├── telegram-allowFrom.json            # Telegram allowlist
│   └── telegram-pairing.json             # Telegram pairing codes
│
├── cron/
│   ├── jobs.json                          # Scheduled job definitions
│   └── runs/<job-id>.jsonl               # Per-job run history
│
├── devices/paired.json                    # Paired device tokens
├── devices/pending.json                   # Pending pairing requests
├── exec-approvals.json                    # Approved exec commands
├── identity/device.json                   # Gateway device identity
├── identity/device-auth.json             # Device auth token
├── memory/main.sqlite                     # Memory vector DB (top-level, legacy)
├── subagents/runs.json                    # Subagent run history
├── telegram/update-offset-default.json   # Telegram poll offset
├── update-check.json                      # Last update check timestamp
├── usage-stats.json                       # Per-call token usage log (read by token_alert_daemon.py)
│
├── workspace/                             # Agent workspace (main)
│   ├── AGENTS.md / IDENTITY.md / SOUL.md / TOOLS.md / USER.md / HEARTBEAT.md / MEMORY.md
│   ├── memory/<date>.md                   # Daily memory files
│   ├── memory/token_alert_state.json      # Token alert threshold state
│   ├── scripts/token_alert_daemon.py      # Cron: daily token budget alerts (reads usage-stats.json)
│   ├── scripts/token_monitor.py           # Token monitoring util
│   ├── scripts/github_sync.py             # Cron: GitHub repo sync
│   ├── scripts/arxiv_search.py            # arXiv search utility
│   ├── scripts/library_add.py             # Library management
│   ├── scripts/yt_transcript.sh           # YouTube transcript fetcher
│   ├── tools/rotate-model.sh             # Rotate primary model alias
│   ├── tools/track-usage.cjs             # Usage summary from session history
│   ├── tools/visualize-usage.cjs         # Canvas chart of token usage
│   ├── tools/usage-tracker.js            # Usage tracker (gateway API version)
│   ├── tools/cli-triggers.js             # CLI trigger automation
│   └── tools/trigger.sh                  # Shell trigger wrapper
│
└── workspace-discord-bot/                 # Discord bot agent workspace
    └── AGENTS.md / IDENTITY.md / SOUL.md / TOOLS.md / USER.md / HEARTBEAT.md / BOOTSTRAP.md

STATE SUBDIR: /opt/openclaw/config/.openclaw/   ← ACTIVE (all CLI writes go here)
├── openclaw.json                          # ACTIVE shadow config (plugins, channels, model defaults)
├── openclaw.json.bak                      # Rolling backup of shadow config
├── logs/config-audit.jsonl               # Every config write: PID, command, before/after hash
├── memory/main.sqlite                     # Active memory vector DB
├── identity/device.json / device-auth.json
├── credentials → symlink → ../credentials # OAuth dir (symlinked)
├── agents/main/sessions/sessions.json    # ACTIVE session store
└── workspace/                             # State-dir workspace (AGENTS.md, IDENTITY.md, etc.)

LEGACY STATE: ~/.openclaw/                 # Pre-split state — historical reference only
├── agents/main/agent/auth-profiles.json  # Old auth profiles (may be stale)
├── agents/main/sessions/sessions.json    # Historical sessions (merged into active store)
└── workspace/                             # Legacy workspace files
```

---

## Shadow vs Main Config

- **Main config** (`openclaw.json`): Full reference (providers, plugins, channels). {{tool:file_read}} at startup, never written by CLI.
- **Shadow config** (`.openclaw/openclaw.json`): Active runtime copy. All `config set`, plugin toggles, model defaults write here. `doctor --fix` creates minimal shadow if missing.
- Always check shadow first when diagnosing — it is what the CLI uses.

---

## Session State Model

- **`sessions.json`** (metadata): `modelProvider` + `model` per session. Controls model on resume. Config defaults only affect NEW sessions.
- **`.jsonl`** (conversation history): Append-only message log. Does NOT control model selection.
- To change model for existing session: patch `sessions.json` entry or start new session.
