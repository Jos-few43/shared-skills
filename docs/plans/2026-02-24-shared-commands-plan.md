# Shared Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `~/shared-commands/` repo with a transpiler that converts universal-format commands into native per-tool command formats for Claude Code, OpenCode, Gemini, Qwen, and OpenClaw.

**Architecture:** Fork the shared-skills transpiler pipeline (parser, resolver, renderers), extend it with command-specific frontmatter (`allowed_tools`, `argument_hint`, `disable_model_invocation`) and body syntax (`{{context_inject:cmd}}`). Symlink `tool-mappings.yaml` from shared-skills. Distribute via symlinks/copies using the same pattern.

**Tech Stack:** TypeScript, tsx, vitest, yaml, glob (same as shared-skills transpiler)

---

### Task 1: Initialize Repository

**Files:**
- Create: `~/shared-commands/README.md`
- Create: `~/shared-commands/.gitignore`

**Step 1: Create repo and initial structure**

```bash
mkdir -p ~/shared-commands/{source,dist,config,scripts,docs/plans,transpiler/src/renderers,transpiler/tests}
cd ~/shared-commands
git init
```

**Step 2: Create .gitignore**

```
node_modules/
dist/
*.js
*.d.ts
*.js.map
```

**Step 3: Create README.md**

A brief README explaining the repo purpose, quick start, and structure.

**Step 4: Symlink tool-mappings.yaml from shared-skills**

```bash
ln -sf ~/shared-skills/config/tool-mappings.yaml ~/shared-commands/config/tool-mappings.yaml
```

**Step 5: Copy design doc into the new repo**

```bash
cp ~/shared-skills/docs/plans/2026-02-24-shared-commands-design.md ~/shared-commands/docs/plans/
cp ~/shared-skills/docs/plans/2026-02-24-shared-commands-plan.md ~/shared-commands/docs/plans/
```

**Step 6: Commit**

```bash
git add README.md .gitignore config/ docs/
git commit -m "chore: initialize shared-commands repo with structure and design docs"
```

---

### Task 2: Create Transpiler Types and Config

**Files:**
- Create: `~/shared-commands/transpiler/package.json`
- Create: `~/shared-commands/transpiler/tsconfig.json`
- Create: `~/shared-commands/transpiler/src/types.ts`

**Step 1: Create package.json**

Same deps as shared-skills transpiler (yaml, glob, tsx, vitest, typescript). Name: `command-transpile`.

**Step 2: Create tsconfig.json**

Identical to shared-skills: ES2022, NodeNext modules, strict mode.

**Step 3: Create types.ts**

Extends the skill types pattern with:
- `CommandFrontmatter` — adds `argument_hint?: string`, `allowed_tools?: string[]`, `disable_model_invocation?: boolean`
- `ContextInjectSegment` — new segment type with `command: string` field
- `Segment` union — adds `ContextInjectSegment` alongside `TextSegment`, `ToolRefSegment`, `ConditionalBlock`
- `CommandAST` — uses `CommandFrontmatter` instead of `SkillFrontmatter`
- All other types (`ToolMappings`, `TargetName`, `RenderResult`, `Renderer`) remain identical

**Step 4: Commit**

```bash
git add transpiler/
git commit -m "feat: add transpiler types with command-specific frontmatter and context injection"
```

---

### Task 3: Create Parser

**Files:**
- Create: `~/shared-commands/transpiler/src/parser.ts`
- Create: `~/shared-commands/transpiler/tests/parser.test.ts`

**Step 1: Write the failing test**

Test cases:
1. Parses command frontmatter with `argument_hint`, `allowed_tools`, `disable_model_invocation`
2. Parses `{{context_inject:git status}}` segments (extracts command string)
3. Parses `{{tool:X}}` refs and `{{#if supports:X}}` conditionals (same as skills)
4. Throws on missing frontmatter
5. Throws on missing `name` field

**Step 2: Run test to verify it fails**

```bash
cd ~/shared-commands/transpiler && npm install && npx vitest run tests/parser.test.ts
```

**Step 3: Write parser.ts**

