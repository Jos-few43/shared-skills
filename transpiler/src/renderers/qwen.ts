import type { SkillAST, ToolMappings, RenderResult, Renderer } from "../types.js";
import { segmentsToString, renderFrontmatter } from "../renderer.js";

export class QwenRenderer implements Renderer {
  target = "qwen" as const;

  render(ast: SkillAST, _mappings: ToolMappings): RenderResult {
    const fm = renderFrontmatter(ast.frontmatter);
    const body = segmentsToString(ast.body);
    return {
      content: fm + "\n\n" + body,
      filename: `${ast.frontmatter.name}.md`,
    };
  }
}
