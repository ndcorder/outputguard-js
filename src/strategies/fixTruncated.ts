export const name = "fix_truncated";
export const description = "Recover truncated JSON from token-limit cutoffs";

export function apply(text: string): string {
  let result = text;

  // Close open strings (odd number of unescaped quotes)
  if (countUnescapedQuotes(result) % 2 !== 0) {
    result += '"';
  }

  // Remove trailing incomplete key-value patterns
  // Dangling colon with no value: "key":\s*$
  result = result.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  result = result.replace(/"[^"]*"\s*:\s*$/, '"__truncated__": null');

  // Remove trailing comma with no value
  result = result.replace(/,\s*$/, "");

  // Balance missing closers
  result = balanceClosers(result);

  return result;
}

function countUnescapedQuotes(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"' && (i === 0 || text[i - 1] !== "\\")) {
      count++;
    }
  }
  return count;
}

function balanceClosers(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  // Append missing closers in reverse order
  let result = text;
  while (stack.length > 0) {
    result += stack.pop();
  }

  return result;
}
