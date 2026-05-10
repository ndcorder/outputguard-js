/**
 * Test multi-strategy combinations and interactions.
 *
 * Verifies that multiple repair strategies work correctly together,
 * that strategy ordering produces correct results, and that custom
 * strategy selection behaves as expected.
 */

import { describe, it, expect } from "vitest";
import { repair, validateAndRepair } from "../src/index.js";
import { OutputGuard } from "../src/guard.js";

// ---------------------------------------------------------------------------
// TestTwoStrategyCombinations
// ---------------------------------------------------------------------------

describe("TestTwoStrategyCombinations", () => {
  const cases: Array<{ id: string; text: string }> = [
    // fences + commas
    { id: "fences+commas", text: '```json\n{"a": 1,}\n```' },
    // fences + quotes
    { id: "fences+quotes", text: "```json\n{'a': 'b'}\n```" },
    // fences + keys
    { id: "fences+keys", text: "```json\n{a: 1}\n```" },
    // fences + booleans
    { id: "fences+booleans", text: '```json\n{"a": True}\n```' },
    // fences + closers
    { id: "fences+closers", text: '```json\n{"a": 1\n```' },
    // fences + values
    { id: "fences+values", text: '```json\n{"a": NaN}\n```' },
    // fences + comments
    { id: "fences+comments", text: '```json\n{"a": 1 // comment\n}\n```' },
    // fences + newlines
    { id: "fences+newlines", text: '```json\n{"a": "line1\nline2"}\n```' },
    // fences + unicode
    { id: "fences+unicode", text: '```json\n{"a": "caf\\u00e9"}\n```' },
    // fences + ellipsis
    { id: "fences+ellipsis", text: '```json\n{"a": [...]}\n```' },
    // extract + quotes
    { id: "extract+quotes", text: "Here: {'a': 'b'} done" },
    // extract + keys
    { id: "extract+keys", text: 'Output: {key: "val"} end' },
    // extract + booleans
    { id: "extract+booleans", text: 'Result: {"a": True} end' },
    // extract + commas
    { id: "extract+commas", text: 'Result: {"a": 1,} end' },
    // extract + values
    { id: "extract+values", text: 'Output: {"x": NaN} end' },
    // comments + commas
    { id: "comments+commas", text: '{"a": 1, // x\n"b": 2,}' },
    // comments + keys
    { id: "comments+keys", text: "{key: 1 // comment\n}" },
    // comments + quotes
    { id: "comments+quotes", text: "{'a': 1 // comment\n}" },
    // comments + booleans
    { id: "comments+booleans", text: '{"a": True // flag\n}' },
    // comments + values
    { id: "comments+values", text: '{"a": NaN // not a number\n}' },
    // quotes + keys
    { id: "quotes+keys", text: "{key: 'val'}" },
    // quotes + booleans
    { id: "quotes+booleans", text: "{'a': True, 'b': False}" },
    // quotes + commas
    { id: "quotes+commas", text: "{'a': 1, 'b': 2,}" },
    // keys + commas
    { id: "keys+commas", text: '{key: "val", other: 2,}' },
    // keys + booleans
    { id: "keys+booleans", text: "{active: True, deleted: False}" },
    // keys + values
    { id: "keys+values", text: "{score: NaN, count: Infinity}" },
    // values + closers
    { id: "values+closers", text: '{"a": NaN, "b": [1, 2' },
    // booleans + commas
    { id: "booleans+commas", text: '{"a": True, "b": False,}' },
    // booleans + closers
    { id: "booleans+closers", text: '{"a": True, "b": [1' },
    // commas + closers
    { id: "commas+closers", text: '{"a": 1, "b": 2,' },
    // truncated + commas
    { id: "truncated+commas", text: '{"a": [1, 2,' },
    // newlines + quotes
    { id: "newlines+quotes", text: "{'msg': 'hello\\nworld'}" },
  ];

  cases.forEach(({ id, text }) => {
    it(id, () => {
      const result = repair(text);
      expect(result.repaired).toBe(true);
      const parsed = JSON.parse(result.text);
      expect(typeof parsed).toBe("object");
    });
  });
});

// ---------------------------------------------------------------------------
// TestThreeStrategyCombinations
// ---------------------------------------------------------------------------

