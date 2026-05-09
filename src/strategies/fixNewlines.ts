export const name = "fix_newlines";
export const description = "Escape unescaped newlines/tabs inside string values";

export function apply(text: string): string {
  const result: string[] = [];
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // Check for escape sequences
    if (inString && ch === "\\" && i + 1 < text.length) {
      const next = text[i + 1];
      // Already-escaped sequence — pass through
      result.push(ch, next);
      i += 2;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result.push(ch);
      i++;
      continue;
    }

    if (inString) {
      if (ch === "\n") {
        result.push("\\n");
        i++;
        continue;
      }
      if (ch === "\r") {
        result.push("\\r");
        i++;
        continue;
      }
      if (ch === "\t") {
        result.push("\\t");
        i++;
        continue;
      }
    }

    result.push(ch);
    i++;
  }

  return result.join("");
}
