---
name: static-analysis
description: Run tool-driven static analysis on your own codebase — finding bugs, style issues, and security anti-patterns via linters and analyzers (semgrep, eslint, ruff, clippy, shellcheck). For package vulnerabilities, use dependency-audit. For vetting untrusted code, use sanitize.
argument-hint: "[file-or-directory]"
context: fork
allowed-tools: Bash(*), Read, Glob, Grep, Write
---

# Static Analysis — Structured Code Quality Pipeline

Runs available linters and static analyzers against a target path, categorizes findings by severity, and writes a structured report. Works across Python, JavaScript/TypeScript, Rust, Go, and Shell.

## Usage

```
/static-analysis .
/static-analysis src/
/static-analysis ./scripts/deploy.sh
/static-analysis ~/PROJECTz/opencode-manager/
```

If no argument is given, analyze the current working directory.

## Phase 1 — Language Detection

Detect which languages are present in the target path:

```bash
# Count files by extension to determine primary languages
find <target> -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20
```

Build a language set from the results. Supported languages and their indicators:

| Language | File Extensions |
|---|---|
| JavaScript / TypeScript | `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs` |
| Python | `.py` |
| Rust | `.rs`, `Cargo.toml` |
| Go | `.go`, `go.mod` |
| Shell / Bash | `.sh`, `.bash`, files with `#!/bin/bash` or `#!/bin/sh` shebang |

## Phase 2 — Tool Detection

Check which analyzers are available. Never install tools on the host — if a tool is missing, suggest the appropriate distrobox container command.

```bash
command -v semgrep && echo "semgrep: ok" || echo "semgrep: missing"
command -v eslint && echo "eslint: ok" || echo "eslint: missing"
command -v tsc && echo "tsc: ok" || echo "tsc: missing"
command -v ruff && echo "ruff: ok" || echo "ruff: missing"
command -v bandit && echo "bandit: ok" || echo "bandit: missing"
command -v mypy && echo "mypy: ok" || echo "mypy: missing"
command -v cargo && echo "cargo/clippy: ok" || echo "cargo: missing"
command -v go && echo "go vet: ok" || echo "go: missing"
command -v staticcheck && echo "staticcheck: ok" || echo "staticcheck: missing"
command -v shellcheck && echo "shellcheck: ok" || echo "shellcheck: missing"
```

### Tool Install Guidance (if missing)

Bazzite is an immutable host — never install directly. Use distrobox:

```bash
# Python tools → fedora-tools or ai-agents container
distrobox enter fedora-tools -- pip install ruff bandit mypy

# Node/JS tools → project devDependencies (preferred) or fedora-tools
distrobox enter fedora-tools -- npm install -g eslint typescript

# Rust tools → available if cargo is installed in the container
distrobox enter fedora-tools -- rustup component add clippy

# Go tools
distrobox enter fedora-tools -- go install honnef.co/go/tools/cmd/staticcheck@latest

# Shell tools
distrobox enter fedora-tools -- sudo dnf install -y ShellCheck

# Semgrep (generic, works on all languages)
distrobox enter fedora-tools -- pip install semgrep
```

## Phase 3 — Run Analyzers

Run all available tools for detected languages. Capture output; do not abort on non-zero exit (linters exit non-zero when findings exist).

### JavaScript / TypeScript

```bash
# ESLint — use project config if present, else sensible defaults
eslint <target> --format json --no-eslintrc --rule '{"no-eval": "error", "no-implied-eval": "error"}' 2>/dev/null \
  || eslint <target> --format json 2>/dev/null

# TypeScript type checking (no emit)
tsc --noEmit --allowJs --checkJs 2>&1
```

### Python

```bash
# Ruff — fast linter covering flake8, isort, pyupgrade rules
ruff check <target> --output-format json 2>/dev/null

# Bandit — security-focused analysis
bandit -r <target> -f json 2>/dev/null

# Mypy — type checking
mypy <target> --ignore-missing-imports 2>&1
```

### Rust

```bash
# Cargo clippy — extended lints beyond rustc
cargo clippy --message-format json 2>/dev/null

# Cargo audit — dependency vulnerability check (if installed)
command -v cargo-audit && cargo audit --json 2>/dev/null
```

### Go

```bash
# Go vet — built-in correctness checks
go vet ./... 2>&1

# Staticcheck — extended static analysis
staticcheck ./... 2>&1
```

### Shell / Bash

```bash
# ShellCheck — find scripts and analyze
find <target> -name "*.sh" -o -name "*.bash" | xargs shellcheck --format json 2>/dev/null
# Also check files with bash/sh shebangs
grep -rl "#!/bin/bash\|#!/bin/sh" <target> --include="*" | xargs shellcheck --format json 2>/dev/null
```

### Generic (Semgrep)

Run semgrep on all languages as a catch-all, especially for security patterns:

```bash
semgrep --config=auto <target> --json 2>/dev/null
```

## Phase 4 — Parse and Categorize Findings

Parse each tool's output into a normalized finding structure:

```
{
  file: string,
  line: number,
  severity: "critical" | "high" | "medium" | "low" | "info",
  category: "Security" | "Bug" | "Performance" | "Style" | "Type",
  rule: string,
  message: string,
  tool: string
}
```

### Severity Mapping

| Category | Default Severity | Examples |
|---|---|---|
| Security | critical | SQL injection, eval, hardcoded secrets, shell injection |
| Bug | high | Null dereference, undefined variable, unreachable code |
| Performance | medium | Inefficient loops, unnecessary allocations |
| Type | medium | Type mismatches, missing type annotations |
| Style | low | Formatting, naming conventions, dead code |

Override severity upward when a rule is explicitly security-related (e.g., bandit B-series, semgrep `security.*` rules, eslint `no-eval`).

## Phase 5 — Generate Report

Sort findings: critical → high → medium → low → info. Write report to:

```
~/docs/reports/static-analysis-YYYY-MM-DD-<target-basename>.md
```

Create `~/docs/reports/` if it does not exist.

### Report Structure

```markdown
# Static Analysis Report

**Target:** <absolute path>
**Date:** YYYY-MM-DD
**Tools Run:** [list of tools that produced output]
**Tools Missing:** [list of tools not found, with install hint]

## Summary

| Severity | Count |
|---|---|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| Info | N |
| **Total** | **N** |

## Critical Findings

### <file>:<line> — <rule>
**Tool:** <tool> | **Category:** Security
> <message>

[repeat for each finding]

## High Findings
...

## Medium Findings
...

## Low Findings
...

## Next Steps

- [ ] Address all Critical findings before release
- [ ] Review High findings — fix or document accepted risk
- [ ] Consider running `/sanitize` for deep AI-assisted review of Critical/High items
- [ ] Re-run after fixes: `/static-analysis <target>`
```

## Integration with Sanitize

For any Critical or High security findings, cross-reference with the `sanitize` skill for AI-assisted deep analysis:

```
/sanitize <file-with-critical-finding>
```

The `sanitize` skill provides verdict-based AI analysis; `static-analysis` provides tool-driven coverage. Together they form a complete pre-release security review.

## Output

After running, report back with:
1. Total finding counts by severity
2. Top 3 most critical issues (file, line, message)
3. Path to the full report
4. Any tools that were missing (with install commands)
