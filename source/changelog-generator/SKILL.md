---
name: changelog-generator
description: Generate structured changelogs from conventional commit history. Use before releases, when updating CHANGELOG.md, or when summarizing work done on a branch.
argument-hint: "[from-ref] [to-ref]"
allowed-tools: Bash(*), Read, Write, Edit
---

# Changelog Generator

Parse conventional commit history between two refs and produce formatted changelogs, release notes, and PR descriptions. Integrates with `/release-management`.

## Usage

```
/changelog-generator [from-ref] [to-ref]
```

Examples:
- `/changelog-generator v1.2.0 HEAD` — changes since last release tag
- `/changelog-generator v1.1.0 v1.2.0` — changes between two tags
- `/changelog-generator main feature/my-branch` — branch summary for PR description
- `/changelog-generator` — auto-detect: last tag to HEAD

## Step 1: Collect Commit History

```bash
# Auto-detect last tag if no from-ref given:
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
FROM_REF="${FROM_REF:-$LAST_TAG}"
TO_REF="${TO_REF:-HEAD}"

# Get commits with full message (for breaking change detection):
git log "${FROM_REF}..${TO_REF}" \
  --format="%H %s" \
  --no-merges

# Also collect full bodies (for BREAKING CHANGE footer):
git log "${FROM_REF}..${TO_REF}" \
  --format="---COMMIT---%n%H%n%s%n%b" \
  --no-merges
```

## Step 2: Parse Conventional Commits

Conventional commit format: `type(scope): description`

Recognized types:
- `feat` — new feature → minor version bump
- `fix` — bug fix → patch version bump
- `perf` — performance improvement → patch version bump
- `refactor` — code refactor (no behavior change)
- `docs` — documentation only
- `test` — tests only
- `chore` — maintenance, dependency updates, tooling
- `ci` — CI/CD changes
- `style` — formatting, whitespace

Breaking changes:
- `!` suffix: `feat!: remove deprecated API` → major version bump
- `BREAKING CHANGE:` footer in commit body → major version bump

### Parsing logic (apply mentally or with bash):

```bash
# Extract by type:
git log "${FROM_REF}..${TO_REF}" --format="%s" --no-merges | grep "^feat"
git log "${FROM_REF}..${TO_REF}" --format="%s" --no-merges | grep "^fix"
git log "${FROM_REF}..${TO_REF}" --format="%s" --no-merges | grep "^perf"
git log "${FROM_REF}..${TO_REF}" --format="%s" --no-merges | grep "^refactor"
git log "${FROM_REF}..${TO_REF}" --format="%s" --no-merges | grep "^docs"
git log "${FROM_REF}..${TO_REF}" --format="%s" --no-merges | grep "^chore\|^ci\|^build"

# Detect breaking changes:
git log "${FROM_REF}..${TO_REF}" --format="%s %b" --no-merges | grep -E "(BREAKING CHANGE|!:)"
```

## Step 3: Determine Version Bump

| Change Type | Bump |
|---|---|
| Any `BREAKING CHANGE` or `!` suffix | **MAJOR** (x.0.0) |
| Any `feat` | **MINOR** (0.x.0) |
| Any `fix`, `perf` (no breaking) | **PATCH** (0.0.x) |
| Only `docs`, `chore`, `ci`, `style` | No bump (or patch at discretion) |

```bash
# Get current version:
git describe --tags --abbrev=0 2>/dev/null || cat package.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('version','0.0.0'))"
```

## Step 4: Generate Output

Choose one or more output formats:

### Format A: CHANGELOG.md (Keep a Changelog)

Write to or update `CHANGELOG.md` in the repo root:

```markdown
# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

## [{new-version}] - {YYYY-MM-DD}

### Breaking Changes

- {description} ({short-sha})

### Features

- {description} ({short-sha})
- {description} ({short-sha})

### Bug Fixes

- {description} ({short-sha})

### Performance

- {description} ({short-sha})

### Refactors

- {description} ({short-sha})

### Documentation

- {description} ({short-sha})

### Chores

- {description} ({short-sha})

[{new-version}]: https://github.com/Jos-few43/{repo}/compare/{from-ref}...{new-version}
```

Update the file:
```bash
# Prepend new entry to existing CHANGELOG.md (preserve history):
# Read existing, insert new section after "## [Unreleased]", write back
```

### Format B: GitHub Release Notes

Concise format for `gh release create --notes`:

```markdown
## What's Changed

### New Features
- feat(scope): description by @Jos-few43

### Bug Fixes
- fix(scope): description by @Jos-few43

### Other Changes
- chore: update dependencies

**Full Changelog**: https://github.com/Jos-few43/{repo}/compare/{from-ref}...{to-ref}
```

### Format C: PR Description

For branch summaries used in pull requests:

```markdown
## Summary

- {top 3 bullet points describing the changes}

## Changes

### Features
- {feat commits}

### Fixes
- {fix commits}

### Other
- {chore/docs/refactor commits}

## Test Plan

- [ ] {manual test step 1}
- [ ] {manual test step 2}
```

## Step 5: Write and Commit

```bash
# Write CHANGELOG.md:
# (use Write tool to update the file)

# Commit:
git add CHANGELOG.md
git commit -m "docs(changelog): update for {new-version}"
```

## Integration with release-management

After generating the changelog, hand off to `/release-management` for tagging and publishing:

```bash
# Tag the release:
git tag -a v{new-version} -m "Release v{new-version}"
git push origin main --tags

# Create GitHub release with generated notes:
gh release create v{new-version} \
  --title "v{new-version}" \
  --notes-file /tmp/release-notes.md
```

## Handling Non-Conventional Commits

If the repo mixes conventional and non-conventional commits:

1. Parse conventional commits normally
2. Collect non-conventional commits in an "Other" section
3. Note in the changelog that some commits do not follow the convention
4. Suggest adding a commit-msg hook: `npx commitlint --install`
