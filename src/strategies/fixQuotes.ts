export const name = "fix_quotes";
export const description = "Replace single-quoted strings with double-quoted";

export function apply(text: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // Double-quoted string — pass through unchanged
    if (ch === '"') {
      result.push(ch);
      i++;
      while (i < text.length) {
        const c = text[i];
        result.push(c);
        i++;
        if (c === "\\" && i < text.length) {
          result.push(text[i]);
          i++;
        } else if (c === '"') {
          break;
        }
      }
      continue;
    }

    // Single-quoted string — convert to double-quoted
    if (ch === "'") {
      const content: string[] = [];
      i++;
      while (i < text.length) {
        const c = text[i];
        if (c === "\\" && i + 1 < text.length && text[i + 1] === "'") {
          content.push("'");
          i += 2;
        } else if (c === "'") {
          i++;
          break;
        } else {
          content.push(c);
          i++;
        }
      }
      const escaped = content.join("").replace(/"/g, '\\"');
      result.push('"', escaped, '"');
      continue;
    }

    result.push(ch);
    i++;
  }

  return result.join("");
}
