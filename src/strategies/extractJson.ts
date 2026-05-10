export const name = "extract_json";
export const description = "Extract JSON object/array from surrounding text";

export function apply(text: string): string {
  const start = findFirstBracket(text);
  if (start === -1) return text;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{" || ch === "[") {
      depth++;
    } else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return text;
}

function findFirstBracket(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") return i;
  }
  return -1;
}
