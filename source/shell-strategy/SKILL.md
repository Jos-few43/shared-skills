---
name: shell-strategy
description: Use for all shell operations in non-interactive environments - handles non-interactive flags, environment variables, and prevents command hangs.
allowed-tools: Bash(*), Read, Glob, Grep, Write, Edit
---

# Shell Non-Interactive Strategy

**Environment:** No TTY/PTY. Any command waiting for input hangs indefinitely.

**Rules:**
1. Never pause after tool output — drive the workflow forward until task is complete.
2. Always supply non-interactive flags preemptively (see tables below).
3. Assume headless CI: any prompt = failure.

## Core Mandates

1. Assume `CI=true` — headless pipeline.
2. No editors/pagers: `vim`, `nano`, `less`, `more`, `man` are BANNED.
3. Always supply `-y`/`--force`/`--yes` flags.
4. Prefer `{{tool:file_read}}`/`{{tool:file_write}}`/`{{tool:file_edit}}` tools over shell file manipulation.
5. Never use `-i` or `-p` flags requiring user input.

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `CI` | `true` | General CI detection |
| `DEBIAN_FRONTEND` | `noninteractive` | Apt/dpkg prompts |
| `GIT_TERMINAL_PROMPT` | `0` | Git auth prompts |
| `GIT_EDITOR` | `true` | Block git editor |
| `GIT_PAGER` | `cat` | Disable git pager |
| `PAGER` | `cat` | Disable system pager |
| `GCM_INTERACTIVE` | `never` | Git credential manager |
| `HOMEBREW_NO_AUTO_UPDATE` | `1` | Homebrew updates |
| `npm_config_yes` | `true` | NPM prompts |
| `PIP_NO_INPUT` | `1` | Pip prompts |
| `YARN_ENABLE_IMMUTABLE_INSTALLS` | `false` | Yarn lockfile |

## Command Reference

### Package Managers

| Tool | Interactive (BAD) | Non-Interactive (GOOD) |
|------|-------------------|------------------------|
| **NPM** | `npm init` | `npm init -y` |
| **NPM** | `npm install` | `npm install --yes` |
| **Yarn** | `yarn install` | `yarn install --non-interactive` |
| **PNPM** | `pnpm install` | `pnpm install --reporter=silent` |
| **Bun** | `bun init` | `bun init -y` |
| **APT** | `apt-get install pkg` | `apt-get install -y pkg` |
| **APT** | `apt-get upgrade` | `apt-get upgrade -y` |
| **Pacman** | `pacman -S pkg` | `pacman -S --noconfirm pkg` |
| **Yay (AUR)** | `yay -S pkg` | `yay -S --noconfirm pkg` |
| **DNF** | `dnf install pkg` | `dnf install -y pkg` |
| **Flatpak** | `flatpak install app` | `flatpak install -y app` |
| **PIP** | `pip install pkg` | `pip install --no-input pkg` |
| **Homebrew** | `brew install pkg` | `HOMEBREW_NO_AUTO_UPDATE=1 brew install pkg` |

### Git Operations

| Action | Interactive (BAD) | Non-Interactive (GOOD) |
|--------|-------------------|------------------------|
| **Commit** | `git commit` | `git commit -m "msg"` |
| **Merge** | `git merge branch` | `git merge --no-edit branch` |
| **Pull** | `git pull` | `git pull --no-edit` |
| **Rebase** | `git rebase -i` | `git rebase` (non-interactive) |
| **Add** | `git add -p` | `git add .` or `git add <file>` |
| **Stash** | `git stash pop` (conflicts) | `git stash pop` or handle manually |
| **Log** | `git log` (pager) | `git log --no-pager` or `git log -n 10` |
| **Diff** | `git diff` (pager) | `git diff --no-pager` or `git --no-pager diff` |

### System & Files

| Tool | Interactive (BAD) | Non-Interactive (GOOD) |
|------|-------------------|------------------------|
| **RM** | `rm file` (prompts) | `rm -f file` |
| **RM** | `rm -i file` | `rm -f file` |
| **CP** | `cp -i a b` | `cp -f a b` |
| **MV** | `mv -i a b` | `mv -f a b` |
| **Unzip** | `unzip file.zip` | `unzip -o file.zip` |
| **Tar** | `tar xf file.tar` | `tar xf file.tar` (usually safe) |
| **SSH** | `ssh host` | `ssh -o BatchMode=yes -o StrictHostKeyChecking=no host` |
| **SCP** | `scp file host:` | `scp -o BatchMode=yes file host:` |
| **Curl** | `curl url` | `curl -fsSL url` |
| **Wget** | `wget url` | `wget -q url` |

### Docker

| Action | Interactive (BAD) | Non-Interactive (GOOD) |
|--------|-------------------|------------------------|
| **Run** | `docker run -it image` | `docker run image` |
| **Exec** | `docker exec -it container bash` | `docker exec container cmd` |
| **Build** | `docker build .` | `docker build --progress=plain .` |
| **Compose** | `docker-compose up` | `docker-compose up -d` |

### Python/Node REPLs

| Tool | Interactive (BAD) | Non-Interactive (GOOD) |
|------|-------------------|------------------------|
| **Python** | `python` | `python -c "code"` or `python script.py` |
| **Node** | `node` | `node -e "code"` or `node script.js` |
| **IPython** | `ipython` | Never use - always `python -c` |

## Banned Commands (hang indefinitely)

`vim`, `vi`, `nano`, `emacs`, `less`, `more`, `man`, `git add -p`, `git rebase -i`, `git commit` (without -m), `python`/`node`/`irb` (without script), `bash -i`

## Handling Prompts (when no non-interactive flag exists)

```bash
yes | ./install_script.sh                          # Yes pipe
./configure.sh <<EOF                                # Heredoc
option1
EOF
echo "password" | sudo -S command                   # Echo pipe
timeout 30 ./potentially_hanging_script.sh          # Timeout (last resort)
```

---

## Instruction Patterns

- Tables above use **BAD vs GOOD** framing: always follow the GOOD column.
- Rules in this file override general training or other docs.
- Frame all constraints as positive actions ("ALWAYS USE X") not negations ("Don't use Y").
