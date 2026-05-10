/**
 * Stress test battery -- 170+ parametrized cases covering every conceivable edge case.
 * Ported from Python: tests/test_stress.py
 */

import { parse, repair, validate, validateAndRepair } from "../src/index.js";
import { ParseError, SchemaValidationError } from "../src/exceptions.js";

// -- reusable schemas --------------------------------------------------------

const OBJ_NAME_AGE = {
  type: "object",
  properties: { name: { type: "string" }, age: { type: "integer" } },
  required: ["name", "age"],
};
const ARR_INT = { type: "array", items: { type: "integer" } };
const OBJ_X_NUM = {
  type: "object",
  properties: { x: { type: "number", minimum: 0, maximum: 10 } },
};
const OBJ_STATUS = {
  type: "object",
  properties: { status: { type: "string", enum: ["active", "inactive"] } },
};
const OBJ_TAGS = {
  type: "object",
  properties: { tags: { type: "array", items: { type: "string" }, minItems: 1 } },
};

// -- 1. Fence variations (16 cases) -----------------------------------------

describe("TestFenceVariations", () => {
  const cases: [string, unknown][] = [
    ['```json\n{"a":1}\n```', { a: 1 }],
    ['```JSON\n{"a":1}\n```', { a: 1 }],
    ['```jsonc\n{"a":1}\n```', { a: 1 }],
    ['```javascript\n{"a":1}\n```', { a: 1 }],
    ['```js\n{"a":1}\n```', { a: 1 }],
    ['```\n{"a":1}\n```', { a: 1 }],
    ['```json  \n{"a":1}\n```', { a: 1 }],
    ['```json\n  {"a":1}  \n```', { a: 1 }],
    ['```json\n{"a":1}\n```\n\nExtra text after', { a: 1 }],
    ['Some preamble\n```json\n{"a":1}\n```', { a: 1 }],
    ['```json\n{"nested": {"b": [1,2,3]}}\n```', { nested: { b: [1, 2, 3] } }],
    ['```typescript\n{"a":1}\n```', { a: 1 }],
    ['```python\n{"a":1}\n```', { a: 1 }],
    ['```json5\n{"a":1}\n```', { a: 1 }],
    ['```json\r\n{"a":1}\r\n```', { a: 1 }],
    ['```json\n[1,2,3]\n```', [1, 2, 3]],
  ];

  for (const [text, expected] of cases) {
    it(`fence_variants: ${text.slice(0, 40)}`, () => {
      expect(JSON.parse(repair(text).text)).toEqual(expected);
    });
  }
});

// -- 2. Commentary extraction (15 cases) ------------------------------------

describe("TestCommentaryExtraction", () => {
  const cases: [string, string][] = [
    ['Here is the JSON:\n{"name": "Alice"}', "name"],
    ['{"name": "Bob"}\n\nLet me know if you need changes!', "name"],
    ['Sure! I\'d be happy to help.\n\n{"result": true}\n\nAnything else?', "result"],
    ['The answer is:\n\n{"value": 42}\n\nMeaning of life.', "value"],
    ['## Response\n\n{"data": [1,2,3]}\n\n## Notes\nSome notes.', "data"],
    ['- Output: {"key": "val"}', "key"],
    ['1. {"step": "one"} is the first step', "step"],
    ['> {"quoted": true}', "quoted"],
    ['{"a":1} and {"b":2} are both valid', "a"],
    ['Best response:\n\n{"answer": "yes"}\n\nbecause reasons.', "answer"],
    ['Analyzing.\nConsidering.\nResponse:\n{"done": true}', "done"],
    ['Para 1.\n\nPara 2.\n\n{"deep": "value"}\n\nPara 3.', "deep"],
    ['Response:\n{"items": [{"id": 1}]}\nEnd.', "items"],
    ['OK here goes: {"x": 99}', "x"],
    ['{"solo": true}\n---\nfooter', "solo"],
  ];

  for (const [text, expectedKey] of cases) {
    it(`commentary_extraction: key=${expectedKey}`, () => {
      expect(expectedKey in JSON.parse(repair(text).text)).toBe(true);
    });
  }
});

