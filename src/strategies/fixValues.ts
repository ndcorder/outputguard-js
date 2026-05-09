export const name = "fix_values";
export const description = "Replace NaN, Infinity, undefined with null";

const PATTERNS: RegExp[] = [
  /-Infinity/g,
  /\bInfinity\b/g,
  /\bNaN\b/g,
  /\bundefined\b/g,
];

export function apply(text: string): string {
  let result = text;

  for (const pattern of PATTERNS) {
    const matches = [...result.matchAll(new RegExp(pattern))];
    // Process from right to left to keep indices stable
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      if (m.index === undefined) continue;
      if (isInsideString(result, m.index)) continue;
      result =
        result.slice(0, m.index) +
        "null" +
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
