export const name = "fix_unicode";
export const description = "Fix malformed Unicode escape sequences";

export function apply(text: string): string {
  const result: string[] = [];
  let i = 0;
  let inString = false;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"' && (i === 0 || text[i - 1] !== "\\")) {
      inString = !inString;
      result.push(ch);
      i++;
      continue;
    }

    if (!inString) {
      result.push(ch);
      i++;
      continue;
    }

    // Inside a string value
    if (ch === "\\" && i + 1 < text.length) {
      const next = text[i + 1];

      // \xHH hex escape → convert to actual character
      if (next === "x" && i + 3 < text.length) {
        const hex = text.slice(i + 2, i + 4);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          result.push(String.fromCharCode(parseInt(hex, 16)));
          i += 4;
          continue;
        }
      }

      // \uXXXX — check if complete
      if (next === "u") {
        // Count available hex digits
        let hexLen = 0;
        for (let j = i + 2; j < text.length && j < i + 6; j++) {
          if (/[0-9a-fA-F]/.test(text[j])) hexLen++;
          else break;
        }

        if (hexLen === 4) {
          // Valid \uXXXX — pass through
          result.push(text.slice(i, i + 6));
          i += 6;
          continue;
        } else if (hexLen > 0) {
          // Incomplete — pad with zeros
          const partial = text.slice(i + 2, i + 2 + hexLen);
          const padded = partial.padEnd(4, "0");
          result.push("\\u" + padded);
          i += 2 + hexLen;
          continue;
        } else {
          // \u with no hex digits — remove
          i += 2;
          continue;
        }
      }

      // \0 null byte → remove
      if (next === "0" && (i + 2 >= text.length || !/[0-9]/.test(text[i + 2]))) {
        i += 2;
        continue;
      }

      // Other escape — pass through
      result.push(ch, next);
      i += 2;
      continue;
    }

    result.push(ch);
    i++;
  }

  return result.join("");
}
