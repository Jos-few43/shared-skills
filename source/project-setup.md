---
name: project-setup
description: Use when entering a new project directory for the first time or when setting up Claude Code configuration for a project. Scans for project indicators, suggests model selection, and recommends relevant skills.
targets_only: [claude_code]
---

# Project Setup — Configure Claude for This Project

## Overview

Scans the current working directory to understand the project and suggests optimal Claude Code configuration.

## When Invoked

### Step 1: Scan Project

Check for:
- **Language/framework**: package.json, Cargo.toml, pyproject.toml, go.mod, etc.
- **Existing Claude config**: `.claude/settings.json`, `CLAUDE.md`
- **Git status**: initialized? remote? branch?
- **Container context**: inside distrobox? which one?
- **Test framework**: using quicktest detection rules

### Step 2: Report Findings

```
Project: [name from package.json/Cargo.toml/etc or directory name]
Stack: [detected languages/frameworks]
Tests: [detected test runner or "none detected"]
Claude config: [exists / missing]
Git: [branch / not initialized]
```

### Step 3: Suggest Configuration

**If no `.claude/settings.json` exists**, offer to create one with:
- Appropriate effort level (medium for most, high for complex projects)
- Relevant bash allowlist entries for the detected stack

**Model recommendation:**

| Project Type | Recommended Model |
|---|---|
| Simple scripts, config changes | Haiku (fastest, cheapest) |
| Standard development, bug fixes | Sonnet (balanced) |
| Architecture, complex features | Opus (most capable) |

**Relevant skills:** List which installed skills are most useful for this project type.

### Step 4: Offer Actions

Present options:
1. Create/update project `.claude/settings.json`
2. Create project `CLAUDE.md` with project-specific notes
3. Just show recommendations (no changes)
