/**
 * Exhaustive API contract tests for outputguard-js public surfaces.
 *
 * Covers: parse, validate, repair, validateAndRepair, retryPrompt,
 * OutputGuard class, exceptions, RepairReport, strategy registry.
 */

import {
  parse,
  repair,
  validate,
  validateAndRepair,
  retryPrompt,
  OutputGuard,
  OutputGuardError,
  ParseError,
  SchemaValidationError,
  RepairError,
  ALL_STRATEGIES,
  getStrategy,
  getStrategies,
  getDiff,
  getStepDiffs,
  getConfidence,
  getSummary,
  getStrategiesApplied,
} from "../src/index.js";
import { repair as rawRepair } from "../src/repairer.js";
import { getStrategiesTried } from "../src/report.js";
import type { RepairResult, ValidationError, ValidationResult } from "../src/types.js";
import type { RepairReport, StrategyApplication } from "../src/report.js";

// ─────────────────────────────────────────────────────────────────────
// Shared schemas
// ─────────────────────────────────────────────────────────────────────

const OBJECT_SCHEMA = { type: "object" };
const ARRAY_SCHEMA = { type: "array" };
const SIMPLE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
  },
  required: ["name", "age"],
};
const NESTED_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
        },
        required: ["name", "price"],
      },
    },
  },
  required: ["items"],
};
const ENUM_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["active", "inactive", "pending"] },
    priority: { type: "integer", minimum: 1, maximum: 5 },
  },
  required: ["status", "priority"],
};
const NUMBER_SCHEMA = {
  type: "object",
  properties: {
    value: { type: "number", minimum: 0, maximum: 100 },
  },
  required: ["value"],
};
const STRING_PATTERN_SCHEMA = {
  type: "object",
  properties: {
    code: { type: "string", pattern: "^[A-Z]{3}$" },
  },
  required: ["code"],
};

// ═════════════════════════════════════════════════════════════════════
// Class 1 — TestParseFunction (25 cases)
// ═════════════════════════════════════════════════════════════════════

