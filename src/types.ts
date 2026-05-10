export interface ValidationError {
  message: string;
  path: string;        // JSON path, e.g. "$.items[0].name"
  schemaPath: string;  // Schema path that was violated
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  data: unknown;
  errors: ValidationError[];
  repaired: boolean;
  strategiesApplied: string[];
  originalText: string;
  repairedText: string;
  format: string;
}

export interface RepairResult {
  repaired: boolean;
  text: string;
  strategiesApplied: string[];
  parseError: string | null;
  format: string;
}

export type DataFormat = "json" | "yaml" | "toml" | "python" | "auto" | "forced-json-off";

export interface FormatOptions {
  format?: string;
}

export interface RetryPromptOptions extends FormatOptions {
  includeMessageHistory?: boolean;
}

export interface RepairOptions extends FormatOptions {
  report?: boolean;
}

export type Strategy = (text: string) => string;

export interface StrategyEntry {
  name: string;
  description: string;
  apply: Strategy;
}