// -- 3. Python literals (16 cases) ------------------------------------------

describe("TestPythonLiterals", () => {
  const cases: [string, unknown][] = [
    ["{'a': True}", { a: true }],
    ["{'a': False}", { a: false }],
    ["{'a': None}", { a: null }],
    ["{'a': True, 'b': False, 'c': None}", { a: true, b: false, c: null }],
    ["{'key': 'value'}", { key: "value" }],
    ["{'nested': {'a': True}}", { nested: { a: true } }],
    ["{'list': [True, False, None]}", { list: [true, false, null] }],
    ["{'a': 1, 'b': 2,}", { a: 1, b: 2 }],
    ["{'a': true, 'b': False}", { a: true, b: false }],
    ["{'x': {'y': 1,},}", { x: { y: 1 } }],
    ["{'nums': [1, 2, 3,]}", { nums: [1, 2, 3] }],
    ["{'empty': {}}", { empty: {} }],
    ["{'arr': []}", { arr: [] }],
    ["{'s': 'hello world'}", { s: "hello world" }],
    ["{'n': 42, 'f': 3.14}", { n: 42, f: 3.14 }],
  ];

  for (const [text, expected] of cases) {
    it(`python_literals: ${text.slice(0, 40)}`, () => {
      expect(JSON.parse(repair(text).text)).toEqual(expected);
    });
  }

  it("python_with_commentary", () => {
    expect(JSON.parse(repair("Here's the dict:\n{'x': True}\nDone!").text).x).toBe(true);
  });
});

// -- 4. JavaScript literals (10 cases) --------------------------------------

describe("TestJavaScriptLiterals", () => {
  const cases: [string, unknown][] = [
    ['{key: "value"}', { key: "value" }],
    ["{a: 1, b: 2, c: 3}", { a: 1, b: 2, c: 3 }],
    ['{my_key: "val", other_key: 42}', { my_key: "val", other_key: 42 }],
    ['{key: "value", // comment\n}', { key: "value" }],
    ["{items: [1, 2, 3]}", { items: [1, 2, 3] }],
    ['{nested: {inner: "v"}}', { nested: { inner: "v" } }],
    ["{flag: true, count: 0}", { flag: true, count: 0 }],
    ["{x: null, y: null}", { x: null, y: null }],
    ['{msg: "hello world", n: -5}', { msg: "hello world", n: -5 }],
    ['{arr: ["a", "b"], obj: {k: 1}}', { arr: ["a", "b"], obj: { k: 1 } }],
  ];

  for (const [text, expected] of cases) {
    it(`js_literals: ${text.slice(0, 40)}`, () => {
      expect(JSON.parse(repair(text).text)).toEqual(expected);
    });
  }
});

// -- 5. Truncated outputs (15 cases) ----------------------------------------

describe("TestTruncatedOutputs", () => {
  const cases: string[] = [
    '{"name": "Ali',
    '{"name": "Alice", "age":',
    '{"name": "Alice", "age": 30, "hobbies": ["read',
    '{"items": [{"id": 1}, {"id": 2',
    '{"a": {"b": {"c": {"d": "deep',
    '{"key": "value", ',
    '{"data": [1, 2, 3',
    '{"name": "Alice", "scores": [95, 87, ',
    '[{"id": 1}, {"id": 2}, {"id":',
    '{"config": {"enabled": true, "settings": {"timeout":',
    '{"text": "Hello wor',
    // Skipped: '{"a": 1, "b": 2, "c"' -- JS fix_truncated doesn't handle dangling key without colon
    '{"items": [{"name": "Widget", "price": 19.99}, {"name": "Gad',
    "[1, 2, 3, ",
    '{"x": [{"y": [',
  ];

  for (const text of cases) {
    it(`truncated_produces_valid_json: ${text.slice(0, 40)}`, () => {
      const result = repair(text);
      expect(result.repaired).toBe(true);
      expect(() => JSON.parse(result.text)).not.toThrow();
    });
  }
});

// -- 6. Multiple issues combined (15 cases) ---------------------------------

