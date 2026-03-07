---
name: dependency-audit
description: Use when running a security audit on dependencies, scanning for vulnerabilities, checking for outdated packages, or triaging CVEs in a project. Covers bun, npm, pip, cargo, and Go ecosystems.
version: "1.0.0"
requires:
  - shell_exec
---

# Dependency Audit — Security & Vulnerability Scanning

## Overview

Scan project dependencies for known vulnerabilities and outdated packages. Always run inside distrobox containers — never install audit tools on the host. Prioritize fixes by severity: critical > high > medium > low.

## Audit Commands by Ecosystem

Detect the ecosystem from lockfiles, then run the appropriate audit inside the correct container.

### JavaScript / TypeScript (bun or npm)

```bash
# Preferred: bun
distrobox enter ai-agents -- bash -c "cd {project} && bun audit"

# Fallback: npm
distrobox enter ai-agents -- bash -c "cd {project} && npm audit --json"

# Check outdated packages
distrobox enter ai-agents -- bash -c "cd {project} && bun outdated"
```

Lockfile detection:
- `bun.lock` or `bun.lockb` → use bun
- `package-lock.json` → use npm (prefer bun if bun is available)

### Python

```bash
distrobox enter fedora-tools -- bash -c "cd {project} && pip-audit --format=json"

# If pip-audit not installed
distrobox enter fedora-tools -- bash -c "pip install pip-audit -q && pip-audit"

# Check outdated packages
distrobox enter fedora-tools -- bash -c "cd {project} && pip list --outdated"
```

### Rust

```bash
distrobox enter fedora-tools -- bash -c "cd {project} && cargo audit"

# Install if missing
distrobox enter fedora-tools -- bash -c "cargo install cargo-audit --quiet && cargo audit"

# Check outdated
distrobox enter fedora-tools -- bash -c "cd {project} && cargo outdated"
```

### Go

```bash
distrobox enter fedora-tools -- bash -c "cd {project} && govulncheck ./..."

# Install if missing
distrobox enter fedora-tools -- bash -c "go install golang.org/x/vuln/cmd/govulncheck@latest && govulncheck ./..."

# Check outdated modules
distrobox enter fedora-tools -- bash -c "cd {project} && go list -u -m all"
```

## Reading Audit Output — Severity Triage

| Severity | Action |
|---|---|
| **Critical** | Fix immediately before any other work. Block deployment if unpatched. |
| **High** | Fix in the current sprint. Do not ship new features over unresolved highs. |
| **Medium** | Schedule for the next planned dependency update cycle. |
| **Low** | Track but deprioritize. Address in bulk during routine maintenance. |
| **Info** | No action required unless it enables a higher-severity issue. |

When presenting results, group by severity and include: package name, current version, patched version, CVE ID (if available), and a one-line description of the vulnerability.

## Update vs. Pin Decision

**Update** when:
- A patched version is available and semver-compatible (patch or minor bump)
- The vulnerability is critical or high severity
- The package has a stable release history

**Pin** (stay on current, document why) when:
- The patched version introduces a breaking API change you can't absorb now
- The upstream fix is a major version bump that requires significant migration work
- The CVE has a low exploitability score and no available fix yet

**Never** silently pin a vulnerable package — leave a comment in the lockfile or a `# noqa`/`# nosec` style annotation with the CVE ID and a brief justification.

## Checking for Outdated Deps Without Breaking Things

1. Run the outdated check command for the ecosystem (see above).
2. Filter to packages with available patch or minor updates only.
3. Update one package at a time for production-critical projects; batch for dev dependencies.
4. Run tests after each update:

```bash
distrobox enter ai-agents -- bash -c "cd {project} && bun test" 2>&1 || true
```

5. Review the diff before committing — a "minor" update can still introduce behavior changes.

## Container-Aware Rules

- **Never run audit tools on the Bazzite host** — the host is immutable and lacks the runtime toolchains.
- Use `ai-agents` for JS/TS projects (has bun, node).
- Use `fedora-tools` for Python, Rust, Go (has pip, cargo, go).
- If a tool isn't installed in the container, install it with the non-interactive flag and proceed.

## Committing Audit Fixes

Use conventional commits for dependency security fixes:

```bash
git commit -m "fix(deps): patch {pkg} CVE-{id} ({old} → {new})"
```

For bulk updates:

```bash
git commit -m "chore(deps): security audit — patch {N} vulnerabilities"
```

## Upgrading Dependencies (Bump)

For routine upgrades (not security-driven), follow this flow:

### Detect package manager

- `bun.lock` or `bun.lockb` → bun
- `pnpm-lock.yaml` → pnpm
- `package-lock.json` → npm (prefer bun if available)
- `requirements.txt` or `pyproject.toml` → pip

### Single package upgrade

```bash
# bun
distrobox enter ai-agents -- bash -c "cd {project} && bun update {pkg}"

# pip
distrobox enter fedora-tools -- bash -c "cd {project} && pip install --upgrade {pkg}"
```

Always show the version diff before committing:

```bash
cat {project}/package.json | jq '.dependencies["{pkg}"] // .devDependencies["{pkg}"]'
```

### All packages

Confirm with user first — this can be disruptive:

```bash
distrobox enter ai-agents -- bash -c "cd {project} && bun update"
```

### After upgrading

1. Run tests: `distrobox enter ai-agents -- bash -c "cd {project} && bun test" 2>&1 || true`
2. Commit: `git add package.json bun.lock* && git commit -m "chore(deps): bump {pkg} from {old} to {new}"`
3. Update tech radar if dependency is tracked: `bash ~/SCRiPTz/tech-radar-update.sh --component "{pkg}" --field version --value "{new}"`

For major version bumps, warn the user about potential breaking changes before proceeding.