Fork from shared-skills parser. Key changes:
- Add regex: `/\{\{context_inject:([^}]+)\}\}/g`
- Combine tool_ref and context_inject into a single `matchAll` pass in `tokenizeLine()`
- Tool refs produce `ToolRefSegment`, context injects produce `ContextInjectSegment`
- Everything else (frontmatter parsing, conditional blocks) identical

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/parser.test.ts
```

**Step 5: Commit**

```bash
git add transpiler/src/parser.ts transpiler/tests/parser.test.ts
git commit -m "feat: implement command parser with context_inject support"
```

---

### Task 4: Create Resolver

**Files:**
- Create: `~/shared-commands/transpiler/src/resolver.ts`
- Create: `~/shared-commands/transpiler/tests/resolver.test.ts`

**Step 1: Write the failing test**

Test cases:
1. Resolves `{{tool:shell_exec}}` to concrete name per target
2. Passes through `context_inject` segments unmodified (renderers handle them)
3. Resolves `allowed_tools` semantic names in frontmatter (e.g., `shell_exec(git add:*)` becomes `Bash(git add:*)` for Claude Code)
4. Skips target when required capability missing

**Step 2: Run test to verify it fails**

**Step 3: Write resolver.ts**

Fork from shared-skills resolver. Key changes:
- `context_inject` segments pass through (pushed directly to result)
- After merging frontmatter overrides, resolve `allowed_tools` array: parse `"semantic_tool(args)"` format, look up concrete tool name, reassemble as `"concrete_tool(args)"`
- All other logic (requires check, targets_only, conditional evaluation) identical

**Step 4: Run test to verify it passes**

**Step 5: Commit**

```bash
git add transpiler/src/resolver.ts transpiler/tests/resolver.test.ts
git commit -m "feat: implement command resolver with allowed_tools mapping"
```

---

### Task 5: Create Base Renderer + All 5 Target Renderers

**Files:**
- Create: `~/shared-commands/transpiler/src/renderer.ts`
- Create: `~/shared-commands/transpiler/src/renderers/claude-code.ts`
- Create: `~/shared-commands/transpiler/src/renderers/opencode.ts`
- Create: `~/shared-commands/transpiler/src/renderers/gemini.ts`
- Create: `~/shared-commands/transpiler/src/renderers/qwen.ts`
- Create: `~/shared-commands/transpiler/src/renderers/openclaw.ts`
- Create: `~/shared-commands/transpiler/tests/renderers.test.ts`

**Step 1: Write the failing test**

Test a `/commit` command through each renderer:
- **Claude Code**: `context_inject` becomes `` !`git status` `` backtick syntax; frontmatter has `allowed-tools: Bash(git add:*)`
- **OpenCode**: Same backtick syntax; frontmatter has `allowed-tools: shell(git add:*)`
- **Gemini**: No backtick syntax; no `allowed-tools` frontmatter; tool constraints as text

**Step 2: Run test to verify it fails**

**Step 3: Write renderer.ts (base utilities)**

Key function: `segmentsToString(segments, contextInjectFn?)` — takes an optional function for rendering `context_inject` segments. Each target renderer passes its own function:
- Claude Code/OpenCode: `` (cmd) => `!\`${cmd}\`` ``
- Gemini/Qwen: `` (cmd) => `\`${cmd}\`` `` (just inline code, no shell injection)
- OpenClaw: `` (cmd) => `{{terminal:${cmd}}}` ``

Also: `renderCommandFrontmatter(fm, options)` — conditionally includes `allowed-tools`, `argument-hint`, `disable-model-invocation` based on target capabilities.

**Step 4: Write all 5 renderers**

Each renderer calls `renderCommandFrontmatter` with appropriate options and `segmentsToString` with its context inject function.

- **Claude Code**: All frontmatter options enabled, backtick injection
- **OpenCode**: All frontmatter options enabled, backtick injection
- **Gemini**: No command frontmatter, inline code for context, tool constraints as markdown blockquote
- **Qwen**: Same as Gemini
- **OpenClaw**: No command frontmatter, `{{terminal:cmd}}` syntax, output filename `COMMAND.md` in subdirectory

**Step 5: Run tests**

```bash
npx vitest run tests/renderers.test.ts
```

**Step 6: Commit**

```bash
git add transpiler/src/renderer.ts transpiler/src/renderers/ transpiler/tests/renderers.test.ts
git commit -m "feat: implement all 5 target renderers with command-specific output formats"
```

---

### Task 6: Create CLI Entry Point

**Files:**
- Create: `~/shared-commands/transpiler/src/index.ts`

**Step 1: Write index.ts**

Fork from shared-skills CLI. Key changes:
- `discoverCommands()` globs `*.md` + `*/COMMAND.md` (not `*/SKILL.md`)
- CLI flag `--command` instead of `--skill`
- Console output says "commands" not "skills"
- Everything else (transpile loop, write output, error handling) identical

**Step 2: Commit**