describe("TestThreeStrategyCombinations", () => {
  const cases: Array<{ id: string; text: string }> = [
    // fences + quotes + commas
    { id: "fences+quotes+commas", text: "```json\n{'a': 1, 'b': 2,}\n```" },
    // fences + keys + booleans
    { id: "fences+keys+booleans", text: '```json\n{active: True, name: "test"}\n```' },
    // fences + comments + commas
    { id: "fences+comments+commas", text: '```json\n{"a": 1, // note\n"b": 2,}\n```' },
    // fences + keys + commas
    { id: "fences+keys+commas", text: '```json\n{key: "val", other: 2,}\n```' },
    // fences + quotes + booleans
    { id: "fences+quotes+booleans", text: "```json\n{'active': True, 'name': 'test'}\n```" },
    // fences + values + commas
    { id: "fences+values+commas", text: '```json\n{"a": NaN, "b": 2,}\n```' },
    // fences + keys + values
    { id: "fences+keys+values", text: "```json\n{score: NaN, active: True}\n```" },
    // extract + quotes + keys
    { id: "extract+quotes+keys", text: "Result: {key: 'val', other: 'data'} end" },
    // extract + keys + booleans
    { id: "extract+keys+booleans", text: "Output: {active: True, deleted: False} done" },
    // extract + quotes + commas
    { id: "extract+quotes+commas", text: "Here: {'a': 1, 'b': 2,} done" },
    // comments + quotes + commas
    { id: "comments+quotes+commas", text: "{'a': 1, // note\n'b': 2,}" },
    // comments + keys + values
    { id: "comments+keys+values", text: "{key: NaN // not real\n}" },
    // comments + keys + commas
    { id: "comments+keys+commas", text: "{key: 1, // x\nother: 2,}" },
    // quotes + keys + commas
    { id: "quotes+keys+commas", text: "{key: 'val', other: 'data',}" },
    // quotes + keys + booleans
    { id: "quotes+keys+booleans", text: "{active: True, name: 'test'}" },
    // keys + booleans + commas
    { id: "keys+booleans+commas", text: "{active: True, deleted: False,}" },
    // keys + values + commas
    { id: "keys+values+commas", text: "{score: NaN, count: Infinity,}" },
    // fences + comments + keys
    { id: "fences+comments+keys", text: "```json\n{key: 1 // comment\n}\n```" },
    // extract + comments + commas
    { id: "extract+comments+commas", text: 'Result: {"a": 1, // x\n"b": 2,} done' },
    // booleans + values + commas
    { id: "booleans+values+commas", text: '{"active": True, "score": NaN,}' },
    // fences + quotes + keys + booleans (four!)
    { id: "fences+quotes+keys+booleans", text: "```json\n{active: True, name: 'test'}\n```" },
    // fences + keys + commas + values (four!)
    { id: "fences+keys+commas+values", text: "```json\n{score: NaN, count: Infinity,}\n```" },
    // fences + quotes + keys + booleans + commas (five!)
    {
      id: "fences+quotes+keys+booleans+commas",
      text: "```json\n{name: 'Alice', active: True, age: 30,}\n```",
    },
  ];

  cases.forEach(({ id, text }) => {
    it(id, () => {
      const result = repair(text);
      expect(result.repaired).toBe(true);
      const parsed = JSON.parse(result.text);
      expect(typeof parsed).toBe("object");
    });
  });
});

// ---------------------------------------------------------------------------
// TestKitchenSink
// ---------------------------------------------------------------------------

describe("TestKitchenSink", () => {
  const cases: Array<{ id: string; text: string }> = [
    {
      id: "llm_full_mess",
      text: "Sure!\n```json\n{name: 'Alice', age: 30, active: True,}\n```\nDone!",
    },
    {
      id: "js_object_full",
      text: "Result: {key: 'val', score: NaN, // note\n active: True,}",
    },
    {
      id: "fences+python+truncated",
      text: "```json\n{'name': 'Bob', 'items': [1, 2,",
    },
    {
      id: "fences+keys+vals+bools+commas",
      text: '```json\n{name: "Test", val: NaN, active: True, count: 5,}\n```',
    },
    {
      id: "extract_everything",
      text: "Output: {name: 'Test', active: True, score: NaN} end",
    },
    {
      id: "deep_nesting",
      text: "```json\n{user: {name: 'Alice', prefs: {dark: True,}}}\n```",
    },
    {
      id: "array_mixed",
      text: "```json\n[{name: 'Alice', active: True,}, {name: 'Bob', active: False,}]\n```",
    },
    {
      id: "commentary_array_fenced",
      text: "Here is the data:\n```json\n{items: [{id: 1, name: 'first',}, {id: 2, name: 'second',}],}\n```\nThat's all.",
    },
    {
      id: "keys_quotes_comments_commas",
      text: "{name: 'Test', // user name\nage: 30, // years\nactive: True,}",
    },
    {
      id: "fences_comments_keys_bools_commas",
      text: '```json\n{enabled: True, // flag\nname: "cfg",}\n```',
    },
    {
      id: "extract_quotes_bools_commas",
      text: "The answer is: {'valid': True, 'count': 42,}. That's it.",
    },
    {
      id: "max_strategies",
      text: "```json\n{users: [{name: 'Alice', active: True,}, {name: 'Bob', active: False,}], total: NaN,}\n```",
    },
  ];

  cases.forEach(({ id, text }) => {
    it(id, () => {
      const result = repair(text);
      expect(result.repaired).toBe(true);
      const data = JSON.parse(result.text);
      expect(typeof data).toBe("object");
    });
  });
});

