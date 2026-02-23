---
name: git-workflow
description: Use when creating branches, PRs, resolving merge conflicts, or performing any git workflow operation. Enforces team conventions.
---

# Git Workflow

Standard git workflow conventions for all repositories.

## Branch Naming

Format: `<type>/<short-description>`

| Type | Use |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, deps, configs |
| `release/` | Release preparation |

Example: `feature/add-sentry-mcp`, `fix/litellm-routing-error`

## Commit Messages

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `style`, `perf`

## Pull Request Template

Every PR must include:

```markdown
## Summary
- [1-3 bullet points describing changes]

## Linear Issue
- [LIN-XXX](link) or "N/A"

## Test Plan
- [ ] Test step 1
- [ ] Test step 2

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated (if needed)
```

## Protected Branches

- **NEVER** force-push to `main` or `master`
- All changes to `main` go through PRs
- PRs require Claude auto-review + human approval

## Merge Conflict Resolution

When resolving conflicts:
1. Read BOTH sides fully before choosing
2. Understand the intent of each change
3. Prefer the version that preserves more functionality
4. If unsure, ask the user
5. Always run tests after resolution

## Auto-Labeling (by file path)

| Path Pattern | Label |
|---|---|
| `docs/`, `*.md` | `documentation` |
| `tests/`, `*test*` | `testing` |
| `.github/`, `ci-*` | `ci/cd` |
| `Dockerfile`, `docker-compose*` | `infrastructure` |
| `*.css`, `*.tsx`, `*.vue` | `frontend` |
| `*.py`, `*.go`, `*.rs` | `backend` |
