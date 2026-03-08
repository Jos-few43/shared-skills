---
name: openclaw-litellm-ops
description: >-
  Use when managing the openclaw-litellm local LLM gateway — restart gateway,
  swap models, check status, pre-warm Ollama models, view logs, clear sessions.
  This is for the LOCAL fully-free LLM setup running on the RTX 3060 via Ollama.
allowed-tools: Bash(*)
---

# OpenClaw LiteLLM Operations

## Quick Reference

| Operation | Command |
|-----------|---------|
| Status | `bash ~/.config/ai-tools-manager/openclaw/scripts/openclaw-litellm-healthcheck.sh && cat /tmp/openclaw-litellm-health.json` |
| Restart gateway | See "Gateway Restart" below |
| Swap model | See "Model Swap" below |
| Pre-warm | `curl -s http://127.0.0.1:11434/api/generate -d '{"model":"llama32-3b-tools","prompt":"hi","stream":false,"options":{"num_predict":5}}'` |
| View nohup log | `tail -30 /tmp/openclaw-gw-llama.log \| cat -v` (or `/tmp/openclaw-gw-watchdog.log`) |
| View internal log | `python3 ~/Documents/OpenClaw-Vault/scripts/sync_openclaw_logs_to_obsidian.py` then check vault |
| Clear sessions | `distrobox enter openclaw-litellm -- rm -rf /opt/openclaw-litellm/config/.openclaw/sessions/* /opt/openclaw-litellm/config/.openclaw/delivery/*` |
| Send test alert | `bash ~/.config/ai-tools-manager/openclaw/scripts/openclaw-litellm-alert.sh info test "Test message"` |

## Architecture

- **Container**: `openclaw-litellm` (distrobox)
- **Config dir**: `/opt/openclaw-litellm/config/` (inside container)
- **Inner config**: `/opt/openclaw-litellm/config/.openclaw/openclaw.json`
- **Agent models**: `/opt/openclaw-litellm/config/agents/main/agent/models.json`
- **Workspace**: `/opt/openclaw-litellm/config/workspace/`
- **Gateway port**: 18790 (loopback)
- **Auth token**: `openclaw-litellm-local-2026`
- **Telegram bot**: `@LocaLLMclawbot`
- **Ollama endpoint**: `http://127.0.0.1:11434`

## Available Models

| Model | Size | Speed | Notes |
|-------|------|-------|-------|
| `llama32-3b-tools` | 2.0 GB | 4.3 tok/s | Primary. Correct tool use, fast. |
| `qwen3-4b-tools` | 5.5 GB | ~1 tok/s | Fallback. Unreliable (thinking mode -> empty responses). |

## Gateway Restart

```bash
# 1. Kill existing gateway
distrobox enter openclaw-litellm -- bash -c 'pkill -f openclaw-gateway || true'

# 2. Clear lock files
rm -f /tmp/openclaw-1000/gateway.*.lock

# 3. Start with correct env
distrobox enter openclaw-litellm -- bash -c '
  nohup env OPENCLAW_CONFIG_DIR=/opt/openclaw-litellm/config \
    OPENCLAW_HOME=/opt/openclaw-litellm/config \
    openclaw gateway --bind loopback --port 18790 --allow-unconfigured --force \
    > /tmp/openclaw-gw-llama.log 2>&1 &
  echo "Started PID: $!"
'

# 4. Verify (wait 5s)
sleep 5
distrobox enter openclaw-litellm -- head -10 /tmp/openclaw-gw-llama.log | cat -v

# 5. Pre-warm
curl -s http://127.0.0.1:11434/api/generate \
  -d '{"model":"llama32-3b-tools","prompt":"hi","stream":false,"options":{"num_predict":5}}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Model: {d[\"model\"]}, Response: {d[\"response\"][:50]}')"
```

**CRITICAL**: The `env` prefix is required. Shell `export` does NOT survive `nohup`/distrobox chains.

## Model Swap

To change the primary model (e.g., switch from llama32 to qwen3):

