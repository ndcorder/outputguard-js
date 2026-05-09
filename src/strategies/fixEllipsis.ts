export const name = "fix_ellipsis";
export const description = "Replace ... placeholders with valid JSON values";

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

    // Outside string — look for ...
    if (ch === "." && i + 2 < text.length && text[i + 1] === "." && text[i + 2] === ".") {
      // Check context
      const before = result.join("");
      const after = text.slice(i + 3);

      // Handle [...]  →  []
      const lastNonWs = lastNonWhitespace(before);
      const nextNonWs = firstNonWhitespace(after);

      if (lastNonWs === "[" && nextNonWs === "]") {
        // [...] → [] — just skip the ellipsis
        i += 3;
        continue;
      }

      if (lastNonWs === "{" && nextNonWs === "}") {
        // {...} → {} — just skip the ellipsis
        i += 3;
        continue;
      }

      // Handle ", ..." or "...," — remove the ellipsis and associated comma
      if (lastNonWs === ",") {
        // Remove trailing comma and whitespace before it
        const trimmed = before.replace(/,\s*$/, "");
        result.length = 0;
        result.push(trimmed);
        i += 3;
        // Skip comma after if present
        const restIdx = skipWhitespace(text, i);
        if (restIdx < text.length && text[restIdx] === ",") {
          i = restIdx + 1;
        }
        continue;
      }

      if (nextNonWs === ",") {
        // ..., → skip ellipsis and the comma
        i += 3;
        const restIdx = skipWhitespace(text, i);
        if (restIdx < text.length && text[restIdx] === ",") {
          i = restIdx + 1;
        }
        continue;
      }

      // Default: replace ... with null
      result.push("null");
      i += 3;
      continue;
    }

    result.push(ch);
    i++;
  }

  return result.join("");
}

function lastNonWhitespace(s: string): string | null {
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] !== " " && s[i] !== "\t" && s[i] !== "\n" && s[i] !== "\r") {
      return s[i];
    }
  }
  return null;
}

function firstNonWhitespace(s: string): string | null {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== " " && s[i] !== "\t" && s[i] !== "\n" && s[i] !== "\r") {
      return s[i];
    }
  }
  return null;
}

function skipWhitespace(text: string, i: number): number {
  while (i < text.length && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) {
    i++;
  }
  return i;
}
