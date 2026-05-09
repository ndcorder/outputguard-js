import type { RepairResult } from "./types.js";
import type { RepairReport, StrategyApplication } from "./report.js";
import { createReport } from "./report.js";
import { getStrategies } from "./strategies/index.js";

export function repair(text: string, strategies?: string[]): RepairResult;
export function repair(
  text: string,
  strategies: string[] | undefined,
  options: { report: true },
): { result: RepairResult; report: RepairReport };
export function repair(
  text: string,
  strategies?: string[],
  options?: { report?: boolean },
): RepairResult | { result: RepairResult; report: RepairReport } {
  // Try parsing as-is
  const earlyParse = tryParse(text);
  if (earlyParse !== null) {
    const result: RepairResult = {
      repaired: false,
      text,
      strategiesApplied: [],
      parseError: null,
    };
    if (options?.report) {
      return {
        result,
        report: createReport(text, text, true, [], null),
      };
    }
    return result;
  }

  const strategyList = getStrategies(strategies);
  const allSteps: StrategyApplication[] = [];

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
  const firstPassParse = tryParse(current);
  if (firstPassParse !== null) {
    const result: RepairResult = {
      repaired: true,
      text: current,
      strategiesApplied: appliedNames,
      parseError: null,
    };
    if (options?.report) {
      return {
        result,
        report: createReport(text, current, true, allSteps, null),
      };
    }
    return result;
  }

  // Second pass: apply one at a time, try JSON.parse between each
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

    const parsed = tryParse(current);
    if (parsed !== null) {
      const result: RepairResult = {
        repaired: true,
        text: current,
        strategiesApplied: secondPassApplied,
        parseError: null,
      };
      if (options?.report) {
        return {
          result,
          report: createReport(text, current, true, secondPassSteps, null),
        };
      }
      return result;
    }
  }

  // All failed
  const parseError = getParseError(current);
  const result: RepairResult = {
    repaired: false,
    text: current,
    strategiesApplied: secondPassApplied,
    parseError,
  };
  if (options?.report) {
    return {
      result,
      report: createReport(text, current, false, secondPassSteps, parseError),
    };
  }
  return result;
}

function tryParse(text: string): unknown | null {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return null;
  }
}

function getParseError(text: string): string {
  try {
    JSON.parse(text);
    return "";
  } catch (e: unknown) {
    if (e instanceof SyntaxError) return e.message;
    return String(e);
  }
}
