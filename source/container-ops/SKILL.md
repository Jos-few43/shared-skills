---
name: container-ops
description: Use when managing distrobox containers, troubleshooting container issues, or running commands across containers on Bazzite (immutable Fedora Atomic).
argument-hint: "[container] [command]"
allowed-tools: Bash(*)
---

# Container Operations

## Distrobox Basics

- All software runs in distrobox containers (host is immutable)
- Shared home (`$HOME`) is mounted in all containers
- Container-specific configs go in `~/opt-ai-agents/` or `/opt/<tool>/`
- Use `distrobox enter <name>` to access containers

## Container Inventory

| Container | Purpose | Key Ports |
|---|---|---|
| `ai-agents` | OpenCode + Gemini + Qwen | — |
| `openclaw-dev` | OpenClaw (browser, Telegram, agents) | — |
| `litellm-router` | haproxy reverse proxy | 4000 |
| `litellm-dev` | LiteLLM blue | 4001 |
| `litellm-green` | LiteLLM green | 4002 |
| `fedora-tools` | General CLI | — |
| `lmstudio-container` | LM Studio local models | — |
| `warp-term` | Warp terminal | — |
| `n8n-dev` | n8n workflow automation | 5678 |
| `langflow-dev` | Langflow AI workflow builder | — |

## Running Commands in Containers

```bash
# One-liner from host
distrobox enter <container> -- <command>

# With environment setup
distrobox enter <container> -- bash -c 'source /etc/profile.d/<tool>.sh && <command>'

# Interactive session
distrobox enter <container>
```

## Troubleshooting

### Container Won't Start
1. Check if container exists: `distrobox list`
2. Check podman status: `podman ps -a --filter name=<container>`
3. Remove and recreate: `distrobox rm <container> && distrobox create ...`

### Command Not Found in Container
1. Enter container: `distrobox enter <container>`
2. Check PATH: `echo $PATH`
3. Source environment: `source /etc/profile.d/<tool>.sh`
4. Install missing tool with container's package manager

### Network Issues Between Containers
- Containers share host network by default
- Use `localhost:<port>` for inter-container communication
- Check port bindings: `podman port <container>`

## Health Checks

```bash
# All containers
bash ~/PROJECTz/ai-container-configs/scripts/opencode-healthcheck.sh
bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh

# Specific container
distrobox enter <container> -- bash -c '<tool> --version'
podman inspect <container> --format '{{.State.Status}}'
```

## Creating New Containers

```bash
# Via management script
bash ~/PROJECTz/ai-container-configs/scripts/manage.sh create <name>

# Manual creation
distrobox create --name <name> --image <base-image> --additional-packages "<packages>"

# Setup pattern
distrobox enter <name> -- sudo mkdir -p /opt/<tool>/config
distrobox enter <name> -- sudo tee /etc/profile.d/<tool>.sh <<'EOF'
export TOOL_CONFIG_DIR=/opt/<tool>/config
EOF
```

## Container Logs

### View recent logs
```bash
podman logs --tail 100 <container-name>
```

### Follow logs in real-time
```bash
podman logs --follow --tail 50 <container-name>
```

### Filter for errors
```bash
podman logs --tail 500 <container-name> 2>&1 | grep -iE "error|exception|fatal|panic|critical"
```

### Logs since time
```bash
podman logs --since "30m" <container-name>
```

### Common Debug Patterns

| Symptom | Command |
|---|---|
| Container won't start | `podman logs <name> 2>&1 \| tail -50` |
| Service returning errors | `podman logs --since 10m <name> 2>&1 \| grep -i error` |
| Memory issues | `podman stats --no-stream <name>` |
| Network issues | `podman inspect <name> --format '{{.NetworkSettings}}'` |

Container names: distrobox containers use names directly. To list all podman containers:
```bash
podman ps --format "{{.Names}}" --all
```

## dbx CLI Quick Reference

`dbx` wraps distrobox with ergonomic subcommands. Config source of truth: `~/.config/distrobox/containers.ini`.

| Action | Command |
|--------|---------|
| List containers | `dbx list` |
| Check drift | `dbx status` |
| Preview changes | `dbx diff` |
| Sync config → containers | `dbx apply` |
| Enter container | `dbx enter <name>` |
| Run command in container | `dbx run <name> <cmd...>` |
| Add new container | `dbx add <name> <image>` |
| Remove container | `dbx destroy <name>` |
| Export app to host | `dbx export <name> <app>` |
| Edit config | `dbx edit` |

### Autonomy Rules

**Do freely:** `dbx list`, `dbx status`, `dbx diff`, `dbx apply`, `dbx enter`, `dbx run`, `dbx add`

**Confirm with user first:** `dbx destroy`, `dbx apply --replace`, removing sections from `containers.ini`, destructive operations inside containers

### Container Selection by Need

If no suitable container exists, use `dbx add` to create one from an appropriate base image.

### INI Format Reference

```ini
[container-name]
image=registry/image:tag
pull=true
nvidia=true
additional_packages="pkg1 pkg2 pkg3"
init=false
start_now=false
```

After editing the INI file, run `dbx apply` to sync. All containers use `nvidia=true` (RTX 3060).

## Anti-Patterns

- Never install software on the host (Bazzite is immutable)
- Never use `~/.config/<tool>/` inside containers — use `/opt/<tool>/`
- Never hardcode absolute home paths — use `$HOME`
- Never skip sourcing `/etc/profile.d/*.sh` in one-liners
