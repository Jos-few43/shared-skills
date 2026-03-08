---
name: runbook-generator
description: Generate operational runbooks for services and stacks. Use when documenting startup/shutdown/recovery procedures, on-call guides, or incident response playbooks for containers, LiteLLM, OpenClaw, or media stack.
argument-hint: "[service-or-stack-name]"
context: fork
allowed-tools: Bash(*), Read, Glob, Grep, Write
---

# Runbook Generator

Produces a structured operational runbook for any service or stack in the environment. Auto-discovers configuration from compose files, distrobox configs, and systemd units.

## Usage

```
/runbook-generator <service-or-stack-name>
```

Examples:
- `/runbook-generator litellm` — LiteLLM blue-green stack (ports 4000/4001/4002)
- `/runbook-generator openclaw-dev` — OpenClaw container
- `/runbook-generator arr-media-stack` — Arr media stack (Sonarr, Radarr, etc.)
- `/runbook-generator ai-agents` — OpenCode + Gemini CLI + Qwen container

## Step 1: Auto-Discovery

Before writing, gather facts about the service:

```bash
# Check distrobox containers
distrobox list

# Find compose files
find /var/home/yish -name "docker-compose*.yml" -o -name "compose*.yml" 2>/dev/null | head -20

# Check systemd units
systemctl --user list-units --type=service 2>/dev/null | grep -E "(litellm|openclaw|arr|n8n|langflow)"

# Check running ports
ss -tlnp | grep -E '4000|4001|4002|8080|8096|7878|8989|9696'

# Check container config paths
ls /var/home/yish/litellm-stack/ 2>/dev/null
ls /var/home/yish/arr-media-stack/ 2>/dev/null
ls /opt/openclaw/config/ 2>/dev/null
```

For the named service, read its compose file or config:
```bash
# LiteLLM stack
cat /var/home/yish/litellm-stack/blue/docker-compose.yml 2>/dev/null
cat /var/home/yish/litellm-stack/green/docker-compose.yml 2>/dev/null

# Arr media stack
cat /var/home/yish/arr-media-stack/docker-compose.yml 2>/dev/null

# Distrobox configs
cat /var/home/yish/distrobox-configs/*.ini 2>/dev/null | head -60
```

## Step 2: Runbook Template

Write the runbook to `~/docs/runbooks/<service>.md` using this structure:

---

# Runbook: {Service Name}

**Last Updated**: {YYYY-MM-DD}
**Owner**: yish
**Severity Contact**: on-call

---

## Overview

| Field | Value |
|---|---|
| Service | {service name} |
| Container / Stack | {distrobox container or compose project} |
| Config Path | {path to config} |
| Ports | {port list} |
| Dependencies | {upstream services} |

Brief description of what the service does and why it matters.

---

## Prerequisites

- Bazzite host with distrobox installed
- Secrets injected: `secrets inject <container>` (see `~/secrets/manifests/`)
- Required containers running: {list}

---

## Startup Procedure

### Normal Start

```bash
# For distrobox containers:
distrobox enter <container> -- bash -c "source /etc/profile.d/<container>.sh && <start-command>"

# For compose stacks:
cd ~/arr-media-stack && podman-compose up -d

# For LiteLLM blue-green:
# Blue (port 4001):
cd ~/litellm-stack/blue && podman-compose up -d
# Green (port 4002):
cd ~/litellm-stack/green && podman-compose up -d
# Router (port 4000):
cd ~/litellm-stack/router && podman-compose up -d
```

### Verify Startup

```bash
# Container running:
distrobox list | grep <container>

# LiteLLM health:
curl -s http://localhost:4001/health | jq .
curl -s http://localhost:4002/health | jq .
curl -s http://localhost:4000/health | jq .

# Port open:
ss -tlnp | grep <port>
```

---

## Shutdown Procedure

```bash
# Distrobox container:
distrobox stop <container>

# Compose stack (graceful):
cd ~/<stack-dir> && podman-compose down

# Force stop (last resort):
podman stop <container-name>
```

---

## Health Check

Run after startup and periodically during incidents:

```bash
# Stack status overview:
distrobox list
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Service-specific health:
# LiteLLM:
bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh

# OpenClaw:
bash ~/.config/ai-tools-manager/openclaw/scripts/verify-config.sh openclaw-dev

# Port check:
ss -tlnp | grep -E '4000|4001|4002'
```

Expected healthy output: all services UP, ports listening, health endpoints returning `{"status": "ok"}`.

---

## Common Issues

### Container Won't Start

**Symptom**: `distrobox enter` hangs or errors.

```bash
# Check container state:
podman ps -a | grep <container>

# View startup logs:
podman logs <container> --tail 50

# Recreate if corrupted:
distrobox rm <container> --force
distrobox create --name <container> --image <image>
```

### Port Already in Use

**Symptom**: `address already in use` on startup.

```bash
# Find what's using the port:
ss -tlnp | grep <port>
fuser <port>/tcp

# Kill conflicting process (confirm it's safe first):
fuser -k <port>/tcp
```

### Secrets Not Injected

**Symptom**: Service starts but API calls fail with 401/403.

```bash
# Re-inject secrets:
secrets inject <container>

# Verify .env exists:
ls -la ~/litellm-stack/blue/.env
cat ~/secrets/manifests/<container>.yaml
```

### LiteLLM Blue-Green Switch

**Symptom**: Router (4000) forwarding to wrong backend.

```bash
# Check router config:
cat ~/litellm-stack/router/haproxy.cfg

# Switch active backend (blue → green):
# Edit haproxy.cfg to change default_backend
podman-compose -f ~/litellm-stack/router/docker-compose.yml restart
```

---

## Recovery Procedures

### Full Stack Restart

```bash
# Stop all:
cd ~/litellm-stack/router && podman-compose down
cd ~/litellm-stack/green && podman-compose down
cd ~/litellm-stack/blue && podman-compose down

# Re-inject secrets:
secrets inject --all

# Start in order (blue first, then router):
cd ~/litellm-stack/blue && podman-compose up -d
sleep 5
cd ~/litellm-stack/router && podman-compose up -d

# Verify:
bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh
```

### Container Reset (Distrobox)

```bash
# Stop and remove:
distrobox stop <container>
distrobox rm <container> --force

# Recreate from config:
cat ~/distrobox-configs/<container>.ini
distrobox assemble --file ~/distrobox-configs/<container>.ini

# Re-inject secrets:
secrets inject <container>
```

---

## Rollback

### Compose Stack Rollback

```bash
# Check recent image tags:
podman images | grep <service>

# Pin to previous image in compose file:
# image: ghcr.io/org/service:v1.2.3  # revert to known good version
podman-compose down && podman-compose up -d
```

### LiteLLM Config Rollback

```bash
# LiteLLM config is git-tracked:
cd ~/litellm-stack
git log --oneline -10
git checkout <previous-sha> -- blue/config.yaml
podman-compose -f blue/docker-compose.yml restart
```

---

## Escalation

If the above steps do not resolve the issue:

1. Check `~/docs/incidents/` for similar past incidents
2. Run `/incident-commander <service> <symptom>` for structured response
3. Check upstream status pages and GitHub issues
4. Review container logs in full: `podman logs <container> --since 1h`
