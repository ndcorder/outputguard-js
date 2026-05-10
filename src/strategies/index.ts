import type { StrategyEntry } from "../types.js";

import * as fixEncoding from "./fixEncoding.js";
import * as stripFences from "./stripFences.js";
import * as extractJson from "./extractJson.js";
import * as removeComments from "./removeComments.js";
import * as fixCommas from "./fixCommas.js";
import * as fixQuotes from "./fixQuotes.js";
import * as fixInnerQuotes from "./fixInnerQuotes.js";
import * as fixKeys from "./fixKeys.js";
import * as fixValues from "./fixValues.js";
import * as fixBooleans from "./fixBooleans.js";
import * as fixTruncated from "./fixTruncated.js";
import * as fixEllipsis from "./fixEllipsis.js";
import * as fixUnicode from "./fixUnicode.js";
import * as fixClosers from "./fixClosers.js";
import * as fixNewlines from "./fixNewlines.js";

export const ALL_STRATEGIES: StrategyEntry[] = [
  { name: fixEncoding.name, description: fixEncoding.description, apply: fixEncoding.apply },
  { name: stripFences.name, description: stripFences.description, apply: stripFences.apply },
  { name: extractJson.name, description: extractJson.description, apply: extractJson.apply },
  { name: removeComments.name, description: removeComments.description, apply: removeComments.apply },
  { name: fixCommas.name, description: fixCommas.description, apply: fixCommas.apply },
  { name: fixQuotes.name, description: fixQuotes.description, apply: fixQuotes.apply },
  { name: fixInnerQuotes.name, description: fixInnerQuotes.description, apply: fixInnerQuotes.apply },
  { name: fixKeys.name, description: fixKeys.description, apply: fixKeys.apply },
  { name: fixValues.name, description: fixValues.description, apply: fixValues.apply },
  { name: fixBooleans.name, description: fixBooleans.description, apply: fixBooleans.apply },
  { name: fixTruncated.name, description: fixTruncated.description, apply: fixTruncated.apply },
  { name: fixEllipsis.name, description: fixEllipsis.description, apply: fixEllipsis.apply },
  { name: fixUnicode.name, description: fixUnicode.description, apply: fixUnicode.apply },
  { name: fixClosers.name, description: fixClosers.description, apply: fixClosers.apply },
  { name: fixNewlines.name, description: fixNewlines.description, apply: fixNewlines.apply },
];

export function getStrategy(name: string): StrategyEntry {
  const entry = ALL_STRATEGIES.find(s => s.name === name);
  if (!entry) throw new Error(`Unknown strategy: ${name}`);
  return entry;
}

export function getStrategies(names?: string[]): StrategyEntry[] {
  if (!names) return [...ALL_STRATEGIES];
  return ALL_STRATEGIES.filter(s => names.includes(s.name));
}
