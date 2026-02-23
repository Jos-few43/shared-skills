---
name: openclaw-litellm-troubleshoot
description: >-
  Use when openclaw-litellm has issues — gateway won't start, model gives empty
  responses, Telegram not responding, slow performance, VRAM problems. Provides
  diagnosis decision trees with exact commands.
---

# OpenClaw LiteLLM Troubleshooting

## Quick Diagnosis

Run the health check first:
```bash
bash ~/.config/ai-tools-manager/openclaw/scripts/openclaw-litellm-healthcheck.sh
cat /tmp/openclaw-litellm-health.json | python3 -m json.tool
```

## Decision Trees

### Gateway Won't Start

```
Gateway won't start
+-- "gateway already running; lock timeout"
|   +-- Fix: rm -f /tmp/openclaw-1000/gateway.*.lock
+-- "EADDRINUSE :18790"
|   +-- Fix: ss -tlnp | grep 18790  ->  kill the PID holding the port
+-- Starts but loads wrong config (e.g., anthropic/claude-sonnet)
|   +-- Cause: OPENCLAW_CONFIG_DIR not inherited
|   +-- Fix: Use `nohup env OPENCLAW_CONFIG_DIR=... OPENCLAW_HOME=... openclaw gateway`
|   +-- NEVER use shell `export` — it doesn't survive nohup/distrobox chains
+-- "Config invalid" / JSON parse error
|   +-- Fix: python3 -c "import json; json.load(open('/opt/openclaw-litellm/config/.openclaw/openclaw.json'))"
|   +-- Common: nativeSkills must be "auto" (not "off")
+-- Telegram "getUpdates conflict"
    +-- Cause: Another bot instance polling same token
    +-- Fix: Kill other gateway (openclaw-dev?), or use different bot token
```

### Empty / Broken Responses

```
Empty or broken responses
+-- Qwen3 models -> thinking mode consumes all tokens
|   +-- Symptom: 500+ second response, empty text
|   +-- Fix: Switch to llama32-3b-tools (doesn't have thinking mode)
+-- Model not loaded in Ollama
|   +-- Check: curl http://127.0.0.1:11434/api/ps
|   +-- Fix: Pre-warm with curl generate API
+-- Context overflow (input > contextWindow)
|   +-- Check: bootstrapMaxChars in config (should be <=8000 for 16K ctx)
|   +-- Fix: Reduce AGENTS.md, reduce bootstrapMaxChars
+-- Tool schema injection bloat
    +-- Info: ALL 22 tools inject schemas (~17K chars) regardless of deny list
    +-- Mitigation: Keep total system prompt + tools < 12K chars
```

### Telegram Silent

```
Telegram not responding
+-- Bot not polling
|   +-- Check: tail /tmp/openclaw-gw-llama.log | grep telegram
|   +-- Expected: "[telegram] starting provider (@LocaLLMclawbot)"
+-- getUpdates conflict (409)
|   +-- Cause: Two bot instances using same token
|   +-- Fix: Kill other instance, or wait for backoff to resolve
+-- Model timeout (>600s)
|   +-- Cause: Model too slow, context too large
|   +-- Fix: Switch to smaller model, reduce context
+-- Delivery recovery spam
    +-- Cause: Old failed messages retrying via embedded agent
    +-- Fix: rm -rf /opt/openclaw-litellm/config/.openclaw/delivery/*
```

### Slow Responses

```
Slow responses (>10s for simple greeting)
+-- Model not in VRAM (cold load ~6s overhead)
|   +-- Check: curl http://127.0.0.1:11434/api/ps (empty = not loaded)
|   +-- Fix: Pre-warm model
+-- Model partially CPU-offloaded
|   +-- Check: api/ps -> size_vram / size < 50%
|   +-- Fix: Use smaller model, or reduce context window
+-- Large context window consuming VRAM
|   +-- Check: Modelfile PARAMETER num_ctx
|   +-- Fix: Reduce from 16384 to 8192
+-- Other GPU processes competing for VRAM
    +-- Check: nvidia-smi
    +-- Fix: Close competing processes
```

## Key Config Locations

| Config | Path (inside openclaw-litellm container) |
|--------|------------------------------------------|
| Main config | `/opt/openclaw-litellm/config/.openclaw/openclaw.json` |
| Agent models | `/opt/openclaw-litellm/config/agents/main/agent/models.json` |
| AGENTS.md | `/opt/openclaw-litellm/config/workspace/AGENTS.md` |
| Sessions | `/opt/openclaw-litellm/config/.openclaw/sessions/` |
| Delivery queue | `/opt/openclaw-litellm/config/.openclaw/delivery/` |
| Lock files | `/tmp/openclaw-1000/gateway.*.lock` (shared across containers) |

## Nuclear Option: Full Reset

```bash
# Kill everything
distrobox enter openclaw-litellm -- pkill -f openclaw-gateway || true
rm -f /tmp/openclaw-1000/gateway.*.lock

# Clear all sessions and delivery queue
distrobox enter openclaw-litellm -- rm -rf \
  /opt/openclaw-litellm/config/.openclaw/sessions/* \
  /opt/openclaw-litellm/config/.openclaw/delivery/*

# Unload model from VRAM
curl -s http://127.0.0.1:11434/api/generate -d '{"model":"llama32-3b-tools","keep_alive":0}'

# Fresh start
distrobox enter openclaw-litellm -- bash -c '
  nohup env OPENCLAW_CONFIG_DIR=/opt/openclaw-litellm/config \
    OPENCLAW_HOME=/opt/openclaw-litellm/config \
    openclaw gateway --bind loopback --port 18790 --allow-unconfigured --force \
    > /tmp/openclaw-gw-llama.log 2>&1 &
'
sleep 8
curl -s http://127.0.0.1:11434/api/generate \
  -d '{"model":"llama32-3b-tools","prompt":"hi","stream":false,"options":{"num_predict":5}}'
```
