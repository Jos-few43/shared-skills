import fs from "fs";
import path from "path";
import YAML from "yaml";
import { glob } from "glob";
import { parse } from "./parser.js";
import { resolve } from "./resolver.js";
import { ClaudeCodeRenderer } from "./renderers/claude-code.js";
import { OpenCodeRenderer } from "./renderers/opencode.js";
import { GeminiRenderer } from "./renderers/gemini.js";
import { QwenRenderer } from "./renderers/qwen.js";
import { OpenClawRenderer } from "./renderers/openclaw.js";
import type { ToolMappings, TargetName, Renderer, RenderResult } from "./types.js";
import { auditSkill, type AuditReport } from "./audit.js";

const rootDir = path.resolve(import.meta.dirname ?? path.dirname(import.meta.url.replace("file://", "")), "../..");

const ALL_TARGETS: TargetName[] = ["claude_code", "opencode", "gemini", "qwen", "openclaw"];

const RENDERERS: Record<TargetName, Renderer> = {
  claude_code: new ClaudeCodeRenderer(),
  opencode: new OpenCodeRenderer(),
  gemini: new GeminiRenderer(),
  qwen: new QwenRenderer(),
  openclaw: new OpenClawRenderer(),
};

export interface TranspileResult {
  skill: string;
  targets: Record<string, RenderResult | null>;
  warnings: string[];
  errors: string[];
}

export function loadMappings(configPath: string): ToolMappings {
  const raw = fs.readFileSync(configPath, "utf-8");
  return YAML.parse(raw) as ToolMappings;
}

export function discoverSkills(sourceDir: string): string[] {
  return glob.sync("*/SKILL.md", { cwd: sourceDir, absolute: true }).sort();
}

export function transpileSkill(
  skillPath: string,
  mappings: ToolMappings,
  targets: TargetName[] = ALL_TARGETS
): TranspileResult {
  const source = fs.readFileSync(skillPath, "utf-8");
  const ast = parse(source, skillPath);
  const allWarnings: string[] = [];
  const allErrors: string[] = [];
  const results: Record<string, RenderResult | null> = {};

  for (const target of targets) {
    const resolved = resolve(ast, target, mappings);
    allWarnings.push(...resolved.warnings);
    allErrors.push(...resolved.errors);

    if (resolved.skipped) {
      results[target] = null;
      continue;
    }

    const resolvedAST = { ...ast, frontmatter: resolved.frontmatter, body: resolved.resolved };
    const renderer = RENDERERS[target];
    results[target] = renderer.render(resolvedAST, mappings);
  }

  return {
    skill: ast.frontmatter.name,
    targets: results,
    warnings: allWarnings,
    errors: allErrors,
  };
}

export function auditAllSkills(sourceDir?: string): AuditReport[] {
  const dir = sourceDir ?? path.resolve(rootDir, "source");
  const skillPaths = discoverSkills(dir);
  const reports: AuditReport[] = [];
  for (const sp of skillPaths) {
    const source = fs.readFileSync(sp, "utf-8");
    const report = auditSkill(source, path.relative(dir, sp));
    reports.push(report);
  }
  return reports;
}

function writeOutput(distDir: string, target: TargetName, result: RenderResult): void {
  const targetDir = path.join(distDir, target.replace("_", "-"));
  if (result.dirname) {
    const dir = path.join(targetDir, result.dirname);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, result.filename), result.content);
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, result.filename), result.content);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const validate = args.includes("--validate");
  const targetFlag = args.indexOf("--target");
  const skillFlag = args.indexOf("--skill");

  if (args.includes("--audit")) {
    const reports = auditAllSkills();
    let needsWork = 0;
    for (const r of reports) {
      if (r.hardcodedTools.length > 0 || r.suggestedRequires.length > 0) {
        needsWork++;
        console.log(`\n⚠ ${r.skillName} (${r.sourcePath})`);
        if (r.hardcodedTools.length > 0)
          console.log(`  Hardcoded tools: ${r.hardcodedTools.join(", ")}`);
        if (r.missingToolRefs.length > 0)
          console.log(`  Suggested refs: ${r.missingToolRefs.join("; ")}`);
        if (r.suggestedRequires.length > 0)
          console.log(`  Suggested requires: ${r.suggestedRequires.join(", ")}`);
      }
    }
    console.log(`\n${reports.length} skills audited, ${needsWork} need enrichment`);
    process.exit(0);
  }

  // Resolve paths relative to the transpiler's parent (shared-skills root)
  const configPath = path.join(rootDir, "config", "tool-mappings.yaml");
  const sourceDir = path.join(rootDir, "source");
  const distDir = path.join(rootDir, "dist");

  const mappings = loadMappings(configPath);

  const targets: TargetName[] = targetFlag >= 0
    ? [args[targetFlag + 1] as TargetName]
    : ALL_TARGETS;

  const skillPaths = skillFlag >= 0
    ? [path.resolve(sourceDir, args[skillFlag + 1])]
    : discoverSkills(sourceDir);

  let totalWarnings = 0;
  let totalErrors = 0;
  let totalTranspiled = 0;

  for (const skillPath of skillPaths) {
    try {
      const result = transpileSkill(skillPath, mappings, targets);
      const targetNames: string[] = [];
      const skippedNames: string[] = [];

      for (const target of targets) {
        const output = result.targets[target];
        if (output) {
          if (!validate) {
            writeOutput(distDir, target, output);
          }
          targetNames.push(target);
        } else {
          skippedNames.push(target);
        }
      }

      const icon = result.errors.length > 0 ? "\u2717" : result.warnings.length > 0 ? "\u26a0" : "\u2713";
      const targetList = targetNames.join(", ") || "none";
      console.log(`  ${icon} ${result.skill} \u2192 ${targetList}`);

      if (skippedNames.length > 0) {
        console.log(`    skipped: ${skippedNames.join(", ")}`);
      }

      for (const w of result.warnings) console.log(`    warn: ${w}`);
      for (const e of result.errors) console.log(`    error: ${e}`);

      totalWarnings += result.warnings.length;
      totalErrors += result.errors.length;
      totalTranspiled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  \u2717 ${path.basename(skillPath)} \u2192 error: ${msg}`);
      totalErrors++;
    }
  }

  console.log("");
  console.log(`  ${totalTranspiled}/${skillPaths.length} skills transpiled, ${totalWarnings} warnings, ${totalErrors} errors`);

  if (totalErrors > 0) process.exit(1);
}

// Only run CLI when executed directly
const isDirectRun = process.argv[1]?.includes("index");
if (isDirectRun) {
  main();
}