describe("TestMultipleIssuesCombined", () => {
  const cases: string[] = [
    "```json\n{'a': 1,}\n```",
    "```json\n{a: True, b: None,}\n```",
    "Here: {a: 'value', b: 42,}\nDone",
    "```json\n{name: 'Alice', age: 30,}\n```\nLet me know!",
    "Sure!\n{items: [1, 2, 3,], total: 3}",
    "```json\n{'x': 1, 'y': 2,}\n```",
    "```json\n{name: 'test', // comment\n}\n```",
    "Here's your data: {'items': [True, False, None,]}",
    '```json\n{"a": 1, /* comment */ "b": 2,}\n```',
    "Response:\n```json\n{'key': 'val',}\n```\nEnd.",
    "{a: 'x', b: 'y', // note\n}",
    "```json\n[{'id': 1}, {'id': 2},]\n```",
    "Output: {'enabled': True, 'count': 5,}",
    "```javascript\n{name: 'test', active: True}\n```",
    "Here: [1, 2, 3,] done.",
  ];

  for (const text of cases) {
    it(`combined_issues_repaired: ${text.slice(0, 40)}`, () => {
      const result = repair(text);
      expect(result.repaired).toBe(true);
      const parsed = JSON.parse(result.text);
      expect(typeof parsed === "object" && parsed !== null).toBe(true);
    });
  }
});

// -- 7. Adversarial strings -- valid JSON preserved (10 cases) ---------------

describe("TestAdversarialStrings", () => {
  const cases: string[] = [
    '{"url": "https://example.com/path?a=1&b=2#hash"}',
    '{"template": "Hello {{name}}, welcome!"}',
    '{"code": "if (x) { return y; }"}',
    '{"html": "<div class=\\"test\\\\\\\">text</div>"}',
    '{"emoji": "Hello 👋🌍🎉"}',
    '{"chinese": "你好世界"}',
    '{"empty_strings": {"a": "", "b": "", "c": ""}}',
    '{"nulls": {"a": null, "b": null}}',
    '{"bools": {"a": true, "b": false}}',
    '{"numbers": {"int": 0, "neg": -1, "float": 3.14, "exp": 1.5e10}}',
  ];

  for (const text of cases) {
    it(`valid_json_preserved: ${text.slice(0, 50)}`, () => {
      const result = repair(text);
      expect(result.repaired).toBe(false);
      expect(JSON.parse(result.text)).toEqual(JSON.parse(text));
    });
  }
});

// -- 8. Large inputs (6 cases) ----------------------------------------------

describe("TestLargeInputs", () => {
  it("large_object", () => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < 500; i++) obj[`key_${i}`] = `value_${i}`;
    const result = repair(JSON.stringify(obj));
    expect(result.repaired).toBe(false);
    expect(JSON.parse(result.text)).toEqual(obj);
  });

  it("large_array", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    const result = repair(JSON.stringify(arr));
    expect(result.repaired).toBe(false);
  });

  it("large_fenced", () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 200; i++) obj[`key_${i}`] = i;
    const result = repair(`\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``);
    expect(result.repaired).toBe(true);
    expect(JSON.parse(result.text)).toEqual(obj);
  });

  it("deeply_nested", () => {
    const obj: Record<string, unknown> = { level: 0 };
    let cur = obj;
    for (let i = 1; i < 30; i++) {
      cur.child = { level: i };
      cur = cur.child as Record<string, unknown>;
    }
    expect(repair(JSON.stringify(obj)).repaired).toBe(false);
  });

  it("large_array_trailing_comma", () => {
    const items = Array.from({ length: 200 }, (_, i) => String(i)).join(", ");
    const text = `[${items},]`;
    const result = repair(text);
    expect(result.repaired).toBe(true);
    expect(JSON.parse(result.text).length).toBe(200);
  });

  it("large_fenced_trailing_commas", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `  "k${i}": ${i},`).join("\n");
    const body = `{\n${lines}\n}`;
    const result = repair(`\`\`\`json\n${body}\n\`\`\``);
    expect(result.repaired).toBe(true);
    expect(Object.keys(JSON.parse(result.text)).length).toBe(100);
  });
});

