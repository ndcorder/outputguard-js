export const name = "strip_fences";
export const description = "Remove markdown code fences";

const FENCE_RE = /```[a-zA-Z]*\s*\n(.*?)\n\s*```/s;

export function apply(text: string): string {
  const match = FENCE_RE.exec(text);
  if (!match) return text;
  return match[1].trim();
}
