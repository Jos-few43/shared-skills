---
name: non-interactive-shell
description: Use when running shell commands that might prompt for input, confirmation, or launch interactive UI. Use when installing packages, running install scripts, using SSH/SCP, Docker, or any command that could hang waiting for user input.
---

# Non-Interactive Shell Commands

## Overview

Claude Code runs in a non-interactive terminal with no TTY. Any command that waits for user input **hangs indefinitely**. Always supply non-interactive flags preemptively.

## Package Managers

| Tool | WRONG (hangs) | CORRECT |
|------|---------------|---------|
| apt | `apt-get install pkg` | `apt-get install -y pkg` |
| apt | `apt-get upgrade` | `apt-get upgrade -y` |
| pacman | `pacman -S pkg` | `pacman -S --noconfirm pkg` |
| yay | `yay -S pkg` | `yay -S --noconfirm pkg` |
| dnf | `dnf install pkg` | `dnf install -y pkg` |
| pip | `pip install pkg` | `pip install --no-input pkg` |
| npm | `npm init` | `npm init -y` |
| brew | `brew install pkg` | `HOMEBREW_NO_AUTO_UPDATE=1 brew install pkg` |
| flatpak | `flatpak install app` | `flatpak install -y app` |

## SSH / SCP

| WRONG (hangs) | CORRECT |
|---------------|---------|
| `ssh user@host` | `ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new user@host` |
| `scp file user@host:` | `scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new file user@host:` |

`BatchMode=yes` fails fast instead of hanging on password prompts. `StrictHostKeyChecking=accept-new` auto-accepts new host keys without prompting.

## Docker

| WRONG (hangs) | CORRECT |
|---------------|---------|
| `docker run -it image` | `docker run image cmd` |
| `docker exec -it container bash` | `docker exec container cmd` |
| `docker-compose up` (foreground) | `docker-compose up -d` |
| `docker build .` | `docker build --progress=plain .` |

Never use `-it` flags — there is no TTY to attach.

## Handling Unknown Scripts

When a script might prompt for input:

```bash
# Pipe "yes" to auto-confirm
yes | ./install_script.sh

# Or with timeout as safety net (30s)
timeout 30 ./install_script.sh || echo "Script timed out — may need manual input"

# Heredoc for scripts expecting specific input
./configure.sh <<EOF
option1
option2
EOF
```

## Banned Commands

These **always hang** — never run them:

- **Editors**: `vim`, `vi`, `nano`, `emacs`, `pico`
- **Pagers**: `less`, `more`, `most`, `man`
- **Interactive git**: `git add -p`, `git rebase -i`, `git commit` (without `-m`)
- **REPLs without args**: `python`, `node`, `irb` (use `python -c "code"` or `python script.py`)
- **Interactive shells**: `bash -i`, `zsh -i`

## Environment Variables

Set these before commands that lack non-interactive flags:

```bash
CI=true DEBIAN_FRONTEND=noninteractive apt-get install -y pkg
GIT_TERMINAL_PROMPT=0 git clone https://example.com/repo.git
```

| Variable | Purpose |
|----------|---------|
| `CI=true` | General CI detection |
| `DEBIAN_FRONTEND=noninteractive` | Suppress dpkg prompts |
| `GIT_TERMINAL_PROMPT=0` | Prevent git auth prompts |
| `PAGER=cat` | Disable pager |
