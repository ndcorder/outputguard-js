export interface ValidationError {
  message: string;
  path: string;        // JSON path, e.g. "$.items[0].name"
  schemaPath: string;  // Schema path that was violated
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  data: Record<string, unknown> | unknown[] | null;
  errors: ValidationError[];
  repaired: boolean;
  strategiesApplied: string[];
  originalText: string;
  repairedText: string;
}

export interface RepairResult {
  repaired: boolean;
  text: string;
  strategiesApplied: string[];
  parseError: string | null;
}

export type Strategy = (text: string) => string;

export interface StrategyEntry {
  name: string;
  description: string;
  apply: Strategy;
}
