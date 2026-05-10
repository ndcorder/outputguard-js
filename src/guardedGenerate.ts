import { OutputGuard } from "./guard.js";
import type { FormatOptions, ValidationError, ValidationResult } from "./types.js";

export interface GuardedGenerateContext {
  attempt: number;
  prompt: string;
  previousText?: string;
  previousResult?: ValidationResult;
}

export type GuardedGenerateFunction = (
  prompt: string,
  context: GuardedGenerateContext,
) => string | Promise<string>;

export interface GuardedGenerateAttempt {
  attempt: number;
  prompt: string;
  rawText: string;
  result: ValidationResult;
}

export interface GuardedGenerateResult<T = unknown> {
  valid: boolean;
  data: T | null;
  text: string;
  attempts: GuardedGenerateAttempt[];
  errors: ValidationError[];
  repaired: boolean;
  strategiesApplied: string[];
  exhausted: boolean;
  format: string;
}

export interface GuardedGenerateOptions extends FormatOptions {
  prompt: string;
  schema: Record<string, unknown>;
  generate: GuardedGenerateFunction;
  guard?: OutputGuard;
  maxRetries?: number;
  repair?: boolean;
  throwOnFailure?: boolean;
  onAttempt?: (attempt: GuardedGenerateAttempt) => void | Promise<void>;
}

export class GuardedGenerationError<T = unknown> extends Error {
  result: GuardedGenerateResult<T>;

  constructor(message: string, result: GuardedGenerateResult<T>) {
    super(message);
    this.name = "GuardedGenerationError";
    this.result = result;
  }
}

export async function guardedGenerate<T = unknown>(
  options: GuardedGenerateOptions,
): Promise<GuardedGenerateResult<T>> {
  const guard = options.guard ?? new OutputGuard({ format: options.format ?? "json" });
  const format = options.format ?? guard.formatName;
  const maxRetries = options.maxRetries ?? 2;
  const shouldRepair = options.repair ?? true;
  const attempts: GuardedGenerateAttempt[] = [];
  let prompt = options.prompt;
  let previousText: string | undefined;
  let previousResult: ValidationResult | undefined;

  for (let attemptNumber = 0; attemptNumber <= maxRetries; attemptNumber++) {
    const rawText = await options.generate(prompt, {
      attempt: attemptNumber,
      prompt,
      previousText,
      previousResult,
    });
    const result = shouldRepair
      ? guard.validateAndRepair(rawText, options.schema, { format })
      : guard.validate(rawText, options.schema, { format });
    const attempt: GuardedGenerateAttempt = {
      attempt: attemptNumber,
      prompt,
      rawText,
      result,
    };
    attempts.push(attempt);
    await options.onAttempt?.(attempt);

    if (result.valid) {
      return {
        valid: true,
        data: result.data as T,
        text: result.repairedText || rawText,
        attempts,
        errors: [],
        repaired: attempts.some(item => item.result.repaired),
        strategiesApplied: collectStrategies(attempts),
        exhausted: false,
        format,
      };
    }

    previousText = result.repairedText || rawText;
    previousResult = result;
    if (attemptNumber < maxRetries) {
      prompt = guard.retryPrompt(previousText, options.schema, result.errors, { format });
    }
  }

  const finalResult = previousResult;
  const failed: GuardedGenerateResult<T> = {
    valid: false,
    data: null,
    text: previousText ?? "",
    attempts,
    errors: finalResult?.errors ?? [],
    repaired: attempts.some(item => item.result.repaired),
    strategiesApplied: collectStrategies(attempts),
    exhausted: true,
    format,
  };

  if (options.throwOnFailure) {
    throw new GuardedGenerationError(
      `Failed to generate valid ${format} output after ${attempts.length} attempt(s)`,
      failed,
    );
  }

  return failed;
}

function collectStrategies(attempts: GuardedGenerateAttempt[]): string[] {
  const seen = new Set<string>();
  for (const attempt of attempts) {
    for (const strategy of attempt.result.strategiesApplied) {
      seen.add(strategy);
    }
  }
  return [...seen];
}
