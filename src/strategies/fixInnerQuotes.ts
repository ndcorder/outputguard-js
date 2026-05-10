export const name = "fix_inner_quotes";
export const description = "Escape unescaped double quotes inside string values";

export function apply(text: string): string {
  const result: string[] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (ch !== '"') {
      result.push(ch);
      i++;
      continue;
    }

    const prefix = result.join("").trimEnd();
    const isValue = prefix.endsWith(":");

    result.push('"');
    i++;

    if (!isValue) {
      // Non-value string: pass through until closing quote
      while (i < n) {
        const c = text[i];
        if (c === "\\") {
          result.push(c);
          if (i + 1 < n) {
            result.push(text[i + 1]);
            i += 2;
          } else {
            i++;
          }
          continue;
        }
        if (c === '"') {
          result.push(c);
          i++;
          break;
        }
        result.push(c);
        i++;
      }
      continue;
    }

    // Value string: escape inner quotes
    while (i < n) {
      const c = text[i];
      if (c === "\\") {
        result.push(c);
        if (i + 1 < n) {
          result.push(text[i + 1]);
          i += 2;
        } else {
          i++;
        }
        continue;
      }
      if (c === '"') {
        let j = i + 1;
        while (j < n && " \t\r\n".includes(text[j])) {
          j++;
        }
        if (j >= n || ",}]:".includes(text[j])) {
          result.push('"');
          i++;
          break;
        } else {
          result.push('\\"');
          i++;
          continue;
        }
      }
      result.push(c);
      i++;
    }
  }

  return result.join("");
}
