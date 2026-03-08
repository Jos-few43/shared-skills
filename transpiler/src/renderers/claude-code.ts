import type { SkillAST, ToolMappings, RenderResult, Renderer } from "../types.js";
import { segmentsToString, renderFrontmatter } from "../renderer.js";

export class ClaudeCodeRenderer implements Renderer {
  target = "claude_code" as const;

  render(ast: SkillAST, _mappings: ToolMappings): RenderResult {
    // Pass includeSkills2Fields=true: Claude Code understands native Skills 2.0 frontmatter.
    // Transpiler-only fields (requires, optional, targets, targets_only) are excluded by renderFrontmatter.
    const fm = renderFrontmatter(ast.frontmatter, true);
    const body = segmentsToString(ast.body);
    return {
      content: fm + "\n\n" + body,
      filename: `${ast.frontmatter.name}.md`,
    };
  }
}
