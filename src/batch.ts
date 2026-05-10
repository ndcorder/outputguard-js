import { OutputGuard } from "./guard.js";
import type { FormatOptions, RepairResult, ValidationResult } from "./types.js";

export interface IndexedValidationResult extends ValidationResult {
  index: number;
  input: string;
}

export interface IndexedRepairResult extends RepairResult {
  index: number;
  input: string;
}

export interface BatchSummary {
  total: number;
  valid: number;
  invalid: number;
  repaired: number;
  parseFailures: number;
  schemaFailures: number;
  successRate: number;
  strategyCounts: Record<string, number>;
  formats: Record<string, number>;
}

export interface BatchValidationResult {
  results: IndexedValidationResult[];
  summary: BatchSummary;
}

export interface BatchRepairResult {
  results: IndexedRepairResult[];
  summary: BatchSummary;
}

export interface ValidateBatchOptions extends FormatOptions {
  repair?: boolean;
  guard?: OutputGuard;
}

export interface RepairBatchOptions extends FormatOptions {
  guard?: OutputGuard;
}

export function validateBatch(
  texts: string[],
  schema: Record<string, unknown>,
  options: ValidateBatchOptions = {},
): BatchValidationResult {
  const guard = options.guard ?? new OutputGuard({ format: options.format ?? "json" });
  const results = texts.map((input, index): IndexedValidationResult => {
    const result = options.repair
      ? guard.validateAndRepair(input, schema, { format: options.format })
      : guard.validate(input, schema, { format: options.format });
    return { ...result, index, input };
  });

  return {
    results,
    summary: summarizeValidation(results),
  };
}

export function repairBatch(
  texts: string[],
  options: RepairBatchOptions = {},
): BatchRepairResult {
  const guard = options.guard ?? new OutputGuard({ format: options.format ?? "json" });
  const results = texts.map((input, index): IndexedRepairResult => {
    const result = guard.repair(input, { format: options.format });
    return { ...result, index, input };
  });

  return {
    results,
    summary: summarizeRepairs(results),
  };
}

function summarizeValidation(results: IndexedValidationResult[]): BatchSummary {
  const total = results.length;
  const valid = results.filter(result => result.valid).length;
  const repaired = results.filter(result => result.repaired).length;
  const parseFailures = results.filter(result => !result.valid && result.data === null).length;
  const invalid = total - valid;

  return {
    total,
    valid,
    invalid,
    repaired,
    parseFailures,
    schemaFailures: invalid - parseFailures,
    successRate: total === 0 ? 0 : roundRate(valid / total),
    strategyCounts: countStrategies(results),
    formats: countFormats(results),
  };
}

function summarizeRepairs(results: IndexedRepairResult[]): BatchSummary {
  const total = results.length;
  const valid = results.filter(result => result.parseError === null).length;
  const repaired = results.filter(result => result.repaired).length;
  const invalid = total - valid;

  return {
    total,
    valid,
    invalid,
    repaired,
    parseFailures: invalid,
    schemaFailures: 0,
    successRate: total === 0 ? 0 : roundRate(valid / total),
    strategyCounts: countStrategies(results),
    formats: countFormats(results),
  };
}

function countStrategies(results: Array<ValidationResult | RepairResult>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    for (const strategy of result.strategiesApplied) {
      counts[strategy] = (counts[strategy] ?? 0) + 1;
    }
  }
  return counts;
}

function countFormats(results: Array<ValidationResult | RepairResult>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    counts[result.format] = (counts[result.format] ?? 0) + 1;
  }
  return counts;
}

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}
