import type {
  SkillAST, SkillFrontmatter, Segment,
  ToolMappings, TargetName,
} from "./types.js";

export interface ResolveResult {
  frontmatter: SkillFrontmatter;
  resolved: Segment[];
  warnings: string[];
  errors: string[];
  skipped: boolean;
  skipReason?: string;
}

export function resolve(
  ast: SkillAST,
  target: TargetName,
  mappings: ToolMappings
): ResolveResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check requires
  if (ast.frontmatter.requires) {
    for (const cap of ast.frontmatter.requires) {
      const supported = mappings.capabilities[cap] ?? [];
      if (!supported.includes(target)) {
        return {
          frontmatter: ast.frontmatter,
          resolved: [],
          warnings: [],
          errors: [],
          skipped: true,
          skipReason: `Target '${target}' does not support required capability '${cap}'`,
        };
      }
    }
  }

  // Check targets_only
  if (ast.frontmatter.targets_only && !ast.frontmatter.targets_only.includes(target)) {
    return {
      frontmatter: ast.frontmatter,
      resolved: [],
      warnings: [],
      errors: [],
      skipped: true,
      skipReason: `Skill restricted to targets: ${ast.frontmatter.targets_only.join(", ")}`,
    };
  }

  // Merge frontmatter overrides
  let frontmatter = { ...ast.frontmatter };
  const targetOverride = ast.frontmatter.targets?.[target];
  if (targetOverride) {
    frontmatter = { ...frontmatter, ...targetOverride };
  }

  // Resolve body segments
  const resolved = resolveSegments(ast.body, target, mappings, ast.sourcePath, warnings, errors);

  return { frontmatter, resolved, warnings, errors, skipped: false };
}

function resolveSegments(
  segments: Segment[],
  target: TargetName,
  mappings: ToolMappings,
  sourcePath: string,
  warnings: string[],
  errors: string[]
): Segment[] {
  const result: Segment[] = [];

  for (const seg of segments) {
    switch (seg.type) {
      case "text":
        result.push(seg);
        break;

      case "tool_ref": {
        const toolMap = mappings.tools[seg.tool];
        if (!toolMap) {
          errors.push(`${sourcePath}:${seg.line}: Unknown tool '${seg.tool}'`);
          result.push({ type: "text", content: seg.raw });
          break;
        }
        const concrete = toolMap[target];
        if (concrete === null || concrete === undefined) {
          warnings.push(
            `${sourcePath}: '${seg.tool}' not supported by '${target}' (line ${seg.line}), replaced with empty string`
          );
          result.push({ type: "text", content: "" });
        } else {
          result.push({ type: "text", content: concrete });
        }
        break;
      }

      case "conditional": {
        const supported = mappings.capabilities[seg.capability] ?? [];
        if (supported.includes(target)) {
          const inner = resolveSegments(seg.body, target, mappings, sourcePath, warnings, errors);
          result.push(...inner);
        }
        break;
      }
    }
  }

  return result;
}
