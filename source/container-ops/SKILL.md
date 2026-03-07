---
name: container-ops
description: Use when managing distrobox containers, troubleshooting container issues, or running commands across containers on Bazzite (immutable Fedora Atomic).
requires:
  - shell_exec
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
| `dev-tools` | Language servers + runtimes | — |
| `litellm-router` | haproxy reverse proxy | 4000 |
| `litellm-dev` | LiteLLM blue | 4001 |
| `litellm-green` | LiteLLM green | 4002 |
| `fedora-tools` | General CLI | — |
| `n8n-dev` | n8n workflow automation | 5678 |

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

## Anti-Patterns

- Never install software on the host (Bazzite is immutable)
- Never use `~/.config/<tool>/` inside containers — use `/opt/<tool>/`
- Never hardcode absolute home paths — use `$HOME`
- Never skip sourcing `/etc/profile.d/*.sh` in one-liners
