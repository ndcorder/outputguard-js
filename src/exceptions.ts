import type { ValidationError } from "./types.js";

export class OutputGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutputGuardError";
  }
}

export class ParseError extends OutputGuardError {
  originalText: string;
  parseError: string | null;

  constructor(message: string, originalText: string, parseError: string | null = null) {
    super(message);
    this.name = "ParseError";
    this.originalText = originalText;
    this.parseError = parseError;
  }
}

export class SchemaValidationError extends OutputGuardError {
  data: Record<string, unknown> | unknown[];
  validationErrors: ValidationError[];
  schema: Record<string, unknown>;

  constructor(
    message: string,
    data: Record<string, unknown> | unknown[],
    errors: ValidationError[],
    schema: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SchemaValidationError";
    this.data = data;
    this.validationErrors = errors;
    this.schema = schema;
  }
}

export class RepairError extends OutputGuardError {
  strategiesTried: string[];
  originalText: string;

  constructor(message: string, strategiesTried: string[], originalText: string) {
    super(message);
    this.name = "RepairError";
    this.strategiesTried = strategiesTried;
    this.originalText = originalText;
  }
}
