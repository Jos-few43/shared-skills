---
name: codebase-onboarding
description: Systematically explore and understand an unfamiliar codebase. Use when forking upstream repos, joining new projects, or trying to understand how a codebase works.
argument-hint: "[repo-path]"
context: fork
allowed-tools: Bash(*), Read, Glob, Grep
---

# Codebase Onboarding

Systematic exploration of an unfamiliar repository. Produces an architectural summary, key file map, and gotcha list — enough to work effectively in the codebase.

## Usage

```
/codebase-onboarding <repo-path>
```

Examples:
- `/codebase-onboarding ~/PROJECTz/opencode-manager` — explore the opencode-manager fork
- `/codebase-onboarding ~/PROJECTz/opencode-antigravity-multi-auth` — explore the antigravity plugin
- `/codebase-onboarding ~/shared-skills` — explore this skill library

## Phase 1: Structure Scan

Get a high-level picture before reading any code.

```bash
# File tree (depth 3, ignore node_modules/dist/build):
find <repo-path> -maxdepth 3 \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/__pycache__/*" \
  | sort

# Count files by type:
find <repo-path> -type f | grep -oE '\.[^.]+$' | sort | uniq -c | sort -rn | head -20

# Top-level files (often the most important):
ls -la <repo-path>/
```

Read these files in order (if they exist):

1. `README.md` or `README.rst` — project overview, setup, usage
2. `CLAUDE.md` — AI-specific instructions
3. `CONTRIBUTING.md` — development workflow
4. Package manifest — dependencies and scripts:
   - `package.json` (Node.js)
   - `pyproject.toml` or `setup.py` (Python)
   - `Cargo.toml` (Rust)
   - `go.mod` (Go)
5. `Makefile` or `justfile` — available tasks

## Phase 2: Architecture

Identify how the codebase is organized and where to find things.

### Entry Points

```bash
# Node.js — find main entry:
cat <repo-path>/package.json | grep -E '"main"|"bin"|"scripts"'

# Python — find __main__ or app factory:
grep -r "if __name__" <repo-path>/src/ --include="*.py" -l
grep -r "app = Flask\|app = FastAPI\|create_app" <repo-path> --include="*.py" -l

# Go — find main package:
grep -r "^func main()" <repo-path> --include="*.go" -l

# Rust — Cargo.toml [[bin]] sections:
grep -A2 "\[\[bin\]\]" <repo-path>/Cargo.toml 2>/dev/null
```

### Module Boundaries

```bash
# Node.js — top-level src directories:
ls <repo-path>/src/ 2>/dev/null

# Look for index files (public API boundaries):
find <repo-path>/src -name "index.ts" -o -name "index.js" | head -20

# Python packages:
find <repo-path> -name "__init__.py" | head -20
```

### Dependency Graph

```bash
# Node.js — key deps:
cat <repo-path>/package.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
for k,v in sorted(deps.items()): print(f'  {k}: {v}')
"

# Python:
cat <repo-path>/pyproject.toml 2>/dev/null | grep -A50 "\[project.dependencies\]"
cat <repo-path>/requirements.txt 2>/dev/null

# Check for monorepo structure:
ls <repo-path>/packages/ <repo-path>/apps/ <repo-path>/libs/ 2>/dev/null
```

## Phase 3: Patterns

Understand the conventions used in this codebase before writing any code.

### Coding Style

```bash
# Find linting config:
ls <repo-path>/.eslintrc* <repo-path>/eslint.config* \
   <repo-path>/.prettierrc* <repo-path>/pyproject.toml \
   <repo-path>/.ruff.toml 2>/dev/null

# Check formatting style from existing files (tabs vs spaces, quote style):
head -50 <repo-path>/src/index.ts 2>/dev/null || head -50 <repo-path>/main.py 2>/dev/null
```

### Test Patterns

```bash
# Find test files:
find <repo-path> -name "*.test.ts" -o -name "*.spec.ts" \
  -o -name "*_test.go" -o -name "test_*.py" 2>/dev/null | head -10

# Read one test file to understand patterns:
# (pick a representative test from the list above)

# Test runner:
cat <repo-path>/package.json | grep -E '"test"'
```

### Error Handling

```bash
# How does this codebase handle errors?
grep -r "throw new\|return err\|raise\|Result<\|Either<" <repo-path>/src \
  --include="*.ts" --include="*.go" --include="*.rs" -l | head -10
```

### Logging

```bash
# What logging library/pattern is used?
grep -r "console\.log\|logger\.\|log\.info\|tracing::" <repo-path>/src \
  --include="*.ts" --include="*.go" --include="*.rs" -l | head -5
```

## Phase 4: Key Flows

Trace 2-3 important user flows through the code to understand execution paths.

### Find the most important flows

```bash
# HTTP routes (Express/Fastify):
grep -r "app\.\(get\|post\|put\|delete\|patch\)" <repo-path>/src --include="*.ts" | head -20
grep -r "router\.\(get\|post\|put\|delete\)" <repo-path>/src --include="*.ts" | head -20

# CLI commands:
grep -r "command\|subcommand\|\.command(" <repo-path>/src --include="*.ts" | head -10

# Event handlers:
grep -r "addEventListener\|\.on(" <repo-path>/src --include="*.ts" | head -10
```

For each key flow, trace: entry point → handler → service/model → output.

### Monorepo Special Handling

```bash
# Identify workspaces:
cat <repo-path>/package.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d.get('workspaces', 'no workspaces'))
"

# List all packages:
ls <repo-path>/packages/ 2>/dev/null
ls <repo-path>/apps/ 2>/dev/null

# Find shared utilities:
ls <repo-path>/packages/shared/ <repo-path>/packages/utils/ <repo-path>/libs/ 2>/dev/null
```

## Output: Summary Report

After completing all phases, produce a structured summary:

---

### Codebase Summary: {repo-name}

**Language / Runtime**: {e.g., TypeScript 5.7, Node.js 20}
**Framework**: {e.g., Express, FastAPI, none}
**Package Manager**: {npm/yarn/pnpm/pip/cargo}
**Test Framework**: {vitest/jest/pytest/go test}

**Architecture**:
- Entry point: `{path}`
- Key modules: `{module1}`, `{module2}`, `{module3}`
- Data flow: {brief description}

**Key Files**:
| File | Purpose |
|---|---|
| `{path}` | {description} |
| `{path}` | {description} |

**Important Patterns**:
- Error handling: {approach}
- Logging: {library/pattern}
- Config: {env vars / config files}
- Tests: {location and runner}

**Gotchas / Non-Obvious Things**:
1. {e.g., "All async functions must use the custom `withTimeout` wrapper"}
2. {e.g., "Config is loaded once at startup — restart required for changes"}
3. {e.g., "The `packages/core` module is shared — changes affect all consumers"}

**First Steps to Contribute**:
1. `{setup command}`
2. `{run tests command}`
3. `{start dev server command}`

---
