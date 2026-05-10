import { FormatParseError, normalizeFormat, parseDocument } from "./formats.js";
import type { RepairOptions, RepairResult } from "./types.js";
import type { RepairReport, StrategyApplication } from "./report.js";
import { createReport } from "./report.js";
import { getStrategies } from "./strategies/index.js";

export function repair(text: string, strategies?: string[]): RepairResult;
export function repair(
  text: string,
  strategies: string[] | undefined,
  options: RepairOptions & { report: true },
): { result: RepairResult; report: RepairReport };
export function repair(
  text: string,
  strategies: string[] | undefined,
  options: RepairOptions,
): RepairResult;
export function repair(
  text: string,
  strategies?: string[],
  options: RepairOptions = {},
): RepairResult | { result: RepairResult; report: RepairReport } {
  const format = options.format ?? "json";
  // Try parsing as-is
  if (tryParse(text, format)) {
    const result: RepairResult = {
      repaired: false,
      text,
      strategiesApplied: [],
      parseError: null,
      format,
    };
    if (options?.report) {
      return {
        result,
        report: createReport(text, text, true, [], null, format),
      };
    }
    return result;
  }

  const strategyList = getStrategies(strategies);
  const allSteps: StrategyApplication[] = [];

  // Preserve non-JSON syntax when a generic strategy such as strip_fences is enough.
  // JSON keeps the historical all-strategies first pass for compatibility.
  if (!["json", "auto"].includes(normalizeFormat(format))) {
    let current = text;
    const preservingSteps: StrategyApplication[] = [];
    const preservingApplied: string[] = [];

    for (const strategy of strategyList) {
      const before = current;
      const after = strategy.apply(current);
      const changed = after !== before;
      if (changed) preservingApplied.push(strategy.name);
      preservingSteps.push({
        name: strategy.name,
        changed,
        inputText: before,
        outputText: after,
      });
      current = after;

      if (tryParse(current, format)) {
        const result: RepairResult = {
          repaired: true,
          text: current,
          strategiesApplied: preservingApplied,
          parseError: null,
          format,
        };
        if (options?.report) {
          return {
            result,
            report: createReport(text, current, true, preservingSteps, null, format),
          };
        }
        return result;
      }
    }
  }

  // First pass: apply ALL strategies in sequence, track which changed
  let current = text;
  const appliedNames: string[] = [];

  for (const strategy of strategyList) {
    const before = current;
    const after = strategy.apply(current);
    const changed = after !== before;
    if (changed) {
      appliedNames.push(strategy.name);
    }
    allSteps.push({
      name: strategy.name,
      changed,
      inputText: before,
      outputText: after,
    });
    current = after;
  }

  // Try parsing after all strategies applied
  if (tryParse(current, format)) {
    const result: RepairResult = {
      repaired: true,
      text: current,
      strategiesApplied: appliedNames,
      parseError: null,
      format,
    };
    if (options?.report) {
      return {
        result,
        report: createReport(text, current, true, allSteps, null, format),
      };
    }
    return result;
  }

  // Second pass: apply one at a time, try parsing between each
  current = text;
  const secondPassSteps: StrategyApplication[] = [];
  const secondPassApplied: string[] = [];

  for (const strategy of strategyList) {
    const before = current;
    const after = strategy.apply(current);
    const changed = after !== before;
    if (changed) {
      secondPassApplied.push(strategy.name);
    }
    secondPassSteps.push({
      name: strategy.name,
      changed,
      inputText: before,
      outputText: after,
    });
    current = after;

    if (tryParse(current, format)) {
      const result: RepairResult = {
        repaired: true,
        text: current,
        strategiesApplied: secondPassApplied,
        parseError: null,
        format,
      };
      if (options?.report) {
        return {
          result,
          report: createReport(text, current, true, secondPassSteps, null, format),
        };
      }
      return result;
    }
  }

  // All failed
  const parseError = getParseError(current, format);
  const result: RepairResult = {
    repaired: false,
    text: current,
    strategiesApplied: secondPassApplied,
    parseError,
    format,
  };
  if (options?.report) {
    return {
      result,
      report: createReport(text, current, false, secondPassSteps, parseError, format),
    };
  }
  return result;
}

function tryParse(text: string, format: string): boolean {
  try {
    parseDocument(text, format);
    return true;
  } catch {
    return false;
  }
}

function getParseError(text: string, format: string): string {
  try {
    parseDocument(text, format);
    return "";
  } catch (e: unknown) {
    if (e instanceof SyntaxError || e instanceof FormatParseError) return e.message;
    return String(e);
  }
}
