---
name: container-command
description: Use when user wants to quickly enter a distrobox container and run a command. Shortcut for container operations.
requires:
  - shell_exec
---

# Container Command

Quick shortcut for running commands inside distrobox containers.

## Usage

When invoked, ask which container and command to run. If the user provides both, execute directly.

## Available Containers

| Container | Purpose |
|---|---|
| `ai-agents` | OpenCode, Gemini CLI, Qwen |
| `openclaw-dev` | OpenClaw |
| `dev-tools` | Language servers (TS, Python, Go, Rust) |
| `fedora-tools` | General CLI tools |
| `litellm-router` | haproxy reverse proxy |
| `litellm-dev` | LiteLLM blue (port 4001) |
| `litellm-green` | LiteLLM green (port 4002) |

## Pattern

```bash
distrobox enter <container> -- bash -c '<command>'
```

For containers with environment setup:
```bash
distrobox enter ai-agents -- bash -c 'source /etc/profile.d/ai-agents.sh && <command>'
distrobox enter openclaw-dev -- bash -c 'export OPENCLAW_CONFIG_DIR=/opt/openclaw/config && <command>'
distrobox enter dev-tools -- bash -c 'source /etc/profile.d/dev-tools.sh && <command>'
```

## Quick Commands

- `distrobox list` — show all containers and their status
- `distrobox stop --yes <name>` — stop a container
- `distrobox enter <name>` — enter interactive shell
