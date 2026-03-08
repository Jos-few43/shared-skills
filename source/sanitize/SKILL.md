---
name: sanitize
description: Analyze untrusted scripts and skills for security vulnerabilities before integration. Runs sandboxed static + AI analysis, generates integration plans for safe code, and remediates unsafe-but-useful code.
argument-hint: "[file-or-directory]"
context: fork
allowed-tools: Bash(*)
---

# Sanitize: Security Analysis Pipeline

Analyze untrusted code from any source (GitHub, URLs, local files, npm packages) before integrating into the stack.

## Usage

```
/sanitize <source>
/sanitize https://github.com/user/repo
/sanitize ./path/to/script.sh
/sanitize --stdin   (pipe code in)
```

## How It Works

Run the sanitation pipeline via {{tool:shell_exec}}:

```bash
~/sanitation-system/bin/sanitize.sh <source> --local
```

Add `--remediate` to auto-fix unsafe-but-useful code:
```bash
~/sanitation-system/bin/sanitize.sh <source> --local --remediate
```

## Interpreting Results

The pipeline produces one of three verdicts:

| Verdict | Meaning | Action |
|---|---|---|
| **SAFE** | No security issues, useful features | Integration plan generated |
| **UNSAFE_USEFUL** | Has vulnerabilities but worth fixing | Fork-and-patch or clean rebuild |
| **USELESS** | No value, or dangerous with no value | Logged to redundancy DB |

## Commands

| Command | Description |
|---|---|
| `sanitize.sh <source>` | Full analysis pipeline |
| `sanitize.sh --status <job-id>` | Check job status |
| `sanitize.sh --lookup <url>` | Query redundancy DB |
| `sanitize.sh --list [safe\|unsafe\|useless]` | List analyzed submissions |
| `sanitize.sh --stats` | Show analysis statistics |

## After Analysis

- **SAFE**: Review the integration plan at `queue/<job-id>/integration-plan.md`
- **UNSAFE_USEFUL**: Run with `--remediate` to attempt automatic patching
- **USELESS**: No action needed — logged for future redundancy prevention

## Files

All job data stored at `~/sanitation-system/queue/<job-id>/`:
- `manifest.json` — Job metadata
- `results/static-report.json` — Static analysis findings
- `results/ai-report.json` — AI analysis with verdict
- `results/verdict.json` — Final verdict
- `integration-plan.md` — Integration steps (if SAFE)
