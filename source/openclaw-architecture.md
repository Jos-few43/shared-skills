---
name: openclaw-architecture
description: >-
  Use when you need to understand OpenClaw's file layout, config structure,
  or state directories. Use when asked about shadow config vs main config,
  session state model, credentials location, workspace paths, or provider
  configuration structure. Reference skill for openclaw-operations and
  openclaw-troubleshooting.
---

# OpenClaw Architecture

## Environment

- **Container**: `openclaw-dev` (distrobox)
- **Config dir** (`OPENCLAW_CONFIG_DIR`): `/opt/openclaw/config/`
- **Active state dir** (`OPENCLAW_HOME/.openclaw`): `/opt/openclaw/config/.openclaw/`
- **Shadow config** (ACTIVE — all CLI writes go here): `/opt/openclaw/config/.openclaw/openclaw.json`
- **Main config** (reference, full providers/channels): `/opt/openclaw/config/openclaw.json`
- **Legacy state dir** (historical sessions, do not delete): `~/.openclaw/`
- **Auth profiles**: `/opt/openclaw/config/agents/main/agent/auth-profiles.json`
- **Cron jobs**: `/opt/openclaw/config/cron/jobs.json`
- **Usage stats**: `/opt/openclaw/config/usage-stats.json`
- **Active session store**: `/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json` (metadata: model, provider)
- **Session conversation logs**: `/opt/openclaw/config/.openclaw/agents/main/sessions/<uuid>.jsonl` (history — does NOT control model selection)
- **Config audit log**: `/opt/openclaw/config/.openclaw/logs/config-audit.jsonl`
- **Telegram bot token**: Managed via chezmoi (~/.config/chezmoi/chezmoi.toml → [data].telegram_bot_token)
- **Gateway port**: `18789`

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

OpenClaw maintains two config files with distinct roles:

- **Main config** (`/opt/openclaw/config/openclaw.json`) is the full reference configuration containing all provider definitions, plugin declarations, and channel settings. It is read at startup but the CLI never writes to it directly.
- **Shadow config** (`/opt/openclaw/config/.openclaw/openclaw.json`) is the active runtime copy. Every `openclaw config set` command, plugin toggle, and model default change writes here. Running `openclaw doctor --fix` creates a minimal shadow config if one does not exist.

When diagnosing config issues, always check the **shadow** file first -- it is what the running CLI actually uses. The main config is useful as a reference for the intended full configuration, but edits there have no effect until the shadow is regenerated.

---

## Session State Model

Session state has two layers that serve different purposes:

1. **Session metadata** (`sessions.json`) -- each entry records `modelProvider` and `model` for that session. These fields control which model is used when resuming the session. Changing config defaults does **not** retroactively update existing sessions; only new sessions pick up the current defaults.

2. **Conversation history** (`.jsonl` files per session UUID) -- these store the message log (user, assistant, tool calls). They are append-only and do **not** influence model selection. Editing or deleting a `.jsonl` file affects displayed history but cannot change which model a session uses.

To change the model for an existing session, update its entry in `sessions.json` or start a new session with the desired defaults.
