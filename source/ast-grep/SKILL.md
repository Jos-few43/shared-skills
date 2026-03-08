---
name: ast-grep
description: Use when searching or refactoring code by structure rather than text — renaming functions across call sites, finding multi-line patterns, or making AST-aware changes that regex cannot handle reliably.
allowed-tools: Bash(*)
---

# AST-grep (sg) — Structural Code Operations

Use `ast-grep` for code-aware search and refactoring that regex can't handle: matching by AST structure, type-aware renaming, finding all implementations of a pattern.

## When to Use AST-grep vs Regex Grep

| Use AST-grep | Use Regex Grep |
|---|---|
| Rename function across all call sites | Find a specific string/keyword |
| Find all functions matching a pattern | Search file contents broadly |
| Structural refactoring (e.g., swap arguments) | Simple text replacement |
| Find all implementations of an interface | Find files by name/path |
| Match ignoring whitespace/formatting | Quick content search |

## Installation (one-time)

```bash
distrobox enter fedora-tools -- cargo install ast-grep --locked
```

The binary installs to `~/.cargo/bin/sg` inside the container.

## Search Patterns

All commands run inside `fedora-tools` container:

### TypeScript/JavaScript

```bash
# Find all async functions
distrobox enter fedora-tools -- sg --pattern 'async function $NAME($$$PARAMS) { $$$BODY }' --lang ts /path/

# Find all React useState hooks
distrobox enter fedora-tools -- sg --pattern 'const [$STATE, $SETTER] = useState($INIT)' --lang tsx /path/

# Find all try-catch blocks
distrobox enter fedora-tools -- sg --pattern 'try { $$$BODY } catch ($ERR) { $$$HANDLER }' --lang ts /path/

# Find function calls with specific argument count
distrobox enter fedora-tools -- sg --pattern '$FN($A, $B, $C)' --lang ts /path/
```

### Python

```bash
# Find all class definitions with inheritance
distrobox enter fedora-tools -- sg --pattern 'class $NAME($BASE): $$$BODY' --lang py /path/

# Find all decorator usage
distrobox enter fedora-tools -- sg --pattern '@$DECORATOR
def $NAME($$$PARAMS): $$$BODY' --lang py /path/

# Find all list comprehensions
distrobox enter fedora-tools -- sg --pattern '[$EXPR for $VAR in $ITER]' --lang py /path/
```

### Go

```bash
# Find all error checks
distrobox enter fedora-tools -- sg --pattern 'if $ERR != nil { $$$BODY }' --lang go /path/

# Find all struct definitions
distrobox enter fedora-tools -- sg --pattern 'type $NAME struct { $$$FIELDS }' --lang go /path/
```

### Rust

```bash
# Find all Result returns
distrobox enter fedora-tools -- sg --pattern 'fn $NAME($$$PARAMS) -> Result<$OK, $ERR> { $$$BODY }' --lang rs /path/

# Find all impl blocks
distrobox enter fedora-tools -- sg --pattern 'impl $TRAIT for $TYPE { $$$BODY }' --lang rs /path/
```

## Replace (Refactoring)

```bash
# Rename function (TypeScript)
distrobox enter fedora-tools -- sg --pattern 'oldName($$$ARGS)' --rewrite 'newName($$$ARGS)' --lang ts /path/

# Swap arguments
distrobox enter fedora-tools -- sg --pattern 'fn($A, $B)' --rewrite 'fn($B, $A)' --lang ts /path/

# Add error handling wrapper
distrobox enter fedora-tools -- sg --pattern 'await $EXPR' --rewrite 'await handleErrors($EXPR)' --lang ts /path/
```

## Pattern Syntax Quick Reference

| Pattern | Matches |
|---|---|
| `$NAME` | Single AST node (identifier, expression) |
| `$$$ARGS` | Zero or more nodes (variadic) |
| `$_` | Any single node (wildcard) |
| Literal code | Exact match |

## Tips

- Always use `--lang` flag — ast-grep needs to know the language
- Use `--json` flag for machine-readable output
- Run with `--interactive` for guided refactoring with confirmation
- Combine with `--filter` for fine-grained matching
- Patterns are whitespace-insensitive (unlike regex)