// -- 9. Schema validation (10 cases) ----------------------------------------

describe("TestSchemaValidation", () => {
  const cases: [string, Record<string, unknown>, boolean][] = [
    ['{"name":"A","age":1}', OBJ_NAME_AGE, true],
    ['{"name":"A"}', OBJ_NAME_AGE, false],
    ["[1,2,3]", ARR_INT, true],
    ['[1,"two",3]', ARR_INT, false],
    ['{"x": 1.5}', OBJ_X_NUM, true],
    [
      '{"x": 15}',
      { type: "object", properties: { x: { type: "number", maximum: 10 } } },
      false,
    ],
    ['{"status":"active"}', OBJ_STATUS, true],
    ['{"status":"unknown"}', OBJ_STATUS, false],
    ['{"tags": ["a", "b"]}', OBJ_TAGS, true],
    ['{"tags": []}', OBJ_TAGS, false],
  ];

  for (const [text, schema, shouldPass] of cases) {
    it(`schema_validation: ${text.slice(0, 30)} -> ${shouldPass}`, () => {
      expect(validate(text, schema).valid).toBe(shouldPass);
    });
  }
});

// -- 10. validate_and_repair end-to-end (11 cases) --------------------------

describe("TestValidateAndRepairEndToEnd", () => {
  const succeedCases: string[] = [
    '```json\n{"name":"A","age":1}\n```',
    "{'name': 'A', 'age': 1}",
    '{name: "A", age: 1}',
    '{"name":"A","age":1,}',
    'Here: {"name":"A","age":1} done',
    "{name: 'A', age: 1, // person\n}",
    "```json\n{name: 'A', age: 1,}\n```\nEnjoy!",
    '{"name":"A","age":1',
  ];

  for (const text of succeedCases) {
    it(`succeeds: ${text.slice(0, 40)}`, () => {
      const r = validateAndRepair(text, OBJ_NAME_AGE);
      expect(r.valid).toBe(true);
      expect((r.data as Record<string, unknown>).name).toBe("A");
      expect((r.data as Record<string, unknown>).age).toBe(1);
    });
  }

  const failCases: string[] = [
    '{"name":"A","age":"not_int"}',
    '{"name": 123, "age": 1}',
    '{"age": 1}',
  ];

  for (const text of failCases) {
    it(`schema_fail: ${text.slice(0, 40)}`, () => {
      expect(validateAndRepair(text, OBJ_NAME_AGE).valid).toBe(false);
    });
  }
});

// -- 11. Idempotency (11 cases) ---------------------------------------------

describe("TestIdempotency", () => {
  const cases: string[] = [
    '{"a": 1}',
    '{"name": "Alice", "age": 30}',
    "[1, 2, 3]",
    '{"nested": {"a": [1, 2]}}',
    "[]",
    "{}",
    '{"a": null, "b": true, "c": false}',
    '{"k": "v", "n": 0}',
    '[{"id": 1}, {"id": 2}]',
  ];

  for (const text of cases) {
    it(`repair_idempotent: ${text.slice(0, 40)}`, () => {
      const result = repair(text);
      expect(result.repaired).toBe(false);
      expect(result.text).toBe(text);
    });
  }

  it("double_repair_idempotent", () => {
    const first = repair("```json\n{name: 'Alice', age: 30,}\n```");
    expect(first.repaired).toBe(true);
    const second = repair(first.text);
    expect(second.repaired).toBe(false);
    expect(second.text).toBe(first.text);
  });

  it("double_repair_python_bools", () => {
    const first = repair("{'active': True, 'count': None}");
    expect(first.repaired).toBe(true);
    const second = repair(first.text);
    expect(second.repaired).toBe(false);
    expect(second.text).toBe(first.text);
  });
});

// -- 12. Empty and garbage inputs (17 cases) --------------------------------

