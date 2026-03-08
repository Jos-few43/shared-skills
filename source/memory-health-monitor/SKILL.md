---
name: memory-health-monitor
description: Quick health check for Claude Code memory files. Flags outdated entries, broken links, oversized files, and contradictions. Use as a periodic check or before important sessions.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
---

# Memory Health Monitor

A lightweight, read-only health check for Claude Code's persistent memory store. Runs fast — no writes, no confirmations needed. Use before important sessions or as a periodic sanity check. For remediation, run `/auto-memory-curation`.

## Current Memory Status

```
!`wc -l ~/.claude/projects/*/memory/MEMORY.md 2>/dev/null | tail -1`
```

```
!`ls ~/.claude/projects/*/memory/*.md 2>/dev/null | wc -l` topic files found
```

```
!`wc -l ~/shared-memory/core/*.md 2>/dev/null | tail -1`
```

## Health Checks

Run each check in sequence. Collect all findings before reporting.

### Check 1: MEMORY.md line count

Read each `MEMORY.md` index file and count its lines.

- **OK**: 0–150 lines
- **WARN**: 151–200 lines — approaching limit, consider trimming
- **ERROR**: 201+ lines — exceeds 200-line budget; run `/auto-memory-curation`

```bash
wc -l ~/.claude/projects/*/memory/MEMORY.md ~/shared-memory/core/MEMORY.md 2>/dev/null
```

### Check 2: Broken links in MEMORY.md

Extract all markdown links `[text](file.md)` from each `MEMORY.md`. For each link, verify the target file exists relative to the index file's directory. Report any missing targets as broken links.

Pattern to match: `\[.+?\]\((.+?\.md)\)`

For each match, check:
```bash
ls <resolved-path> 2>/dev/null || echo "BROKEN"
```

### Check 3: Stale paths in topic files

Scan all topic files (`*.md` in memory directories, excluding `MEMORY.md`) for lines containing path references:
- Lines with `~/`, `/var/home/`, `/home/yish`, `/opt/`, `/etc/`

For each path extracted, verify it exists:
```bash
ls <path> 2>/dev/null || echo "MISSING"
```

Flag paths that do not exist as stale. Note: skip paths that are clearly illustrative examples (inside fenced code blocks used as templates).

### Check 4: Large topic files

Count lines in all non-index topic files:

```bash
wc -l ~/.claude/projects/*/memory/*.md ~/shared-memory/core/*.md 2>/dev/null | grep -v MEMORY.md | sort -rn | head -10
```

- **OK**: 0–500 lines
- **WARN**: 501+ lines — flag for trimming

### Check 5: Last modified dates

Check when each memory file was last modified:

```bash
find ~/.claude/projects/*/memory/ ~/shared-memory/core/ -name "*.md" -exec stat --format="%Y %n" {} \; 2>/dev/null | sort -n
```

Convert timestamps. Flag any file not modified in the last 30 days with WARN. Files untouched for 90+ days get ERROR — they may be stale enough to mislead the agent.

## Output: Summary Table

After all checks, render a summary table:

```
MEMORY HEALTH REPORT — <date>
==============================

File                                          Lines   Last Modified   Issues
----------------------------------------------------------------------
MEMORY.md (project)                           <N>     <date>          <status>
system-context.md                             <N>     <date>          <status>
agent-patterns.md                             <N>     <date>          <status>
project-state.md                              <N>     <date>          <status>
secrets-management.md                         <N>     <date>          <status>
shared-memory/core/MEMORY.md                  <N>     <date>          <status>
...

SUMMARY
  OK:     <N> files
  WARN:   <N> files
  ERROR:  <N> files

FINDINGS
  Broken links:    <N>  (list file:line — target)
  Stale paths:     <N>  (list file:line — path)
  Oversized files: <N>  (list file — line count)
  Stale files:     <N>  (list file — days since modified)

STATUS: <HEALTHY | NEEDS ATTENTION | ACTION REQUIRED>
```

**HEALTHY**: no errors, 0–2 warnings.
**NEEDS ATTENTION**: 3+ warnings or 1 error.
**ACTION REQUIRED**: 2+ errors.

If status is NEEDS ATTENTION or ACTION REQUIRED, append:

```
Recommended next step: run /auto-memory-curation to resolve findings.
```
