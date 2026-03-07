---
name: openclaw-litellm-monitor
description: >-
  Use when asking about openclaw-litellm monitoring, health checks, alert thresholds,
  what services are watching, or how to tune monitoring parameters.
---

# OpenClaw LiteLLM Monitoring

## Services Overview

| Service | Type | Interval | Purpose |
|---------|------|----------|---------|
| `openclaw-litellm-watchdog` | simple (loop) | 30s | Gateway crash recovery |
| `openclaw-litellm-healthcheck` | timer + oneshot | 5 min | VRAM, model, Telegram health |
| `openclaw-vault-logsync` | timer + oneshot | 1 hour | Archive JSONL logs to Obsidian vault |

## Health Checks & Thresholds

| Check | Method | Alert Threshold | Alert Type |
|-------|--------|----------------|------------|
| Gateway alive | `ss -tlnp :18790` + `pgrep openclaw-gateway` | Down | `gateway_down` |
| VRAM usage | `nvidia-smi` | >90% | `vram_high` |
| Model GPU residency | `ollama/api/ps` -> `size_vram/size` | <50% GPU | `model_cpu_offload` |
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

## Data Files

| File | Written By | {{tool:file_read}} By | Purpose |
|------|-----------|---------|---------|
| `/tmp/openclaw-litellm-health.json` | healthcheck | SessionStart hook | Health snapshot |
| `/tmp/openclaw-litellm-alert-state.json` | alert script | alert script | Dedup state |
| `/tmp/openclaw-gw-llama.log` | gateway nohup | healthcheck | Gateway stdout |
| `/tmp/openclaw/openclaw-YYYY-MM-DD.log` | gateway internal | vault sync | Detailed JSONL log |

## Tuning

### Change check interval
{{tool:file_edit}} `~/.config/systemd/user/openclaw-litellm-healthcheck.timer`:
```ini
OnCalendar=*:0/5   # Change 5 to desired minutes
```
Then: `systemctl --user daemon-reload && systemctl --user restart openclaw-litellm-healthcheck.timer`

### Change watchdog interval
{{tool:file_edit}} `CHECK_INTERVAL=30` in `~/.config/ai-tools-manager/openclaw/scripts/openclaw-litellm-watchdog.sh`
Then: `systemctl --user restart openclaw-litellm-watchdog`

### Change alert cooldown
{{tool:file_edit}} `COOLDOWN_SECS=900` in `~/.config/ai-tools-manager/openclaw/scripts/openclaw-litellm-alert.sh`

### Disable specific alert channel
Comment out the relevant channel section in `openclaw-litellm-alert.sh`.
