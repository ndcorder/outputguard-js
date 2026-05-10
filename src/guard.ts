import { validate } from "./validator.js";
import { repair } from "./repairer.js";
import { retryPrompt } from "./retry.js";
import { ParseError, SchemaValidationError } from "./exceptions.js";
import { formatLabel } from "./formats.js";
import type { FormatOptions, RepairOptions, ValidationResult, RepairResult, ValidationError } from "./types.js";
import type { RepairReport } from "./report.js";

export interface OutputGuardOptions {
  strategies?: string[];
  maxRepairAttempts?: number;
  format?: string;
}

export class OutputGuard {
  private strategies: string[] | undefined;
  private maxRepairAttempts: number;
  private format: string;

  constructor(options: OutputGuardOptions = {}) {
    this.strategies = options.strategies;
    this.maxRepairAttempts = options.maxRepairAttempts ?? 3;
    this.format = options.format ?? "json";
  }

  get formatName(): string {
    return this.format;
  }

  validate(
    text: string,
    schema: Record<string, unknown>,
    options: FormatOptions = {},
  ): ValidationResult {
    return validate(text, schema, { format: options.format ?? this.format });
  }

  repair(text: string): RepairResult;
  repair(text: string, options: RepairOptions & { report: true }): { result: RepairResult; report: RepairReport };
  repair(text: string, options: RepairOptions): RepairResult;
  repair(text: string, options?: RepairOptions): RepairResult | { result: RepairResult; report: RepairReport } {
    const format = options?.format ?? this.format;
    if (options?.report) {
      return repair(text, this.strategies, { report: true, format });
    }
    return repair(text, this.strategies, { format });
  }

  validateAndRepair(
    text: string,
    schema: Record<string, unknown>,
    options: FormatOptions = {},
  ): ValidationResult {
    const format = options.format ?? this.format;
    const result = this.validate(text, schema, { format });
    if (result.valid) return result;

    let currentText = text;
    for (let i = 0; i < this.maxRepairAttempts; i++) {
      const repairResult = repair(currentText, this.strategies, { format });
      if (!repairResult.repaired) continue;

      const revalidation = this.validate(repairResult.text, schema, { format });
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

  parse(text: string, schema: Record<string, unknown>, options: FormatOptions = {}): unknown {
    const format = options.format ?? this.format;
    const result = this.validateAndRepair(text, schema, { format });
    if (result.valid) return result.data!;

    if (result.data === null) {
      throw new ParseError(
        `Could not parse ${formatLabel(format)} from LLM output`,
        text,
        result.errors[0]?.message ?? null,
        format,
      );
    }
    throw new SchemaValidationError(
      `${formatLabel(format)} does not match schema: ${result.errors.length} error(s)`,
      result.data,
      result.errors,
      schema,
      format,
    );
  }

  retryPrompt(
    text: string,
    schema: Record<string, unknown>,
    errors: ValidationError[],
    options: FormatOptions = {},
  ): string {
    return retryPrompt(text, schema, errors, { format: options.format ?? this.format });
  }
}
