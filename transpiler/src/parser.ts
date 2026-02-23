import YAML from "yaml";
import type { SkillAST, SkillFrontmatter, Segment, ToolRefSegment, ConditionalBlock } from "./types.js";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const TOOL_REF_RE = /\{\{tool:(\w+)\}\}/g;
const IF_OPEN_RE = /^\{\{#if supports:(\w+)\}\}\s*$/;
const IF_CLOSE_RE = /^\{\{\/if\}\}\s*$/;

export function parse(source: string, sourcePath: string): SkillAST {
  const fmMatch = source.match(FRONTMATTER_RE);
  if (!fmMatch) {
    throw new Error(`${sourcePath}: No YAML frontmatter found`);
  }

  const frontmatter = YAML.parse(fmMatch[1]) as SkillFrontmatter;
  if (!frontmatter.name) {
    throw new Error(`${sourcePath}: Missing required field 'name' in frontmatter`);
  }
  if (!frontmatter.description) {
    throw new Error(`${sourcePath}: Missing required field 'description' in frontmatter`);
  }

  const bodyText = fmMatch[2];
  const body = tokenizeBody(bodyText, sourcePath);

  return { frontmatter, body, sourcePath };
}

function tokenizeBody(text: string, sourcePath: string): Segment[] {
  const lines = text.split("\n");
  const segments: Segment[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const ifMatch = line.match(IF_OPEN_RE);

    if (ifMatch) {
      const capability = ifMatch[1];
      const startLine = i + 1;
      const innerLines: string[] = [];
      i++;
      let found = false;

      while (i < lines.length) {
        if (IF_CLOSE_RE.test(lines[i])) {
          found = true;
          i++;
          break;
        }
        innerLines.push(lines[i]);
        i++;
      }

      if (!found) {
        throw new Error(
          `${sourcePath}: Unclosed {{#if supports:${capability}}} block starting at line ${startLine}`
        );
      }

      const innerBody = tokenizeLine(innerLines.join("\n"), startLine);
      const conditional: ConditionalBlock = {
        type: "conditional",
        capability,
        body: innerBody,
        line: startLine,
      };
      segments.push(conditional);
    } else {
      const lineSegments = tokenizeLine(line + "\n", i + 1);
      segments.push(...lineSegments);
      i++;
    }
  }

  return segments;
}

function tokenizeLine(text: string, lineNum: number): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TOOL_REF_RE)) {
    const before = text.slice(lastIndex, match.index);
    if (before) {
      segments.push({ type: "text", content: before });
    }
    const ref: ToolRefSegment = {
      type: "tool_ref",
      tool: match[1],
      raw: match[0],
      line: lineNum,
    };
    segments.push(ref);
    lastIndex = match.index + match[0].length;
  }

  const after = text.slice(lastIndex);
  if (after) {
    segments.push({ type: "text", content: after });
  }

  return segments;
}
