import { OutputGuard } from "./guard.js";
import type { ValidationResult, RepairResult, ValidationError } from "./types.js";

// Re-export types
export type { ValidationResult, RepairResult, ValidationError, StrategyEntry } from "./types.js";
export type { RepairReport, StrategyApplication } from "./report.js";

// Re-export classes
export { OutputGuard } from "./guard.js";
export type { OutputGuardOptions } from "./guard.js";
export { OutputGuardError, ParseError, SchemaValidationError, RepairError } from "./exceptions.js";

// Re-export report utilities
export { getDiff, getStepDiffs, getConfidence, getSummary, getStrategiesApplied } from "./report.js";

// Re-export strategy registry
export { ALL_STRATEGIES, getStrategy, getStrategies } from "./strategies/index.js";

// Default instance
const defaultGuard = new OutputGuard();

export function validate(text: string, schema: Record<string, unknown>): ValidationResult {
  return defaultGuard.validate(text, schema);
}

export function repair(text: string): RepairResult {
  return defaultGuard.repair(text);
}

export function validateAndRepair(text: string, schema: Record<string, unknown>): ValidationResult {
  return defaultGuard.validateAndRepair(text, schema);
}

export function parse(text: string, schema: Record<string, unknown>): Record<string, unknown> | unknown[] {
  return defaultGuard.parse(text, schema);
}

export function retryPrompt(text: string, schema: Record<string, unknown>, errors: ValidationError[]): string {
  return defaultGuard.retryPrompt(text, schema, errors);
}
