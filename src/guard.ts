import { validate } from "./validator.js";
import { repair } from "./repairer.js";
import { retryPrompt } from "./retry.js";
import { ParseError, SchemaValidationError } from "./exceptions.js";
import type { ValidationResult, RepairResult, ValidationError } from "./types.js";
import type { RepairReport } from "./report.js";

export interface OutputGuardOptions {
  strategies?: string[];
  maxRepairAttempts?: number;
}

export class OutputGuard {
  private strategies: string[] | undefined;
  private maxRepairAttempts: number;

  constructor(options: OutputGuardOptions = {}) {
    this.strategies = options.strategies;
    this.maxRepairAttempts = options.maxRepairAttempts ?? 3;
  }

  validate(text: string, schema: Record<string, unknown>): ValidationResult {
    return validate(text, schema);
  }

  repair(text: string): RepairResult;
  repair(text: string, options: { report: true }): { result: RepairResult; report: RepairReport };
  repair(text: string, options?: { report?: boolean }): RepairResult | { result: RepairResult; report: RepairReport } {
    if (options?.report) {
      return repair(text, this.strategies, { report: true });
    }
    return repair(text, this.strategies);
  }

  validateAndRepair(text: string, schema: Record<string, unknown>): ValidationResult {
    const result = this.validate(text, schema);
    if (result.valid) return result;

    let currentText = text;
    for (let i = 0; i < this.maxRepairAttempts; i++) {
      const repairResult = repair(currentText, this.strategies);
      if (!repairResult.repaired) continue;

      const revalidation = this.validate(repairResult.text, schema);
      if (revalidation.valid) {
        revalidation.repaired = true;
        revalidation.strategiesApplied = repairResult.strategiesApplied;
        revalidation.originalText = text;
        revalidation.repairedText = repairResult.text;
        return revalidation;
      }
      currentText = repairResult.text;
    }

    result.originalText = text;
    return result;
  }

  parse(text: string, schema: Record<string, unknown>): Record<string, unknown> | unknown[] {
    const result = this.validateAndRepair(text, schema);
    if (result.valid) return result.data!;

    if (result.data === null) {
      throw new ParseError(
        "Could not parse JSON from LLM output",
        text,
        result.errors[0]?.message ?? null,
      );
    }
    throw new SchemaValidationError(
      `JSON does not match schema: ${result.errors.length} error(s)`,
      result.data,
      result.errors,
      schema,
    );
  }

  retryPrompt(text: string, schema: Record<string, unknown>, errors: ValidationError[]): string {
    return retryPrompt(text, schema, errors);
  }
}
