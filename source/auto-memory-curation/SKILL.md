---
name: auto-memory-curation
description: Curate and organize Claude Code memory files. Identifies stale entries, deduplicates knowledge, enforces size limits, and suggests new entries based on session patterns. Use periodically or when memory files are growing unwieldy.
allowed-tools: Bash(*), Read, Glob, Grep, Write, Edit
---

# Auto Memory Curation

Maintain the health of Claude Code's persistent memory store. This skill audits memory files for staleness, duplication, size violations, and conflicts with `CLAUDE.md` instructions, then proposes and (with confirmation) applies fixes.

**Safety rule: always show proposed changes and wait for confirmation before modifying any file.**

## Step 1: Locate memory targets

```bash
ls ~/.claude/projects/*/memory/*.md 2>/dev/null
ls ~/shared-memory/core/*.md 2>/dev/null
```

Collect the full list of memory files. Note their sizes:

```bash
wc -l ~/.claude/projects/*/memory/*.md ~/shared-memory/core/*.md 2>/dev/null
```

## Step 2: MEMORY.md index maintenance

For each `MEMORY.md` found:

1. Count lines. Warn if over 150, flag error if over 200.
2. Extract all markdown links `[text](file.md)` from the file.
3. For each link, check whether the target file exists relative to the MEMORY.md location:

```bash
# Example check for a link target
ls ~/.claude/projects/<project>/memory/<file>.md 2>/dev/null
```

4. Collect broken links (target file does not exist).
5. Flag any links pointing to files outside the memory directory (potential path drift).

## Step 3: Staleness detection

For each memory file, scan for path references — lines containing `~/`, `/var/home/`, `/home/`, or `/opt/`. For each path found:

```bash
ls <path> 2>/dev/null || echo "MISSING"
```

Collect all references where the path no longer exists on disk. These are stale entries. Note the line number and the full line text.

Also flag date-stamped entries older than 90 days where the surrounding context suggests they are time-sensitive (e.g., lines containing "current", "active", "running", "status").

## Step 4: Deduplication

For each pair of topic files, compare content blocks (paragraphs and list items). Flag blocks that:
- Are identical across two files
- Say the same thing with minor wording variation (check for >80% word overlap on sentences over 10 words)

Note: do not flag intentional cross-references — only flag duplicated knowledge that adds no value by being in both places.

## Step 5: Size enforcement

For each topic file (non-index files):
- Warn if line count exceeds 500
- Report the top 3 largest sections (by heading) within oversized files to help the user decide what to trim or split

## Step 6: Conflict detection

Read the active `CLAUDE.md` files:

```bash
cat ~/.claude/CLAUDE.md 2>/dev/null
cat ~/CLAUDE.md 2>/dev/null
```

Scan memory files for entries that directly contradict instructions in `CLAUDE.md`. Examples of contradictions:
- Memory says "use npm" when CLAUDE.md says "always use Bun"
- Memory says "install on host" when CLAUDE.md says "use distrobox"
- Memory contains a hardcoded path like `/home/yish` when CLAUDE.md says use `$HOME` or `/var/home/yish`

Collect all conflicting entries with file, line number, memory text, and the CLAUDE.md instruction it conflicts with.

## Step 7: Session-based suggestions

Scan recent session data for patterns that should be persisted but aren't in any memory file:

```bash
find ~/.claude/projects/*/sessions/ -name "*.jsonl" -newer $(date -d '7 days ago' +%Y-%m-%d) 2>/dev/null | head -10
```

Look for:
- Repeated bash commands that suggest a stable workflow not yet documented
- Tool configurations or paths referenced multiple times
- User preferences stated explicitly ("always do X", "never do Y", "I prefer Z")

Suggest these as new memory entries (do not auto-add — present as suggestions only).

## Step 8: Present proposed changes

Before touching any file, output the full change plan:

```
MEMORY CURATION REPORT
======================

Index files audited: <N>
Topic files audited: <N>
Total lines scanned: <N>

BROKEN LINKS (<N>)
  ~/.claude/projects/.../memory/MEMORY.md:12 — [topic-file.md](topic-file.md) [NOT FOUND]

STALE PATHS (<N>)
  ~/.claude/projects/.../memory/system-context.md:34 — ~/old-project/ [NOT FOUND]

DUPLICATED ENTRIES (<N>)
  Same content in system-context.md:45 and agent-patterns.md:12:
    "<duplicated text>"

SIZE WARNINGS (<N>)
  agent-patterns.md: 612 lines (limit: 500)
    Largest sections: "FSM Patterns" (210 lines), "Multi-Agent" (180 lines)

CONFLICTS WITH CLAUDE.md (<N>)
  system-context.md:78 — "use npm install" conflicts with CLAUDE.md: "Always use Bun (not Node)"

SUGGESTED NEW ENTRIES (<N>)
  Pattern seen 3x in sessions: <description>
  Suggest adding to: <target file>

PROPOSED ACTIONS
  1. Remove broken link at MEMORY.md:12
  2. Remove stale path reference at system-context.md:34
  3. Remove duplicate at agent-patterns.md:12 (keep system-context.md:45 as primary)
  4. Flag agent-patterns.md for manual trimming (612 lines)
  5. Fix conflict at system-context.md:78

Proceed with actions 1-3 and 5? (Skipping 4 — manual trim required)
[Waiting for confirmation]
```

## Step 9: Apply confirmed changes

Only after the user confirms, apply the non-destructive changes (removals of specific lines, not whole-file rewrites). Use `Edit` for targeted line removals. Never delete an entire file.

After applying, output a final summary:

```
Actions taken:
  Removed N stale entries
  Deduplicated M entries
  Fixed K broken links
  Flagged L conflicts for review

Memory files are now within size and quality targets.
Run /memory-health-monitor for a quick re-check.
```
