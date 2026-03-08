---
name: github-pr-review
description: Use when reviewing a pull request, conducting a code review, or giving structured feedback on a contribution. Covers security, tests, style, and tone guidelines.
context: fork
allowed-tools: Bash(*)
---

# GitHub PR Review — Systematic Code Review

## Overview

A structured approach to reviewing pull requests. Reviews should be thorough, kind, and actionable. The goal is to improve code quality and help the contributor grow — not to block or gatekeep.

## Review Checklist & Rubric

For the full checklist, tone guidelines, comment templates, and contributor guidance, see [templates/review-rubric.md](templates/review-rubric.md)

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
