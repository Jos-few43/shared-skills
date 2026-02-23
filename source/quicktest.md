---
name: quicktest
description: Use when you want to run tests for the current project. Auto-detects the test runner (npm, pytest, cargo, go, make) and runs the appropriate test command.
---

# Quick Test — Auto-Detect & Run Tests

## Overview

Detects the test framework for the current project and runs the test suite with formatted output.

## Detection Rules

Check these files in order in the current working directory:

| File Found | Test Command | Framework |
|---|---|---|
| `Cargo.toml` | `cargo test` | Rust |
| `go.mod` | `go test ./...` | Go |
| `pyproject.toml` with `[tool.pytest]` | `pytest -v` | Python (pytest) |
| `pyproject.toml` without pytest | `python -m unittest discover -v` | Python (unittest) |
| `setup.py` | `pytest -v` | Python |
| `package.json` with `"test"` script | `npm test` | Node.js |
| `bun.lockb` | `bun test` | Bun |
| `deno.json` | `deno test` | Deno |
| `Makefile` with `test` target | `make test` | Make |

## When Invoked

1. Detect the test runner using the rules above
2. Announce: "Detected [framework]. Running: `[command]`"
3. Run the command
4. Format output:
   - If all pass: "All tests passed (X tests)"
   - If failures: Show failed test names and suggest: "Run specific test: `[command] [test_name]`"
   - If no test runner found: "No test runner detected. Create tests or specify command."

## Options

- If user says `/quicktest [specific]`, pass the argument to the test command (e.g., `pytest -v [specific]`)
- If inside a distrobox container context, run tests inside the appropriate container
