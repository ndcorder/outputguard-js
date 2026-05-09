export const name = "fix_booleans";
export const description = "Replace Python True/False/None with true/false/null";

const REPLACEMENTS: [RegExp, string][] = [
  [/\bTrue\b/g, "true"],
  [/\bFalse\b/g, "false"],
  [/\bNone\b/g, "null"],
];

export function apply(text: string): string {
  let result = text;

  for (const [pattern, replacement] of REPLACEMENTS) {
    const matches = [...result.matchAll(new RegExp(pattern))];
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      if (m.index === undefined) continue;
      if (isInsideString(result, m.index)) continue;
      result =
        result.slice(0, m.index) +
        replacement +
        result.slice(m.index + m[0].length);
    }
  }

  return result;
}

function isInsideString(text: string, pos: number): boolean {
  let count = 0;
  for (let i = 0; i < pos; i++) {
    if (text[i] === '"' && (i === 0 || text[i - 1] !== "\\")) {
      count++;
    }
  }
  return count % 2 !== 0;
}
