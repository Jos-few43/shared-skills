---
name: incident-commander
description: Coordinate incident response when services are down or degraded. Use when containers crash, LiteLLM returns errors, OpenClaw is unresponsive, or the media stack has issues.
argument-hint: "[service] [symptom]"
allowed-tools: Bash(*), Read, Glob, Grep, Write
---

# Incident Commander

Structured incident response for the home lab stack. Runs triage, classifies severity, guides resolution, and logs the incident.

## Usage

```
/incident-commander <service> <symptom>
```

Examples:
- `/incident-commander litellm 502 errors from router`
- `/incident-commander openclaw-dev container not starting`
- `/incident-commander ai-agents opencode crashes on launch`
- `/incident-commander arr-media-stack sonarr not downloading`

## Step 1: Severity Classification

Classify the incident before doing anything else:

| Severity | Criteria | Response Time |
|---|---|---|
| **P1** | All AI tools down, no LLM access, blocking all work | Immediate |
| **P2** | Single critical service down (LiteLLM router, OpenClaw), degraded workflow | < 15 min |
| **P3** | One backend degraded (blue/green), fallback available | < 1 hour |
| **P4** | Non-critical service issue (media stack, n8n, langflow) | Best effort |

Determine severity based on the affected service and symptom provided.

## Step 2: Triage Decision Tree

Work through this tree systematically:

### 2.1 — Is the container running?

```bash
distrobox list
podman ps -a --format "table {{.Names}}\t{{.Status}}" | grep <service>
```

- **Container missing entirely** → recreate from distrobox config (see Recovery)
- **Container stopped** → `distrobox enter <container>` or `podman start <container>`
- **Container running** → proceed to 2.2

### 2.2 — What do the logs say?

```bash
# Last 100 lines:
podman logs <container> --tail 100

# Since last hour:
podman logs <container> --since 1h 2>&1 | tail -50

# For compose stacks:
podman-compose -f ~/litellm-stack/blue/docker-compose.yml logs --tail 50
```

Look for: OOM kills, port conflicts, missing env vars, auth failures, import errors.

### 2.3 — Are dependencies healthy?

```bash
# LiteLLM depends on: secrets injected, config valid, port available
curl -s http://localhost:4001/health | jq .
curl -s http://localhost:4002/health | jq .
curl -s http://localhost:4000/health | jq .

# Check ports:
ss -tlnp | grep -E '4000|4001|4002'

# Secrets present:
ls ~/litellm-stack/blue/.env ~/litellm-stack/green/.env ~/litellm-stack/router/.env 2>&1

# OpenClaw depends on: openclaw-dev container, config dir
distrobox enter openclaw-dev -- bash -c "ls /opt/openclaw/config/" 2>/dev/null
```

### 2.4 — Service-specific checks

**LiteLLM (ports 4000/4001/4002)**:
```bash
bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh
# Check which backend is active:
cat ~/litellm-stack/router/haproxy.cfg | grep default_backend
```

**OpenClaw (openclaw-dev container)**:
```bash
# See /openclaw-troubleshooting for full guide
distrobox enter openclaw-dev -- bash -c "openclaw --version" 2>/dev/null
```

**AI-agents (OpenCode/Gemini/Qwen)**:
```bash
distrobox enter ai-agents -- bash -c "source /etc/profile.d/ai-agents.sh && opencode --version" 2>/dev/null
```

**Arr media stack**:
```bash
podman ps | grep -E '(sonarr|radarr|prowlarr|bazarr|jellyseerr)'
curl -s http://localhost:8989/api/v3/health 2>/dev/null | jq .  # Sonarr
curl -s http://localhost:7878/api/v3/health 2>/dev/null | jq .  # Radarr
```

## Step 3: Common Failure Modes

### LiteLLM 502/503 from Router

1. Check if active backend is up: `curl -s http://localhost:4001/health`
2. If blue is down, switch to green in haproxy.cfg and restart router
3. If both down: `secrets inject litellm-dev && cd ~/litellm-stack/blue && podman-compose up -d`

### Container OOM Kill

```bash
# Verify OOM:
podman inspect <container> | jq '.[].State.OOMKilled'
journalctl -k | grep -i "oom\|killed" | tail -20
```

Resolution: restart container, consider raising memory limits in compose file.

### Missing / Stale Secrets

```bash
secrets check          # Warn about expiring secrets
secrets inject --all   # Re-generate all .env files
```

### Port Conflict on Startup

```bash
fuser 4001/tcp 4002/tcp 4000/tcp  # Who's using it?
# If a zombie process:
fuser -k 4001/tcp  # Confirm it's safe first
```

### OpenClaw Token Expired

See `/openclaw-token-refresh` skill for full token refresh workflow.

### Distrobox Container Corrupted

```bash
distrobox rm <container> --force
distrobox assemble --file ~/distrobox-configs/<container>.ini
secrets inject <container>
```

## Step 4: Resolution Actions

Implement the fix identified in triage. After applying the fix:

```bash
# Verify the service is healthy:
# LiteLLM:
bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh

# General container:
distrobox list
podman ps --format "table {{.Names}}\t{{.Status}}"

# Full stack overview:
# (see /stack-status-command)
```

## Step 5: Log the Incident

After resolution, write an incident log. Create `~/docs/incidents/YYYY-MM-DD-<slug>.md`:

```bash
mkdir -p /var/home/yish/docs/incidents
DATE=$(date +%Y-%m-%d)
SLUG="<service>-<short-description>"  # e.g. litellm-502-errors
OUTFILE="/var/home/yish/docs/incidents/${DATE}-${SLUG}.md"
```

Use this template:

---

# Incident: {title}

**Date**: {YYYY-MM-DD HH:MM}
**Duration**: {X minutes}
**Severity**: P{1-4}
**Service**: {service}
**Status**: Resolved / Ongoing

## Summary

One-paragraph description of what happened, how it was detected, and how it was resolved.

## Timeline

| Time | Event |
|---|---|
| HH:MM | Incident detected |
| HH:MM | Triage started |
| HH:MM | Root cause identified |
| HH:MM | Fix applied |
| HH:MM | Service restored |

## Root Cause

What caused the incident.

## Resolution

Steps taken to resolve.

## Prevention

- [ ] Action item 1 (e.g., add health check alert)
- [ ] Action item 2 (e.g., document in runbook)

## Related Skills Used

- `/stack-status-command`
- `/openclaw-troubleshooting`
- `/openclaw-litellm-troubleshoot`

---

Commit the incident log:
```bash
cd /var/home/yish/docs && git add incidents/ && git commit -m "docs(incidents): add ${DATE}-${SLUG} incident report"
```

## Related Skills

- `/stack-status-command` — full stack health overview
- `/openclaw-troubleshooting` — OpenClaw-specific debug guide
- `/openclaw-litellm-troubleshoot` — LiteLLM + OpenClaw integration issues
- `/runbook-generator` — generate a runbook for the affected service
