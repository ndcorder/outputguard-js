export const name = "remove_comments";
export const description = "Strip JS-style // and /* */ comments";

export function apply(text: string): string {
  const result: string[] = [];
  let i = 0;
  let inString = false;
  let escaped = false;

  while (i < text.length) {
    const ch = text[i];

    if (escaped) {
      result.push(ch);
      escaped = false;
      i++;
      continue;
    }

    if (ch === "\\" && inString) {
      result.push(ch);
      escaped = true;
      i++;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result.push(ch);
      i++;
      continue;
    }

    if (inString) {
      result.push(ch);
      i++;
      continue;
    }

    // Line comment
    if (ch === "/" && i + 1 < text.length && text[i + 1] === "/") {
      // Skip to end of line
      while (i < text.length && text[i] !== "\n") {
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === "/" && i + 1 < text.length && text[i + 1] === "*") {
      i += 2;
      while (i + 1 < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        i++;
      }
      if (i + 1 < text.length) {
        i += 2; // skip */
      }
      continue;
    }

    result.push(ch);
    i++;
  }

  return result.join("");
}
