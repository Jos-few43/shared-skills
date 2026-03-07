---
name: github-pr-review
description: Use when reviewing a pull request, conducting a code review, or giving structured feedback on a contribution. Covers security, tests, style, and tone guidelines.
version: "1.0.0"
requires:
  - shell_exec
---

# GitHub PR Review — Systematic Code Review

## Overview

A structured approach to reviewing pull requests. Reviews should be thorough, kind, and actionable. The goal is to improve code quality and help the contributor grow — not to block or gatekeep.

## Review Checklist

Work through each category before submitting. Not every item applies to every PR.

### Correctness
- [ ] Does the code do what the PR description says it does?
- [ ] Are edge cases handled (null, empty, large input, concurrent access)?
- [ ] Are error paths handled and surfaced correctly?

### Security
- [ ] No secrets, API keys, or credentials committed
- [ ] User input validated at system boundaries
- [ ] No SQL injection, XSS, or path traversal vectors introduced
- [ ] Dependencies added are from trusted sources and not known-vulnerable

### Tests
- [ ] New behavior has test coverage
- [ ] Tests are meaningful (not just asserting the function was called)
- [ ] Existing tests still pass (check CI status)
- [ ] Edge cases and error paths are tested

### Code Quality
- [ ] Conventional commits used (`type(scope): description`)
- [ ] Code is readable and self-documenting — no unnecessary cleverness
- [ ] No dead code, commented-out blocks, or debug logging left in
- [ ] DRY — no obvious duplication that should be extracted

### Documentation & Breaking Changes
- [ ] Public APIs or user-facing behavior changes are documented
- [ ] Breaking changes are called out explicitly in the PR description
- [ ] CHANGELOG or release notes updated if required by the project

## Review Types — When to Use Each

| Review Type | When to Use |
|---|---|
| **Approve** | Code is correct, safe, and meets standards. Minor nits may be left as comments but don't block. |
| **Comment** | You have questions or observations that don't require changes — useful for discussion or FYI notes. |
| **Request Changes** | There is a correctness bug, security issue, missing tests, or a significant design problem that must be addressed before merge. |

Do not use "Request Changes" for style preferences or nitpicks. Use "Comment" or inline suggestions for those.

## Tone Guidelines

- **Be kind.** Reviews are mentorship, not audits. Assume good intent.
- **Explain why.** "This could cause a race condition because X" is more useful than "this is wrong."
- **Acknowledge what's right.** If the approach is clever or the tests are well-structured, say so.
- **Use "we" not "you."** "We usually handle errors like X" lands better than "you didn't handle errors."
- **Distinguish blockers from suggestions.** Prefix nits with `nit:` so contributors can deprioritize them.

## Comment Templates

### Blocker
```
This will [describe problem] when [describe condition]. We should [suggested fix] to avoid [consequence].
```

### Suggestion (non-blocking)
```
nit: Consider [alternative] — it's a bit more [readable/efficient/idiomatic]. Up to you.
```

### Question
```
I'm not sure I follow the reasoning here — could you add a comment explaining why [X]?
```

### Approval with acknowledgment
```
This is a clean implementation of [X]. Left one nit below but approving — feel free to address or ignore.
```

## First-Time vs. Regular Contributors

**First-time contributors:**
- Be more explicit about project conventions — they may not know them yet.
- Link to relevant docs or examples rather than just stating "do it this way."
- Approve with minor follow-up suggestions rather than requesting multiple rounds of changes.
- Acknowledge the contribution effort: "Thanks for the PR — this is a useful addition."

**Regular contributors:**
- Shorter, more direct feedback is fine — they know the conventions.
- Higher expectations on test coverage and design consistency.
- Call out regressions from prior patterns directly.

## Running Checks Before Reviewing

Fetch the PR branch locally and run checks before reading the diff:

```bash
gh pr checkout {pr_number}
gh pr diff {pr_number}
gh pr checks {pr_number}
```

For security-sensitive changes, also run:

```bash
# Check for secrets
git diff main...HEAD | grep -iE "(api_key|secret|password|token)" || echo "No obvious secrets found"
```