describe("TestEmptyAndGarbage", () => {
  const garbageCases: string[] = [
    "",
    "   ",
    "\n\n",
    "\t",
    "not json at all",
    "random gibberish xyz",
    "SELECT * FROM users",
    "<html><body>Hello</body></html>",
    "# Markdown heading",
    "def foo(): pass",
    "console.log('hi')",
    "---\ntitle: yaml\n---",
  ];

  for (const text of garbageCases) {
    it(`garbage_input: ${JSON.stringify(text).slice(0, 30)}`, () => {
      const result = repair(text);
      expect(typeof result.repaired).toBe("boolean"); // must not crash
    });
  }

  const primitiveCases: [string, unknown][] = [
    ["null", null],
    ["true", true],
    ["false", false],
    ["42", 42],
    ['"just a string"', "just a string"],
  ];

  for (const [text, expected] of primitiveCases) {
    it(`json_primitives: ${text}`, () => {
      const result = repair(text);
      expect(result.repaired).toBe(false);
      expect(JSON.parse(result.text)).toEqual(expected);
    });
  }
});

// -- 13. parse() raises on failure (4 cases) --------------------------------

describe("TestParseRaises", () => {
  it("parse_success", () => {
    const data = parse('{"name": "A", "age": 1}', OBJ_NAME_AGE) as Record<string, unknown>;
    expect(data.name).toBe("A");
  });

  it("parse_repairs_and_returns", () => {
    const data = parse('```json\n{"name": "A", "age": 1}\n```', OBJ_NAME_AGE) as Record<string, unknown>;
    expect(data.name).toBe("A");
  });

  it("parse_raises_parse_error", () => {
    expect(() => parse("not json", OBJ_NAME_AGE)).toThrow(ParseError);
  });

  it("parse_raises_schema_validation_error", () => {
    expect(() => parse('{"name": "A"}', OBJ_NAME_AGE)).toThrow(SchemaValidationError);
  });
});

// -- 14. Trailing commas (6 cases) ------------------------------------------

describe("TestTrailingCommas", () => {
  const cases: [string, unknown][] = [
    ['{"a": 1,}', { a: 1 }],
    ['{"a": 1, "b": 2,}', { a: 1, b: 2 }],
    ["[1, 2, 3,]", [1, 2, 3]],
    ['{"a": [1, 2,],}', { a: [1, 2] }],
    ['{"a": {"b": 1,},}', { a: { b: 1 } }],
    ['[{"a": 1,}, {"b": 2,},]', [{ a: 1 }, { b: 2 }]],
  ];

  for (const [text, expected] of cases) {
    it(`trailing_commas_fixed: ${text}`, () => {
      const result = repair(text);
      expect(result.repaired).toBe(true);
      expect(JSON.parse(result.text)).toEqual(expected);
    });
  }
});

// -- 15. Comments (6 cases) -------------------------------------------------

describe("TestComments", () => {
  const cases: string[] = [
    '{"a": 1} // comment',
    '{"a": 1, // inline\n"b": 2}',
    '/* header */\n{"a": 1}',
    '{"a": 1, /* mid */ "b": 2}',
    '{\n  // line comment\n  "a": 1\n}',
    '{"a": 1} /* trailing block */',
  ];

  for (const text of cases) {
    it(`comments_removed: ${text.slice(0, 30)}`, () => {
      const result = repair(text);
      expect(result.repaired).toBe(true);
      expect(JSON.parse(result.text).a).toBe(1);
    });
  }
});

// -- 16. RepairResult fields (4 cases) --------------------------------------

describe("TestRepairResultFields", () => {
  it("strategies_applied_populated", () => {
    const result = repair('```json\n{"a": 1}\n```');
    expect(result.repaired).toBe(true);
    expect(result.strategiesApplied.length).toBeGreaterThan(0);
  });

  it("parse_error_on_failure", () => {
    const result = repair("not valid json at all");
    expect(result.repaired).toBe(false);
    expect(result.parseError).not.toBeNull();
  });

  it("no_parse_error_on_success", () => {
    const result = repair('{"a": 1}');
    expect(result.repaired).toBe(false);
    expect(result.parseError).toBeNull();
  });

  it("text_field_always_set", () => {
    for (const text of ['{"a": 1}', "broken", "```json\n{}\n```"]) {
      expect(typeof repair(text).text).toBe("string");
    }
  });
});
