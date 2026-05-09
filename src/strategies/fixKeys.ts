export const name = "fix_keys";
export const description = "Add double quotes to unquoted object keys";

const UNQUOTED_KEY_RE = /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_.$-]*)\s*:/g;

export function apply(text: string): string {
  // Split into string-literal vs non-string segments
  const segments: string[] = [];
  const isString: boolean[] = [];
  let current: string[] = [];
  let inStr = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      current.push(ch);
      escaped = false;
      continue;
    }

    if (ch === "\\" && inStr) {
      current.push(ch);
      escaped = true;
      continue;
    }

    if (ch === '"') {
      if (inStr) {
        // End of string
        current.push(ch);
        segments.push(current.join(""));
        isString.push(true);
        current = [];
        inStr = false;
      } else {
        // Start of string
        if (current.length > 0) {
          segments.push(current.join(""));
          isString.push(false);
          current = [];
        }
        current.push(ch);
        inStr = true;
      }
      continue;
    }

    current.push(ch);
  }

  if (current.length > 0) {
    segments.push(current.join(""));
    isString.push(inStr);
  }

  // Fix unquoted keys in non-string segments
  const result = segments.map((seg, idx) => {
    if (isString[idx]) return seg;
    return seg.replace(UNQUOTED_KEY_RE, '$1"$2":');
  });

  return result.join("");
}