```bash
distrobox enter openclaw-litellm -- python3 -c "
import json

# Update main config
with open('/opt/openclaw-litellm/config/.openclaw/openclaw.json') as f:
    cfg = json.load(f)
cfg['agents']['defaults']['model']['primary'] = 'ollama-local/NEW_MODEL'
cfg['agents']['defaults']['model']['fallbacks'] = ['ollama-local/OLD_MODEL']
with open('/opt/openclaw-litellm/config/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)

# Update agent models
with open('/opt/openclaw-litellm/config/agents/main/agent/models.json') as f:
    m = json.load(f)
m['primary'] = 'ollama-local/NEW_MODEL'
m['fallbacks'] = ['ollama-local/OLD_MODEL']
with open('/opt/openclaw-litellm/config/agents/main/agent/models.json', 'w') as f:
    json.dump(m, f, indent=2)

print('Done')
"
```

Then restart the gateway (see above).

## Monitoring Services

| Service | Purpose | Status |
|---------|---------|--------|
| `openclaw-litellm-watchdog` | Auto-restart crashed gateway (30s loop) | `systemctl --user status openclaw-litellm-watchdog` |
| `openclaw-litellm-healthcheck` | VRAM, model, Telegram checks (5 min) | `systemctl --user status openclaw-litellm-healthcheck.timer` |
| `openclaw-vault-logsync` | Archive logs to Obsidian vault (hourly) | `systemctl --user status openclaw-vault-logsync.timer` |

## Systemd Management

```bash
# Start/stop watchdog
systemctl --user start openclaw-litellm-watchdog
systemctl --user stop openclaw-litellm-watchdog

# Run health check now
systemctl --user start openclaw-litellm-healthcheck.service

# View watchdog logs
journalctl --user -u openclaw-litellm-watchdog -f

# View health check logs
journalctl --user -u openclaw-litellm-healthcheck --since "30 min ago"
```

## Health Check Thresholds

| Check | Method | Alert Threshold | Alert Type |
|-------|--------|----------------|------------|
| Gateway alive | `ss -tlnp :18790` + `pgrep openclaw-gateway` | Down | `gateway_down` |
| VRAM usage | `nvidia-smi` | >90% | `vram_high` |
| Model GPU residency | `ollama/api/ps` → `size_vram/size` | <50% GPU | `model_cpu_offload` |
| Model response time | Test prompt to Ollama | >15s | `model_slow` |
| Telegram polling | Check nohup log for errors | 3+ errors | `telegram_error` |
| Gateway restart failures | Watchdog restart counter | 3 consecutive | `restart_failed` |

## Alert Channels

All alerts are sent simultaneously to:
1. **systemd journal** — `journalctl --user -t openclaw-litellm`
2. **Obsidian vault** — `~/Documents/OpenClaw-Vault/12-LOGS/OpenClaw/Gateway/alerts-YYYY-MM-DD.md`
3. **Telegram** — Message to admin chat via @LocaLLMclawbot bot
4. **Desktop** — `notify-send` popup with urgency level

**Deduplication**: 15-minute cooldown per alert type. State in `/tmp/openclaw-litellm-alert-state.json`.

## Monitoring Data Files

| File | Written By | Purpose |
|------|-----------|---------|
| `/tmp/openclaw-litellm-health.json` | healthcheck | Health snapshot (read by SessionStart hook) |
| `/tmp/openclaw-litellm-alert-state.json` | alert script | Alert deduplication state |
| `/tmp/openclaw-gw-llama.log` | gateway nohup | Gateway stdout |
| `/tmp/openclaw/openclaw-YYYY-MM-DD.log` | gateway internal | Detailed JSONL log (synced to vault) |

## Monitoring Tuning

### Change health check interval
Edit `~/.config/systemd/user/openclaw-litellm-healthcheck.timer`:
```ini
OnCalendar=*:0/5   # Change 5 to desired minutes
```
Then: `systemctl --user daemon-reload && systemctl --user restart openclaw-litellm-healthcheck.timer`

### Change watchdog interval
Edit `CHECK_INTERVAL=30` in `~/.config/ai-tools-manager/openclaw/scripts/openclaw-litellm-watchdog.sh`
Then: `systemctl --user restart openclaw-litellm-watchdog`

### Change alert cooldown
Edit `COOLDOWN_SECS=900` in `~/.config/ai-tools-manager/openclaw/scripts/openclaw-litellm-alert.sh`

### Disable specific alert channel
Comment out the relevant channel section in `openclaw-litellm-alert.sh`.