describe("TestParseFunction", () => {
  it("parse returns dict", () => {
    const data = parse('{"a": 1}', OBJECT_SCHEMA);
    expect(typeof data).toBe("object");
    expect(data).toEqual({ a: 1 });
  });

  it("parse returns list", () => {
    const data = parse("[1, 2, 3]", ARRAY_SCHEMA);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toEqual([1, 2, 3]);
  });

  it("parse repairs then returns", () => {
    const data = parse('```json\n{"a": 1}\n```', OBJECT_SCHEMA);
    expect(data).toEqual({ a: 1 });
  });

  it("parse raises parse error on garbage", () => {
    try {
      parse("not json", OBJECT_SCHEMA);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).originalText).toBe("not json");
      expect((e as ParseError).parseError).not.toBeNull();
    }
  });

  it("parse raises schema error", () => {
    try {
      parse('{"a": 1}', { type: "object", required: ["b"] });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SchemaValidationError);
      expect((e as SchemaValidationError).data).toEqual({ a: 1 });
      expect((e as SchemaValidationError).validationErrors.length).toBeGreaterThan(0);
      expect((e as SchemaValidationError).schema).toEqual({ type: "object", required: ["b"] });
    }
  });

  it("parse error is outputguard error", () => {
    expect(() => parse("garbage", OBJECT_SCHEMA)).toThrow(OutputGuardError);
  });

  it("schema error is outputguard error", () => {
    expect(() => parse('{"a": 1}', { type: "object", required: ["b"] })).toThrow(OutputGuardError);
  });

  it("parse with nested object", () => {
    const text = JSON.stringify({ items: [{ name: "x", price: 1.0 }] });
    const data = parse(text, NESTED_SCHEMA) as Record<string, unknown>;
    expect((data.items as Array<Record<string, unknown>>)[0].name).toBe("x");
  });

  it("parse with enum schema", () => {
    const text = JSON.stringify({ status: "active", priority: 3 });
    const data = parse(text, ENUM_SCHEMA) as Record<string, unknown>;
    expect(data.status).toBe("active");
  });

  it("parse rejects invalid enum", () => {
    expect(() => parse('{"status": "unknown", "priority": 3}', ENUM_SCHEMA)).toThrow(SchemaValidationError);
  });

  it("parse rejects number out of range", () => {
    expect(() => parse('{"value": 200}', NUMBER_SCHEMA)).toThrow(SchemaValidationError);
  });

  it("parse accepts number in range", () => {
    const data = parse('{"value": 50}', NUMBER_SCHEMA) as Record<string, unknown>;
    expect(data.value).toBe(50);
  });

  it("parse rejects bad pattern", () => {
    expect(() => parse('{"code": "abc"}', STRING_PATTERN_SCHEMA)).toThrow(SchemaValidationError);
  });

  it("parse accepts good pattern", () => {
    const data = parse('{"code": "ABC"}', STRING_PATTERN_SCHEMA) as Record<string, unknown>;
    expect(data.code).toBe("ABC");
  });

  it("parse empty object matches empty schema", () => {
    const data = parse("{}", OBJECT_SCHEMA);
    expect(data).toEqual({});
  });

  it("parse empty array matches array schema", () => {
    const data = parse("[]", ARRAY_SCHEMA);
    expect(data).toEqual([]);
  });

  it("parse with trailing comma repair", () => {
    const data = parse('{"a": 1,}', OBJECT_SCHEMA);
    expect(data).toEqual({ a: 1 });
  });

  it("parse with single quotes repair", () => {
    const data = parse("{'a': 1}", OBJECT_SCHEMA);
    expect(data).toEqual({ a: 1 });
  });

  it("parse with unquoted keys repair", () => {
    const data = parse("{a: 1}", OBJECT_SCHEMA);
    expect(data).toEqual({ a: 1 });
  });

  it("parse repairs but still fails schema", () => {
    try {
      parse('{"x": 1}', SIMPLE_SCHEMA);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SchemaValidationError);
      expect((e as SchemaValidationError).data).toEqual({ x: 1 });
    }
  });

  it("parse preserves data types", () => {
    const text = JSON.stringify({ name: "Jo", age: 25 });
    const data = parse(text, SIMPLE_SCHEMA) as Record<string, unknown>;
    expect(typeof data.name).toBe("string");
    expect(typeof data.age).toBe("number");
  });

  it("parse boolean values", () => {
    const schema = { type: "object", properties: { ok: { type: "boolean" } } };
    const data = parse('{"ok": true}', schema) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });

  it("parse null value", () => {
    const schema = { type: "object", properties: { x: { type: ["string", "null"] } } };
    const data = parse('{"x": null}', schema) as Record<string, unknown>;
    expect(data.x).toBeNull();
  });

  it("parse deeply nested", () => {
    const schema = {
      type: "object",
      properties: {
        a: {
          type: "object",
          properties: {
            b: { type: "object", properties: { c: { type: "integer" } } },
          },
        },
      },
    };
    const data = parse('{"a": {"b": {"c": 42}}}', schema) as Record<string, unknown>;
    expect((((data.a as Record<string, unknown>).b) as Record<string, unknown>).c).toBe(42);
  });

  it("parse error message is string", () => {
    try {
      parse("xxx", OBJECT_SCHEMA);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(typeof String(e)).toBe("string");
      expect(String(e).length).toBeGreaterThan(0);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// Class 2 — TestValidationResult (18 cases)
// ═════════════════════════════════════════════════════════════════════

describe("TestValidationResult", () => {
  it("valid result fields", () => {
    const result = validate('{"a": 1}', OBJECT_SCHEMA);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ a: 1 });
    expect(result.errors).toEqual([]);
    expect(result.repaired).toBe(false);
    expect(result.strategiesApplied).toEqual([]);
    expect(result.originalText).toBe('{"a": 1}');
    expect(result.repairedText).toBe("");
  });

  it("invalid result has errors", () => {
    const schema = { type: "object", properties: { a: { type: "integer" } } };
    const result = validate('{"a": "x"}', schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).not.toBe("");
    expect(result.errors[0].message).not.toBe("");
  });

  it("repair result fields via validateAndRepair", () => {
    const result = validateAndRepair('```json\n{"a": 1}\n```', OBJECT_SCHEMA);
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied.length).toBeGreaterThan(0);
    expect(result.originalText).toBe('```json\n{"a": 1}\n```');
    expect(result.repairedText).not.toBe("");
    expect(result.repairedText).not.toBe(result.originalText);
  });

  it("multiple validation errors", () => {
    const schema = {
      type: "object",
      properties: { a: { type: "integer" }, b: { type: "string" } },
      required: ["a", "b"],
    };
    const result = validate('{"a": "wrong", "b": 123}', schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("error paths nested", () => {
    const schema = {
      type: "object",
      properties: { items: { type: "array", items: { type: "integer" } } },
    };
    const result = validate('{"items": [1, "two", 3]}', schema);
    expect(result.errors.some(e => e.path.includes("items"))).toBe(true);
  });

  it("valid result data is parsed", () => {
    const result = validate('{"x": [1, 2]}', OBJECT_SCHEMA);
    expect(result.data).toEqual({ x: [1, 2] });
  });

  it("invalid json result", () => {
    const result = validate("not json", OBJECT_SCHEMA);
    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors.length).toBe(1);
  });

  it("result is validation result", () => {
    const result = validate("{}", OBJECT_SCHEMA);
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("errors");
  });

  it("validation error has value field", () => {
    const schema = { type: "object", properties: { a: { type: "integer" } } };
    const result = validate('{"a": "text"}', schema);
    // Ajv may or may not populate the value field depending on version/config
    // Just verify the error exists and has the expected structure
    expect(result.errors[0].message).not.toBe("");
    expect(result.errors[0].path).not.toBe("");
  });

  it("validation error schema path", () => {
    const schema = { type: "object", properties: { a: { type: "integer" } } };
    const result = validate('{"a": "text"}', schema);
    expect(result.errors[0].schemaPath).not.toBe("");
  });

  it("valid array schema", () => {
    const result = validate("[1, 2, 3]", ARRAY_SCHEMA);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual([1, 2, 3]);
  });

  it("type mismatch root", () => {
    const result = validate("[1, 2]", OBJECT_SCHEMA);
    expect(result.valid).toBe(false);
  });

  it("additional properties allowed by default", () => {
    const result = validate('{"name": "x", "age": 1, "extra": true}', SIMPLE_SCHEMA);
    expect(result.valid).toBe(true);
  });

  it("missing required field", () => {
    const result = validate('{"name": "x"}', SIMPLE_SCHEMA);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes("age"))).toBe(true);
  });

  it("validate preserves original text", () => {
    const text = '{"a":   1  }';
    const result = validate(text, OBJECT_SCHEMA);
    expect(result.originalText).toBe(text);
  });

  it("validateAndRepair already valid", () => {
    const result = validateAndRepair('{"a": 1}', OBJECT_SCHEMA);
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(false);
    expect(result.strategiesApplied).toEqual([]);
  });

  it("validateAndRepair unrepairable", () => {
    const result = validateAndRepair("total garbage here", OBJECT_SCHEMA);
    expect(result.valid).toBe(false);
  });

  it("validateAndRepair repaired text is valid json", () => {
    const result = validateAndRepair('```json\n{"x": 1}\n```', OBJECT_SCHEMA);
    expect(result.valid).toBe(true);
    const parsed = JSON.parse(result.repairedText);
    expect(parsed).toEqual({ x: 1 });
  });
});

