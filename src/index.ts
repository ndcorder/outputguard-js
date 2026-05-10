import { OutputGuard } from "./guard.js";
import type {
  FormatOptions,
  RepairOptions,
  RetryPromptOptions,
  ValidationResult,
  RepairResult,
  ValidationError,
} from "./types.js";

// Re-export types
export type {
  DataFormat,
  FormatOptions,
  RepairOptions,
  RetryPromptOptions,
  ValidationResult,
  RepairResult,
  ValidationError,
  StrategyEntry,
} from "./types.js";
export type { RepairReport, StrategyApplication } from "./report.js";
export type {
  BatchRepairResult,
  BatchSummary,
  BatchValidationResult,
  IndexedRepairResult,
  IndexedValidationResult,
  RepairBatchOptions,
  ValidateBatchOptions,
} from "./batch.js";
export type {
  GuardedGenerateAttempt,
  GuardedGenerateContext,
  GuardedGenerateFunction,
  GuardedGenerateOptions,
  GuardedGenerateResult,
} from "./guardedGenerate.js";
export { SUPPORTED_FORMATS } from "./formats.js";

// Re-export classes
export { OutputGuard } from "./guard.js";
export type { OutputGuardOptions } from "./guard.js";
export { OutputGuardError, ParseError, SchemaValidationError, RepairError } from "./exceptions.js";
export { GuardedGenerationError, guardedGenerate } from "./guardedGenerate.js";
export { repairBatch, validateBatch } from "./batch.js";

// Re-export report utilities
export { getDiff, getStepDiffs, getConfidence, getSummary, getStrategiesApplied } from "./report.js";

// Re-export strategy registry
export { ALL_STRATEGIES, getStrategy, getStrategies } from "./strategies/index.js";

// Default instance
const defaultGuard = new OutputGuard();

export function validate(
  text: string,
  schema: Record<string, unknown>,
  options: FormatOptions = {},
): ValidationResult {
  return defaultGuard.validate(text, schema, options);
}

export function repair(text: string, options: RepairOptions = {}): RepairResult {
  return defaultGuard.repair(text, options);
}

export function validateAndRepair(
  text: string,
  schema: Record<string, unknown>,
  options: FormatOptions = {},
): ValidationResult {
  return defaultGuard.validateAndRepair(text, schema, options);
}

export function parse(
  text: string,
  schema: Record<string, unknown>,
  options: FormatOptions = {},
): unknown {
  return defaultGuard.parse(text, schema, options);
}

export function retryPrompt(
  text: string,
  schema: Record<string, unknown>,
  errors: ValidationError[],
  options: RetryPromptOptions = {},
): string {
  return defaultGuard.retryPrompt(text, schema, errors, options);
}
