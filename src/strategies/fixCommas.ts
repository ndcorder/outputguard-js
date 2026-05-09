export const name = "fix_commas";
export const description = "Remove trailing commas before } and ]";

export function apply(text: string): string {
  return text.replace(/,\s*([}\]])/g, "$1");
}