```bash
git add transpiler/src/index.ts
git commit -m "feat: implement CLI entry point for command transpiler"
```

---

### Task 7: Create Distribution Script

**Files:**
- Create: `~/shared-commands/scripts/symlink-all.sh`

**Step 1: Write symlink-all.sh**

Fork from shared-skills. Key changes in target paths:
- **Claude Code**: `~/.claude/commands/` (not `~/.claude/plugins/skills/`)
- **OpenCode**: `~/opt-ai-agents/opencode/.opencode/command/` (not `~/opt-ai-agents/opencode/skills/`)
- **Gemini**: `~/.config/gemini-cli/commands/`
- **Qwen**: `~/.config/qwen-code/commands/`
- **OpenClaw**: Staged at `~/opt-openclaw-commands/`, copied to `/opt/openclaw/config/workspace/commands/`
- Discovery uses `*/COMMAND.md` not `*/SKILL.md`

**Step 2: Make executable and commit**

```bash
chmod +x scripts/symlink-all.sh
git add scripts/symlink-all.sh
git commit -m "feat: add command distribution script"
```

---

### Task 8: Update tool-mappings.yaml with Command Capabilities

**Files:**
- Modify: `~/shared-skills/config/tool-mappings.yaml`

**Step 1: Append command-specific capabilities**

Add to the `capabilities:` section:
```yaml
  shell_inject:     [claude_code, opencode]
  command_instruction: [claude_code, opencode]
  allowed_tools_frontmatter: [claude_code, opencode]
  argument_hint:    [claude_code, opencode]
  disable_model:    [claude_code, opencode]
```

**Step 2: Commit in shared-skills repo**

```bash
cd ~/shared-skills
git add config/tool-mappings.yaml
git commit -m "feat: add command-specific capabilities to tool-mappings registry"
```

---

### Task 9: Create Example Commands

**Files:**
- Create: `~/shared-commands/source/commit.md`
- Create: `~/shared-commands/source/status.md`

**Step 1: Create /commit command**

Universal format with:
- `allowed_tools: [shell_exec(git add:*), shell_exec(git status:*), shell_exec(git commit:*)]`
- `argument_hint: "<message>"`
- Context section using `{{context_inject:git status}}`, `{{context_inject:git diff HEAD}}`, etc.
- Task instruction using `{{tool:shell_exec}}`

**Step 2: Create /status command**

Universal format with:
- `requires: [shell_exec]`
- Context injection for git status, branch, recent commits, node version
- Task: summarize state in bullet points

**Step 3: Commit**

```bash
git add source/
git commit -m "feat: add example commit and status commands"
```

---

### Task 10: End-to-End Test

**Files:**
- Create: `~/shared-commands/transpiler/tests/e2e.test.ts`

**Step 1: Write e2e test**

- Discover commands from `source/` (expect >= 2)
- Transpile `/commit` for all targets, verify:
  - No errors
  - Claude Code output has backtick injection + `Bash(git add:*)` in allowed-tools
  - OpenCode output has backtick injection + `shell(git add:*)` in allowed-tools
  - Gemini output has no backtick injection, uses `run_shell_command`
- Transpile `/status` for all targets, verify no errors

**Step 2: Run all tests**

```bash
cd ~/shared-commands/transpiler && npx vitest run
```

**Step 3: Run full transpilation and inspect output**

```bash
cd ~/shared-commands && npx tsx transpiler/src/index.ts
cat dist/claude-code/commit.md
cat dist/gemini/commit.md
```

**Step 4: Commit**

```bash
git add transpiler/tests/e2e.test.ts
git commit -m "test: add end-to-end transpiler integration tests"
```

---

### Task 11: Create GitHub Repo and Push

**Step 1: Create remote repo**

```bash
gh repo create Jos-few43/shared-commands --private --description "Universal command format for AI coding tools"
```

**Step 2: Add remote and push**

```bash
cd ~/shared-commands
git remote add origin git@github.com:Jos-few43/shared-commands.git
git push -u origin main
```

---

### Task 12: Update CLAUDE.md and Memory

**Files:**
- Modify: `~/CLAUDE.md` — add `shared-commands` to GitHub repos table
- Modify: `~/.claude/projects/memory/MEMORY.md` — add shared-commands reference

**Step 1: Add repo to CLAUDE.md table**

Add: `| shared-commands | ~/shared-commands/ |`

**Step 2: Commit**

```bash
cd ~ && git add CLAUDE.md
git commit -m "docs: add shared-commands repo to project references"
```
