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
  format: string;

  constructor(
    message: string,
    originalText: string,
    parseError: string | null = null,
    format = "json",
  ) {
    super(message);
    this.name = "ParseError";
    this.originalText = originalText;
    this.parseError = parseError;
    this.format = format;
  }
}

export class SchemaValidationError extends OutputGuardError {
  data: unknown;
  validationErrors: ValidationError[];
  schema: Record<string, unknown>;
  format: string;

  constructor(
    message: string,
    data: unknown,
    errors: ValidationError[],
    schema: Record<string, unknown>,
    format = "json",
  ) {
    super(message);
    this.name = "SchemaValidationError";
    this.data = data;
    this.validationErrors = errors;
    this.schema = schema;
    this.format = format;
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