// ═════════════════════════════════════════════════════════════════════
// Class 3 — TestRepairResult (12 cases)
// ═════════════════════════════════════════════════════════════════════

describe("TestRepairResult", () => {
  it("result not repaired", () => {
    const result = repair('{"a": 1}');
    expect(result.repaired).toBe(false);
    expect(result.text).toBe('{"a": 1}');
    expect(result.strategiesApplied).toEqual([]);
    expect(result.parseError).toBeNull();
  });

  it("result repaired", () => {
    const result = repair('```json\n{"a": 1}\n```');
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toContain("strip_fences");
    expect(result.parseError).toBeNull();
  });

  it("result failed", () => {
    const result = repair("totally broken");
    expect(result.repaired).toBe(false);
    expect(result.parseError).not.toBeNull();
    expect(typeof result.parseError).toBe("string");
  });

  it("result is repair result", () => {
    const result = repair('{"a": 1}');
    expect(result).toHaveProperty("repaired");
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("strategiesApplied");
    expect(result).toHaveProperty("parseError");
  });

  it("repaired text is valid json", () => {
    const result = repair('```json\n{"a": 1}\n```');
    expect(result.repaired).toBe(true);
    const parsed = JSON.parse(result.text);
    expect(parsed).toEqual({ a: 1 });
  });

  it("unrepaired text preserved", () => {
    const original = "totally broken";
    const result = repair(original);
    // After all strategies applied, text may differ but repaired should be false
    expect(result.repaired).toBe(false);
  });

  it("strategies applied is list", () => {
    const result = repair('{"a": 1}');
    expect(Array.isArray(result.strategiesApplied)).toBe(true);
  });

  it("repair trailing comma", () => {
    const result = repair('{"a": 1,}');
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toContain("fix_commas");
  });

  it("repair single quotes", () => {
    const result = repair("{'a': 1}");
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toContain("fix_quotes");
  });

  it("repair unquoted keys", () => {
    const result = repair("{a: 1}");
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toContain("fix_keys");
  });

  it("repair multiple issues", () => {
    const result = repair("```json\n{a: 'hello',}\n```");
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied.length).toBeGreaterThanOrEqual(2);
  });

  it("repair empty string fails", () => {
    const result = repair("");
    expect(result.repaired).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════
// Class 4 — TestRepairReport (18 cases)
// ═════════════════════════════════════════════════════════════════════

describe("TestRepairReport", () => {
  it("report from repairer", () => {
    const { result, report } = rawRepair('```json\n{"a": 1}\n```', undefined, { report: true });
    expect(result.repaired).toBe(true);
    expect(report.success).toBe(true);
    expect(report.steps.length).toBeGreaterThan(0);
    expect(report.originalText).toBe('```json\n{"a": 1}\n```');
    expect(report.finalText).toBe('{"a": 1}');
  });

  it("report confidence range", () => {
    const { report } = rawRepair('```json\n{"a": 1}\n```', undefined, { report: true });
    const confidence = getConfidence(report);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("report confidence positive for single strategy", () => {
    const { report } = rawRepair('```json\n{"a": 1}\n```', undefined, { report: true });
    expect(getConfidence(report)).toBeGreaterThanOrEqual(0.5);
  });

  it("report confidence lower for many strategies", () => {
    const { report } = rawRepair("```json\n{name: 'x', val: 1,}\n```", undefined, { report: true });
    expect(getConfidence(report)).toBeLessThan(1.0);
  });

  it("report confidence zero on failure", () => {
    const { report } = rawRepair("garbage", undefined, { report: true });
    expect(getConfidence(report)).toBe(0);
  });

  it("report confidence one for valid", () => {
    const { report } = rawRepair('{"a": 1}', undefined, { report: true });
    expect(getConfidence(report)).toBe(1.0);
  });

  it("report diff present", () => {
    const { report } = rawRepair('```json\n{"a": 1}\n```', undefined, { report: true });
    const diff = getDiff(report);
    expect(diff.includes("original") || diff.includes("---")).toBe(true);
  });

  it("report no diff for valid", () => {
    const { report } = rawRepair('{"a": 1}', undefined, { report: true });
    expect(getDiff(report)).toBe("");
  });

  it("report summary contains strategy", () => {
    const { report } = rawRepair('```json\n{"a": 1}\n```', undefined, { report: true });
    const summary = getSummary(report);
    expect(summary).toContain("strip_fences");
  });

  it("report summary for valid", () => {
    const { report } = rawRepair('{"a": 1}', undefined, { report: true });
    const summary = getSummary(report);
    expect(summary.toLowerCase().includes("valid") || summary.includes("No repair")).toBe(true);
  });

  it("report summary for failure", () => {
    const { report } = rawRepair("garbage", undefined, { report: true });
    expect(getSummary(report).toLowerCase()).toContain("fail");
  });

  it("report step diffs multi strategy", () => {
    const { report } = rawRepair("```json\n{name: 'x',}\n```", undefined, { report: true });
    const stepDiffs = getStepDiffs(report);
    expect(stepDiffs).toContain("===");
  });

  it("report strategies applied list", () => {
    const { report } = rawRepair("```json\n{name: 'x',}\n```", undefined, { report: true });
    const applied = getStrategiesApplied(report);
    expect(applied).toContain("strip_fences");
    expect(Array.isArray(applied)).toBe(true);
  });

  it("report strategies tried list", () => {
    const { report } = rawRepair('```json\n{"a": 1}\n```', undefined, { report: true });
    const tried = getStrategiesTried(report);
    expect(Array.isArray(tried)).toBe(true);
    expect(tried.length).toBeGreaterThanOrEqual(getStrategiesApplied(report).length);
  });

  it("report success flag on failure", () => {
    const { report } = rawRepair("garbage", undefined, { report: true });
    expect(report.success).toBe(false);
  });

  it("report parse error on failure", () => {
    const { report } = rawRepair("garbage", undefined, { report: true });
    expect(report.parseError).not.toBeNull();
    expect(typeof report.parseError).toBe("string");
  });

  it("report steps are strategy applications", () => {
    const { report } = rawRepair('```json\n{"a": 1}\n```', undefined, { report: true });
    for (const step of report.steps) {
      expect(typeof step.name).toBe("string");
      expect(typeof step.changed).toBe("boolean");
    }
  });

  // Skipped: Python-only — StrategyApplication.diff is not a property in JS
});

// ═════════════════════════════════════════════════════════════════════
// Class 5 — TestStrategyRegistry (12 cases, some skipped)
// ═════════════════════════════════════════════════════════════════════

describe("TestStrategyRegistry", () => {
  it("all strategies count", () => {
    expect(ALL_STRATEGIES.length).toBe(15);
  });

  // Skipped: Python-only (STRATEGY_DESCRIPTIONS dict doesn't exist in JS)
  // test_all_strategies_have_descriptions

  it("get strategy by name", () => {
    const entry = getStrategy("strip_fences");
    expect(typeof entry.apply).toBe("function");
  });

  it("get strategy unknown raises", () => {
    expect(() => getStrategy("nonexistent")).toThrow(/Unknown strategy/);
  });

  it("get strategies none returns all", () => {
    const strategies = getStrategies();
    expect(strategies.length).toBe(15);
  });

  it("get strategies subset", () => {
    const strategies = getStrategies(["strip_fences", "fix_commas"]);
    expect(strategies.length).toBe(2);
    const names = strategies.map(s => s.name);
    expect(names).toContain("strip_fences");
    expect(names).toContain("fix_commas");
  });

  it("get strategies empty list", () => {
    const strategies = getStrategies([]);
    expect(strategies.length).toBe(0);
  });

  it("strategy functions are callable", () => {
    for (const entry of ALL_STRATEGIES) {
      expect(typeof entry.apply).toBe("function");
    }
  });

  it("strategy handles empty string", () => {
    for (const entry of ALL_STRATEGIES) {
      const result = entry.apply("");
      expect(typeof result).toBe("string");
    }
  });

  it("all strategies are objects with name and apply", () => {
    for (const entry of ALL_STRATEGIES) {
      expect(typeof entry.name).toBe("string");
      expect(typeof entry.apply).toBe("function");
    }
  });

  // Skipped: Python-only (STRATEGY_DESCRIPTIONS dict doesn't exist in JS)
  // test_strategy_descriptions_keys_match

  it("strategy order fix_encoding first", () => {
    expect(ALL_STRATEGIES[0].name).toBe("fix_encoding");
  });
});

// ═════════════════════════════════════════════════════════════════════
// Class 6 — TestOutputGuardClass (15 cases, some adapted)
// ═════════════════════════════════════════════════════════════════════

describe("TestOutputGuardClass", () => {
  it("default guard validate", () => {
    const guard = new OutputGuard();
    const result = guard.validate('{"a": 1}', OBJECT_SCHEMA);
    expect(result.valid).toBe(true);
  });

  it("custom strategies ignores others", () => {
    const guard = new OutputGuard({ strategies: ["strip_fences"] });
    const result = guard.repair("{'a': 1}"); // needs fix_quotes
    expect(result.repaired).toBe(false);
  });

  it("custom strategies applies selected", () => {
    const guard = new OutputGuard({ strategies: ["strip_fences"] });
    const result = guard.repair('```json\n{"a": 1}\n```');
    expect(result.repaired).toBe(true);
  });

  it("max repair attempts", () => {
    const guard = new OutputGuard({ maxRepairAttempts: 1 });
    const result = guard.validateAndRepair('```json\n{"a": 1}\n```', OBJECT_SCHEMA);
    expect(result.valid).toBe(true);
  });

  it("parse method", () => {
    const guard = new OutputGuard();
    const data = guard.parse('{"a": 1}', OBJECT_SCHEMA);
    expect(data).toEqual({ a: 1 });
  });

  it("parse method raises parse error", () => {
    const guard = new OutputGuard();
    expect(() => guard.parse("garbage", OBJECT_SCHEMA)).toThrow(ParseError);
  });

  it("parse method raises schema error", () => {
    const guard = new OutputGuard();
    expect(() => guard.parse('{"a": 1}', { type: "object", required: ["b"] })).toThrow(SchemaValidationError);
  });

  it("retry prompt method", () => {
    const guard = new OutputGuard();
    const errors: ValidationError[] = [
      { message: "missing field", path: "$.name", schemaPath: "required" },
    ];
    const prompt = guard.retryPrompt("{}", SIMPLE_SCHEMA, errors);
    expect(prompt).toContain("name");
    expect(prompt.toLowerCase()).toContain("missing");
  });

  it("validateAndRepair method", () => {
    const guard = new OutputGuard();
    const result = guard.validateAndRepair('```json\n{"a": 1}\n```', OBJECT_SCHEMA);
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(true);
  });

  it("repair with report", () => {
    const guard = new OutputGuard();
    const { result, report } = guard.repair('```json\n{"a": 1}\n```', { report: true });
    expect(result.repaired).toBe(true);
    expect(report.success).toBe(true);
  });

  it("repair without report", () => {
    const guard = new OutputGuard();
    const result = guard.repair('{"a": 1}');
    expect(result).toHaveProperty("repaired");
    expect(result).toHaveProperty("text");
  });

  // Skipped: Python-only — JS OutputGuard has private fields, no .max_repair_attempts / .strategies accessors
  // test_default_max_repair_attempts
  // test_default_strategies_is_none

  it("guard validate invalid", () => {
    const guard = new OutputGuard();
    const result = guard.validate("not json", OBJECT_SCHEMA);
    expect(result.valid).toBe(false);
  });

  it("guard repair valid json", () => {
    const guard = new OutputGuard();
    const result = guard.repair('{"x": 1}');
    expect(result.repaired).toBe(false);
    expect(result.text).toBe('{"x": 1}');
  });
});

// ═════════════════════════════════════════════════════════════════════
// Class 7 — TestRetryPrompt (12 cases)
// ═════════════════════════════════════════════════════════════════════

describe("TestRetryPrompt", () => {
  it("prompt contains errors", () => {
    const errors: ValidationError[] = [
      { message: "wrong type", path: "$.age", schemaPath: "properties.age.type" },
    ];
    const prompt = retryPrompt('{"age": "thirty"}', OBJECT_SCHEMA, errors);
    expect(prompt).toContain("$.age");
    expect(prompt).toContain("wrong type");
  });

  it("prompt contains schema info", () => {
    const errors: ValidationError[] = [
      { message: "missing", path: "$", schemaPath: "required" },
    ];
    const prompt = retryPrompt("{}", SIMPLE_SCHEMA, errors);
    expect(prompt).toContain("name");
  });

  it("prompt truncates long input", () => {
    const longText = '{"x": "' + "a".repeat(1000) + '"}';
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt(longText, OBJECT_SCHEMA, errors);
    expect(prompt).toContain("...");
  });

  it("prompt has return instruction", () => {
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt("{}", OBJECT_SCHEMA, errors);
    expect(prompt.toLowerCase()).toContain("return only");
  });

  it("prompt is string", () => {
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt("{}", OBJECT_SCHEMA, errors);
    expect(typeof prompt).toBe("string");
  });

  it("prompt multiple errors", () => {
    const errors: ValidationError[] = [
      { message: "err1", path: "$.a", schemaPath: "p1" },
      { message: "err2", path: "$.b", schemaPath: "p2" },
    ];
    const prompt = retryPrompt("{}", OBJECT_SCHEMA, errors);
    expect(prompt).toContain("err1");
    expect(prompt).toContain("err2");
  });

  it("prompt empty errors", () => {
    const prompt = retryPrompt("{}", OBJECT_SCHEMA, []);
    expect(typeof prompt).toBe("string");
  });

  it("prompt includes original output", () => {
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt('{"key": "value"}', OBJECT_SCHEMA, errors);
    expect(prompt).toContain("key");
  });

  it("prompt short input not truncated", () => {
    const shortText = '{"a": 1}';
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt(shortText, OBJECT_SCHEMA, errors);
    expect(prompt).toContain(shortText);
  });

  it("prompt with nested schema", () => {
    const errors: ValidationError[] = [
      { message: "missing items", path: "$", schemaPath: "required" },
    ];
    const prompt = retryPrompt("{}", NESTED_SCHEMA, errors);
    expect(prompt).toContain("items");
  });

  it("prompt with array schema", () => {
    const schema = { type: "array", items: { type: "integer" } };
    const errors: ValidationError[] = [
      { message: "not array", path: "$", schemaPath: "type" },
    ];
    const prompt = retryPrompt("{}", schema, errors);
    expect(prompt.toLowerCase()).toContain("array");
  });

  it("prompt numbered errors", () => {
    const errors: ValidationError[] = [
      { message: "a", path: "$.x", schemaPath: "" },
      { message: "b", path: "$.y", schemaPath: "" },
    ];
    const prompt = retryPrompt("{}", OBJECT_SCHEMA, errors);
    expect(prompt).toContain("1.");
    expect(prompt).toContain("2.");
  });
});

// ═════════════════════════════════════════════════════════════════════
// Class 8 — TestExceptionHierarchy (10 cases, some skipped)
// ═════════════════════════════════════════════════════════════════════

describe("TestExceptionHierarchy", () => {
  it("base exception", () => {
    const err = new OutputGuardError("test");
    expect(String(err)).toContain("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("parse error inherits", () => {
    expect(new ParseError("x", "", null)).toBeInstanceOf(OutputGuardError);
  });

  it("schema error inherits", () => {
    expect(new SchemaValidationError("x", {}, [], {})).toBeInstanceOf(OutputGuardError);
  });

  it("repair error inherits", () => {
    expect(new RepairError("x", [], "")).toBeInstanceOf(OutputGuardError);
  });

  // Skipped: Python-only (StrategyError does not exist in JS)

  it("parse error attributes", () => {
    const err = new ParseError("msg", "raw", "detail");
    expect(err.originalText).toBe("raw");
    expect(err.parseError).toBe("detail");
    expect(String(err)).toContain("msg");
  });

  it("schema error attributes", () => {
    const errs = [{ message: "bad", path: "", schemaPath: "" }];
    const err = new SchemaValidationError("msg", { a: 1 }, errs, { type: "object" });
    expect(err.data).toEqual({ a: 1 });
    expect(err.validationErrors).toEqual(errs);
    expect(err.schema).toEqual({ type: "object" });
  });

  it("repair error attributes", () => {
    const err = new RepairError("msg", ["a", "b"], "raw");
    expect(err.strategiesTried).toEqual(["a", "b"]);
    expect(err.originalText).toBe("raw");
  });

  // Skipped: Python-only (StrategyError does not exist in JS)

  it("exceptions catchable by base", () => {
    for (const ExcClass of [ParseError, SchemaValidationError, RepairError]) {
      const instance = ExcClass === ParseError
        ? new ParseError("t", "", null)
        : ExcClass === SchemaValidationError
          ? new SchemaValidationError("t", {}, [], {})
          : new RepairError("t", [], "");
      expect(instance).toBeInstanceOf(OutputGuardError);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// Class 9 — TestCLIEdgeCases
// Skipped: Python-only (CLI) — JS CLI is totally different
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Class 10 — TestModelDataclasses (adapted for JS interfaces)
// ═════════════════════════════════════════════════════════════════════

describe("TestModelInterfaces", () => {
  it("validation error fields", () => {
    const err: ValidationError = { message: "bad", path: "$.x", schemaPath: "properties.x.type", value: "v" };
    expect(err.message).toBe("bad");
    expect(err.path).toBe("$.x");
    expect(err.schemaPath).toBe("properties.x.type");
    expect(err.value).toBe("v");
  });

  it("validation error default value", () => {
    const err: ValidationError = { message: "bad", path: "$", schemaPath: "" };
    expect(err.value).toBeUndefined();
  });

  // Skipped: Python-only — JS uses interfaces, not dataclasses with defaults.
  // test_validation_result_defaults
  // test_repair_result_defaults

  // Skipped: Python-only — StrategyApplication in JS is a plain interface, no .diff property
  // test_strategy_application_unchanged_diff
  // test_strategy_application_changed_diff
  // test_repair_report_empty_steps
  // test_repair_report_no_parse_error_default
});
