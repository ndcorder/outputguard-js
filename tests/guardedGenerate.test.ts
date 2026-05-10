import { describe, expect, it } from "vitest";

import {
  guardedGenerate,
  GuardedGenerationError,
  OutputGuard,
} from "../src/index.js";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
  },
  required: ["name", "age"],
};

describe("guardedGenerate", () => {
  it("retries with targeted prompts until the generated output validates", async () => {
    const prompts: string[] = [];
    const outputs = ['{"name":"Alice"}', '```json\n{"name":"Alice","age":30}\n```'];

    const result = await guardedGenerate<{ name: string; age: number }>({
      prompt: "Return user JSON",
      schema,
      maxRetries: 2,
      generate: async prompt => {
        prompts.push(prompt);
        return outputs[prompts.length - 1];
      },
    });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ name: "Alice", age: 30 });
    expect(result.text).toBe('{"name":"Alice","age":30}');
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toEqual(["strip_fences"]);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].result.valid).toBe(false);
    expect(result.attempts[1].result.valid).toBe(true);
    expect(prompts[1]).toContain("age");
    expect(prompts[1]).toContain("Return ONLY");
  });

  it("returns exhausted failure details when retries run out", async () => {
    const result = await guardedGenerate({
      prompt: "Return user JSON",
      schema,
      maxRetries: 1,
      generate: () => '{"name":"Alice"}',
    });

    expect(result.valid).toBe(false);
    expect(result.exhausted).toBe(true);
    expect(result.data).toBeNull();
    expect(result.errors.some(error => error.message.includes("age"))).toBe(true);
    expect(result.attempts).toHaveLength(2);
  });

  it("can disable repair for strict validation loops", async () => {
    const result = await guardedGenerate({
      prompt: "Return user JSON",
      schema,
      repair: false,
      maxRetries: 0,
      generate: () => '```json\n{"name":"Alice","age":30}\n```',
    });

    expect(result.valid).toBe(false);
    expect(result.repaired).toBe(false);
    expect(result.strategiesApplied).toEqual([]);
    expect(result.errors[0].path).toBe("$");
  });

  it("supports OutputGuard defaults and per-attempt observers", async () => {
    const seenAttempts: number[] = [];
    const guard = new OutputGuard({ format: "yaml" });

    const result = await guardedGenerate({
      prompt: "Return YAML",
      schema,
      guard,
      maxRetries: 0,
      generate: () => "name: Alice\nage: 30\n",
      onAttempt: attempt => {
        seenAttempts.push(attempt.attempt);
      },
    });

    expect(result.valid).toBe(true);
    expect(result.format).toBe("yaml");
    expect(result.data).toEqual({ name: "Alice", age: 30 });
    expect(seenAttempts).toEqual([0]);
  });

  it("throws a structured error when throwOnFailure is enabled", async () => {
    await expect(guardedGenerate({
      prompt: "Return user JSON",
      schema,
      maxRetries: 0,
      throwOnFailure: true,
      generate: () => '{"name":"Alice"}',
    })).rejects.toMatchObject({
      name: "GuardedGenerationError",
      result: {
        valid: false,
        exhausted: true,
      },
    });

    expect(new GuardedGenerationError("failed", {
      valid: false,
      data: null,
      text: "",
      attempts: [],
      errors: [],
      repaired: false,
      strategiesApplied: [],
      exhausted: true,
      format: "json",
    })).toBeInstanceOf(Error);
  });
});
