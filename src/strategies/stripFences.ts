export const name = "strip_fences";
export const description = "Remove markdown code fences";

const FENCE_RE = /```[a-zA-Z]*\s*\n(.*?)\n\s*```/s;
const UNCLOSED_FENCE_RE = /```[a-zA-Z]*\s*\n(.*)/s;

export function apply(text: string): string {
  const match = FENCE_RE.exec(text);
  if (match) return match[1].trim();
  const unclosed = UNCLOSED_FENCE_RE.exec(text);
  if (unclosed) return unclosed[1].trim();
  return text;
}