// ---------------------------------------------------------------------------
// TestStrategyOrdering
// ---------------------------------------------------------------------------

describe("TestStrategyOrdering", () => {
  it("fences before extract", () => {
    const text = '```json\n{"a": 1}\n```\nSome {other} text';
    const result = repair(text);
    expect(JSON.parse(result.text)).toEqual({ a: 1 });
  });

  it("comments before commas", () => {
    const text = '{"a": 1, // comment\n}';
    const result = repair(text);
    expect(JSON.parse(result.text)).toEqual({ a: 1 });
  });

  it("quotes before keys", () => {
    const text = "{'key': 'val'}";
    const result = repair(text);
    expect(JSON.parse(result.text)).toEqual({ key: "val" });
  });

  it("fences then quotes then commas", () => {
    const text = "```json\n{'a': 1, 'b': 2,}\n```";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data).toEqual({ a: 1, b: 2 });
  });

  it("fences then keys then booleans", () => {
    const text = '```json\n{active: True, name: "test"}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.active).toBe(true);
    expect(data.name).toBe("test");
  });

  it("comments then keys then values", () => {
    const text = "{score: NaN // not real\n}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect("score" in data).toBe(true);
  });

  it("extract then quotes", () => {
    const text = "The result is {'answer': 42} and that's all.";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.answer).toBe(42);
  });

  it("extract then keys then booleans", () => {
    const text = "Output: {active: True, count: 5} end";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.active).toBe(true);
  });

  it("fences then comments then commas", () => {
    const text = '```json\n{"a": 1, // note\n"b": 2,}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data).toEqual({ a: 1, b: 2 });
  });

  it("fences then extract priority", () => {
    const text = '```json\n{"x": 1}\n```';
    const result = repair(text);
    expect(JSON.parse(result.text)).toEqual({ x: 1 });
  });

  it("closers after all content fixes", () => {
    const text = '{"a": True, "b": NaN, "c": [1, 2';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect("a" in data).toBe(true);
  });

  it("booleans independent of commas", () => {
    const text = '{"a": True, "b": False, "c": None,}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.a).toBe(true);
    expect(data.b).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TestCustomStrategySelection
// ---------------------------------------------------------------------------

describe("TestCustomStrategySelection", () => {
  it("subset strategies fixes targeted", () => {
    const guard = new OutputGuard({ strategies: ["strip_fences"] });
    const result = guard.repair('```json\n{"a": 1}\n```');
    expect(result.repaired).toBe(true);
    expect(JSON.parse(result.text)).toEqual({ a: 1 });
  });

  it("subset strategies skips others", () => {
    const guard = new OutputGuard({ strategies: ["strip_fences"] });
    const result = guard.repair("{'a': 1}");
    expect(result.repaired).toBe(false);
  });

  it("single strategy fix commas", () => {
    const guard = new OutputGuard({ strategies: ["fix_commas"] });
    const result = guard.repair('{"a": 1,}');
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toEqual(["fix_commas"]);
  });

  it("single strategy fix booleans", () => {
    const guard = new OutputGuard({ strategies: ["fix_booleans"] });
    const result = guard.repair('{"a": True}');
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toEqual(["fix_booleans"]);
  });

  it("single strategy fix keys", () => {
    const guard = new OutputGuard({ strategies: ["fix_keys"] });
    const result = guard.repair('{key: "val"}');
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toEqual(["fix_keys"]);
  });

  it("single strategy fix quotes", () => {
    const guard = new OutputGuard({ strategies: ["fix_quotes"] });
    const result = guard.repair("{'a': 'b'}");
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied).toEqual(["fix_quotes"]);
  });

  it("empty strategy list", () => {
    const guard = new OutputGuard({ strategies: [] });
    const result = guard.repair('```json\n{"a": 1}\n```');
    expect(result.repaired).toBe(false);
  });

  it("two strategies only", () => {
    const guard = new OutputGuard({ strategies: ["strip_fences", "fix_commas"] });
    const result = guard.repair('```json\n{"a": 1,}\n```');
    expect(result.repaired).toBe(true);
    expect(JSON.parse(result.text)).toEqual({ a: 1 });
  });

  it("two strategies missing needed", () => {
    const guard = new OutputGuard({ strategies: ["strip_fences", "fix_commas"] });
    const result = guard.repair("```json\n{'a': 1,}\n```");
    expect(result.repaired).toBe(false);
  });

  it("all strategies explicit", () => {
    const allNames = [
      "strip_fences",
      "extract_json",
      "remove_comments",
      "fix_commas",
      "fix_quotes",
      "fix_keys",
      "fix_values",
      "fix_booleans",
      "fix_truncated",
      "fix_ellipsis",
      "fix_unicode",
      "fix_inner_quotes",
      "fix_closers",
      "fix_newlines",
    ];
    const guard = new OutputGuard({ strategies: allNames });
    const text = "```json\n{name: 'Alice', active: True,}\n```";
    const result = guard.repair(text);
    expect(result.repaired).toBe(true);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
  });
});

// ---------------------------------------------------------------------------
// TestRepairIdempotency
// ---------------------------------------------------------------------------

describe("TestRepairIdempotency", () => {
  const brokenInputs: Array<{ id: string; text: string }> = [
    { id: "fenced", text: '```json\n{"a": 1}\n```' },
    { id: "single_quotes", text: "{'key': 'value'}" },
    { id: "keys+values+commas", text: '{key: "value", other: NaN,}' },
    {
      id: "commentary+keys+quotes+bools",
      text: "Sure!\n{name: 'Test', active: True}\nDone",
    },
    { id: "comments+commas", text: '{"a": 1, // comment\n"b": 2,}' },
    { id: "truncated_array", text: '{"a": [1, 2' },
    {
      id: "fenced_kitchen_sink",
      text: "```json\n{name: 'Alice', age: 30, active: True,}\n```",
    },
    { id: "python_bools", text: '{"a": True, "b": False}' },
    { id: "keys+nan_value", text: "{x: NaN}" },
    { id: "undefined_value", text: '{"a": undefined}' },
    {
      id: "fenced_trailing_comma_array",
      text: '```json\n{"items": [1, 2, 3,]}\n```',
    },
    { id: "extract+keys+quotes", text: "Output: {name: 'test'} done" },
    { id: "keys+comments", text: '{key: "val", // comment\n}' },
    { id: "keys+bools+commas", text: "{active: True, deleted: False,}" },
    {
      id: "fenced+quotes+bools+commas",
      text: "```json\n{'enabled': True, 'name': 'cfg',}\n```",
    },
  ];

  brokenInputs.forEach(({ id, text }) => {
    it(`repair then repair is noop: ${id}`, () => {
      const first = repair(text);
      expect(first.repaired).toBe(true);
      const second = repair(first.text);
      expect(second.repaired).toBe(false);
      expect(second.text).toBe(first.text);
    });
  });
});

// ---------------------------------------------------------------------------
// TestSchemaValidationWithRepair
// ---------------------------------------------------------------------------

describe("TestSchemaValidationWithRepair", () => {
  const schemas: Record<string, Record<string, unknown>> = {
    user: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
      },
      required: ["name", "age"],
    },
    scores: {
      type: "object",
      properties: {
        values: { type: "array", items: { type: "number" } },
      },
      required: ["values"],
    },
    config: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        name: { type: "string" },
      },
      required: ["enabled", "name"],
    },
    tags: {
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["tags"],
    },
  };

  const schemaCases: Array<{ id: string; text: string; schemaName: string }> = [
    {
      id: "fenced+quotes+commas->user",
      text: "```json\n{'name': 'Alice', 'age': 30,}\n```",
      schemaName: "user",
    },
    {
      id: "keys+quotes->user",
      text: "{name: 'Bob', age: 25}",
      schemaName: "user",
    },
    {
      id: "quotes+commas->scores",
      text: "{'values': [1.0, 2.5, 3.0,]}",
      schemaName: "scores",
    },
    {
      id: "extract+quotes+bools->config",
      text: "Sure: {'enabled': True, 'name': 'test'}\nDone",
      schemaName: "config",
    },
    {
      id: "fenced+keys+comments->user",
      text: '```json\n{name: "Test", age: 1, // a person\n}\n```',
      schemaName: "user",
    },
    {
      id: "keys+bools+commas->config",
      text: '{enabled: True, name: "production",}',
      schemaName: "config",
    },
    {
      id: "extract+keys+quotes->user",
      text: "Output: {name: 'Charlie', age: 35} end",
      schemaName: "user",
    },
    {
      id: "quotes+commas->tags",
      text: "{'tags': ['a', 'b', 'c',]}",
      schemaName: "tags",
    },
    {
      id: "fenced+commas->scores",
      text: '```json\n{"values": [1, 2, 3,]}\n```',
      schemaName: "scores",
    },
    {
      id: "keys+bools+quotes+comments->config",
      text: "{enabled: True, name: 'dev', // config\n}",
      schemaName: "config",
    },
    {
      id: "fenced+quotes+commas->tags",
      text: "```json\n{'tags': ['x', 'y',]}\n```",
      schemaName: "tags",
    },
  ];

  schemaCases.forEach(({ id, text, schemaName }) => {
    it(id, () => {
      const result = validateAndRepair(text, schemas[schemaName]);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(typeof result.data).toBe("object");
    });
  });
});
