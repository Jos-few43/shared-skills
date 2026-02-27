---
name: dependency-bump
description: Upgrade package dependencies in projects using bun, pnpm, or pip inside distrobox containers.
requires:
  - shell_exec
---

# Dependency Bump

## Overview

Upgrades dependencies in project repos. Runs inside appropriate distrobox containers. Commits changes with conventional commit format.

## Modes

### Single package: `/dependency-bump {pkg} [--project {path}]`

1. Detect project if not specified (use CWD or ask user)
2. Detect package manager from project files:
   - `bun.lock` or `bun.lockb` → bun
   - `pnpm-lock.yaml` → pnpm
   - `package-lock.json` → npm (prefer bun)
   - `requirements.txt` or `pyproject.toml` → pip

3. Check current version using {{tool:file_read}}:

```bash
cat {project}/package.json | jq '.dependencies["{pkg}"] // .devDependencies["{pkg}"]'
```

4. Run upgrade in container:

**bun:**
```bash
distrobox enter ai-agents -- bash -c "cd {project} && bun update {pkg}"
```

**pip:**
```bash
distrobox enter fedora-tools -- bash -c "cd {project} && pip install --upgrade {pkg}"
```

5. Verify new version after upgrade using {{tool:file_read}}
6. Run tests if available:

```bash
distrobox enter ai-agents -- bash -c "cd {project} && bun test" 2>&1 || true
```

7. Commit:

```bash
cd {project} && git add package.json bun.lock* pnpm-lock.yaml* && git commit -m "chore(deps): bump {pkg} from {old} to {new}"
```

8. Update tech radar if dependency is tracked:

```bash
bash ~/SCRiPTz/tech-radar-update.sh --component "{pkg}" --field version --value "{new}"
```

### Audit: `/dependency-bump audit [--project {path}]`

Check for outdated dependencies:

**bun:**
```bash
distrobox enter ai-agents -- bash -c "cd {project} && bun outdated"
```

Present results as a table and ask which to upgrade.

### All: `/dependency-bump all [--project {path}]`

Upgrade all dependencies. Confirm with user first — this can be disruptive:

```bash
distrobox enter ai-agents -- bash -c "cd {project} && bun update"
```

## Safety

- Always run inside distrobox containers, never on host
- Show version diff before committing
- Run tests after upgrade when available
- For major version bumps, warn the user about potential breaking changes
