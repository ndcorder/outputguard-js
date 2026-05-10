export const name = "fix_encoding";
export const description = "Fix BPE tokenizer artifacts (raw byte tokens as Unicode)";

const BPE_MAP: Record<string, string> = {
  "Ġ": " ",
  "Ċ": "\n",
  "ĉ": "\t",
  "č": "\r",
};

const BPE_CHARS = Object.keys(BPE_MAP);

export function apply(text: string): string {
  if (!BPE_CHARS.some(c => text.includes(c))) return text;
  for (const [bpe, replacement] of Object.entries(BPE_MAP)) {
    text = text.replaceAll(bpe, replacement);
  }
  return text;
}
