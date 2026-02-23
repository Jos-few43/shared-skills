---
name: session-summary
description: Use when ending a work session or before committing. Generates a concise summary of accomplishments suitable for commit messages, standup notes, or session logs.
---

# Session Summary — Document What Was Done

## Overview

Reviews the current conversation and generates a structured summary of accomplishments.

## When Invoked

### Step 1: Review Conversation

Scan the conversation for:
- Files created or modified
- Features implemented
- Bugs fixed
- Decisions made
- Tests written or run
- Commands executed with significant results

### Step 2: Generate Summary

```markdown
## Session Summary — [date]

### Accomplished
- [3-5 bullet points of what was done]

### Files Changed
- `path/to/file.ext` — [what changed]

### Decisions Made
- [Key architectural or design decisions, if any]

### Next Steps
- [What remains to be done, if applicable]
```

### Step 3: Format Options

Ask user which format they want:

1. **Commit message** — Single paragraph, imperative mood, <72 chars first line
2. **Standup note** — "Yesterday I..." format, 3-5 bullets
3. **Session log** — Full markdown summary (as above)
4. **Clipboard** — Copy the summary to clipboard via `wl-copy` or `xclip`

## Tips

- Run before `/clear` to preserve session context
- Run before committing to get a well-structured commit message
- The vault sync hook (SessionEnd) handles transcript archival separately
