---
name: distrobox-management
description: Use when user asks to install software, run tools, manage containers, or work in development environments on an immutable Linux host (Bazzite/Fedora atomic). Use when encountering "command not found" on the host.
---

# Distrobox Management

## Overview

Manage distrobox containers on Bazzite (immutable Fedora atomic). Containers are the preferred way to install packages and run tools — avoid rpm-ostree layering unless absolutely necessary.

## Key Heuristic

**"Install X" or "command not found" → use a distrobox container, not rpm-ostree.**

## Setup

- Config: `~/.config/distrobox/containers.ini` (distrobox-assemble INI format, source of truth)
- CLI: `dbx` command wraps distrobox with ergonomic subcommands
- Runtime: Docker
- GPU: NVIDIA RTX 3060 — all containers use `nvidia=true`

## Quick Reference

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

## Autonomy Rules

**Do freely:**
- `dbx list`, `dbx status`, `dbx diff` (read-only)
- `dbx apply` (sync existing config)
- `dbx enter`, `dbx run` (enter/run commands)
- `dbx add` (create new containers)
- Install packages inside containers (`dbx run <name> sudo pacman -S ...`)

**Confirm with user first:**
- `dbx destroy` (removes container)
- `dbx apply --replace` (recreates containers)
- Removing sections from `containers.ini`
- Destructive operations inside containers (rm -rf, etc.)

## Container Selection

| Need | Container | Package manager |
|------|-----------|----------------|
| AUR packages | bazzite-arch | pacman / yay |
| Fedora packages | fedora-dev (if created) | dnf |
| Ubuntu/Debian compat | ubuntu-compat (if created) | apt |
| Lightweight CLI tools | alpine-tools (if created) | apk |

If no suitable container exists, use `dbx add` to create one from an appropriate base image.

## Common Patterns

Install a package (Arch):
```bash
dbx run bazzite-arch sudo pacman -S --noconfirm <package>
```

Install a package and export binary to host:
```bash
dbx run bazzite-arch sudo pacman -S --noconfirm <package>
dbx export bazzite-arch <binary-name>
```

Create a dev environment:
```bash
dbx add myproject-dev registry.fedoraproject.org/fedora-toolbox:43
dbx run myproject-dev sudo dnf install -y gcc make nodejs
```

## INI Format Reference

Containers are defined in `~/.config/distrobox/containers.ini`:

```ini
[container-name]
image=registry/image:tag
pull=true
nvidia=true
additional_packages="pkg1 pkg2 pkg3"
init=false
start_now=false
```

After editing the INI file, run `dbx apply` to sync.

## AI Tools Container Isolation

**For AI tools (OpenCode, OpenClaw, Gemini, Qwen) in distrobox containers, see the dedicated skill:**

**ai-tools-container-isolation** - Complete guide for properly isolating AI tool configurations in containers.

**Key pattern**: Always use `/opt/<tool>/config/` + `/etc/profile.d/<tool>.sh` (NOT `~/.config/` which is shared with host!)

See `~/AI-TOOLS-SETUP.md` and `~/CLAUDE.md` for complete setup examples.
