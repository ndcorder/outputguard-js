/**
 * Adversarial, fuzzing, and boundary tests for outputguard.
 *
 * Ensures outputguard NEVER crashes, NEVER hangs, and handles every
 * conceivable pathological input gracefully.
 */

import { describe, it, expect } from "vitest";
import { parse, repair, validateAndRepair } from "../src/index.js";
import { repair as rawRepair } from "../src/repairer.js";
import { ALL_STRATEGIES } from "../src/strategies/index.js";

// ---------------------------------------------------------------------------
// Shared chaotic inputs
// ---------------------------------------------------------------------------

const PRINTABLE =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ \t\n\r\x0b\x0c";

// bytes(range(256)).decode("latin-1") equivalent
const LATIN1_BYTES = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i)).join("");

const CHAOTIC_INPUTS: string[] = [
  "",
  " ",
  "\x00",
  "\x00".repeat(100),
  "}".repeat(1000),
  "{".repeat(1000),
  "[".repeat(500) + "]".repeat(500),
  '"'.repeat(100),
  "'".repeat(100),
  "\\",
  "\\".repeat(100),
  "\n".repeat(100),
  "\r\n".repeat(100),
  "\t".repeat(100),
  "null",
  "true",
  "false",
  "undefined",
  "NaN",
  "Infinity",
  "-Infinity",
  "None",
  "True",
  "False",
  "...".repeat(50),
  "```json```",
  "```\n```",
  "```json\n\n```",
  '{"key": ' + '"value",'.repeat(500) + '"last": 1}',
  '{"a": "' + "x".repeat(100_000) + '"}',
  "{" + '"k":1,'.repeat(1000) + '"z":1}',
  "[" + "1,".repeat(5000) + "1]",
  "/* " + "x".repeat(10_000) + " */",
  "//" + "x".repeat(10_000),
  '{"url": "' + "https://x.com/".repeat(200) + '"}',
  "```json\n" + '{"a":1}\n'.repeat(100) + "```",
  '{"a": "\\u0000\\u0001\\u0002"}',
  '{"emoji": "' + "😀".repeat(1000) + '"}',
  // Deeply nested
  "{".repeat(100) + '"a":1' + "}".repeat(100),
  "[".repeat(100) + "1" + "]".repeat(100),
  // Mismatched brackets
  "{[{[{[{[",
  "]}}]}]",
  '{"a": [}',
  '{"a": ]}',
  // Every ASCII printable char
  PRINTABLE,
  // Binary-ish
  LATIN1_BYTES,
];

// ---------------------------------------------------------------------------
// Class 1: TestNeverCrashes (30+ cases via parametrize)
// ---------------------------------------------------------------------------

describe("TestNeverCrashes", () => {
  describe("repair never crashes", () => {
    CHAOTIC_INPUTS.forEach((chaotic_input, i) => {
      it(`chaotic input ${i}`, () => {
        const result = repair(chaotic_input);
        expect(typeof result.repaired).toBe("boolean");
        expect(typeof result.text).toBe("string");
      });
    });
  });

  describe("raw repair never crashes", () => {
    CHAOTIC_INPUTS.forEach((chaotic_input, i) => {
      it(`chaotic input ${i}`, () => {
        const result = rawRepair(chaotic_input, undefined);
        expect(typeof result.repaired).toBe("boolean");
        expect(typeof result.text).toBe("string");
      });
    });
  });

  describe("strategies never crash", () => {
    CHAOTIC_INPUTS.forEach((chaotic_input, i) => {
      it(`chaotic input ${i}`, () => {
        for (const { name, apply } of ALL_STRATEGIES) {
          const result = apply(chaotic_input);
          expect(typeof result).toBe("string");
        }
      });
    });
  });

  it("repair with report never crashes", () => {
    for (const chaotic_input of CHAOTIC_INPUTS) {
      const resultTuple = rawRepair(chaotic_input, undefined, { report: true });
      expect(resultTuple).toBeDefined();
      expect(resultTuple.result).toBeDefined();
      expect(resultTuple.report).toBeDefined();
    }
  });

  it("validateAndRepair never crashes", () => {
    const schema = { type: "object" };
    for (const chaotic_input of CHAOTIC_INPUTS.slice(0, 20)) {
      const result = validateAndRepair(chaotic_input, schema);
      expect(typeof result.valid).toBe("boolean");
    }
  });

  it("random bytes never crash", () => {
    // Seeded-ish random using simple LCG
    let seed = 42;
    const nextRand = (max: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % max;
    };
    for (let i = 0; i < 30; i++) {
      const length = nextRand(500) + 1;
      const chars = Array.from({ length }, () => String.fromCharCode(nextRand(256)));
      const text = chars.join("");
      const result = repair(text);
      expect(typeof result.text).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// Class 2: TestPerformance (10+ cases)
// ---------------------------------------------------------------------------

describe("TestPerformance", () => {
  it("large input performance", () => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < 10_000; i++) {
      obj[`key_${i}`] = `value_${i}`;
    }
    const text = JSON.stringify(obj);
    const start = performance.now();
    const result = repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5.0);
    expect(result.repaired).toBe(false);
  }, 10000);

  it("deeply nested performance", () => {
    const text = '{"a": '.repeat(50) + "1" + "}".repeat(50);
    const start = performance.now();
    repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(2.0);
  }, 5000);

  it("many strategies needed performance", () => {
    const text = "```json\n{name: 'test', val: NaN, active: True, items: [1, 2,],}\n```";
    const start = performance.now();
    const result = repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(1.0);
    expect(result.repaired).toBe(true);
  });

  it("large fenced performance", () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      obj[`k${i}`] = i;
    }
    const text = "```json\n" + JSON.stringify(obj) + "\n```";
    const start = performance.now();
    const result = repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5.0);
    expect(result.repaired).toBe(true);
  }, 10000);

  it("long string with newlines performance", () => {
    const text = '{"text": "' + "line\\n".repeat(10_000) + '"}';
    const start = performance.now();
    repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5.0);
  }, 10000);

  it("many trailing commas performance", () => {
    const pairs = Array.from({ length: 2000 }, (_, i) => `"k${i}": ${i}`).join(",");
    const text = "{" + pairs + ",}";
    const start = performance.now();
    repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(3.0);
  }, 5000);

  it("large array performance", () => {
    const text = "[" + Array.from({ length: 10_000 }, (_, i) => String(i)).join(",") + "]";
    const start = performance.now();
    const result = repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5.0);
    expect(result.repaired).toBe(false);
  }, 10000);

  it("many single quote keys performance", () => {
    const pairs = Array.from({ length: 500 }, (_, i) => `'k${i}': ${i}`).join(", ");
    const text = "{" + pairs + "}";
    const start = performance.now();
    repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(3.0);
  }, 5000);

  it("repeated validateAndRepair performance", () => {
    const schema = { type: "object", properties: { x: { type: "integer" } } };
    const text = '{"x": 1}';
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      validateAndRepair(text, schema);
    }
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5.0);
  }, 10000);

  it("broken brackets performance", () => {
    const text = "{[".repeat(200) + "]}".repeat(200);
    const start = performance.now();
    repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5.0);
  }, 10000);

  it("comments heavy performance", () => {
    const lines: string[] = [];
    for (let i = 0; i < 5000; i++) {
      lines.push(`// comment ${i}`);
    }
    lines.splice(2500, 0, '{"a": 1}');
    const text = lines.join("\n");
    const start = performance.now();
    repair(text);
    const elapsed = (performance.now() - start) / 1000;
    expect(elapsed).toBeLessThan(5.0);
  }, 10000);
});

// ---------------------------------------------------------------------------
// Class 3: TestBoundaryConditions (20+ cases)
// ---------------------------------------------------------------------------

describe("TestBoundaryConditions", () => {
  const singleChars = [
    "{", "}", "[", "]", '"', "'", ",", ":", "\\", "/",
    ".", "!", "?", "#", "@", " ", "\n", "\t", "\r", "\0",
  ];
  describe("single char", () => {
    singleChars.forEach((char) => {
      it(`char ${JSON.stringify(char)}`, () => {
        const result = repair(char);
        expect(typeof result.text).toBe("string");
      });
    });
  });

  const minimalValid = ["0", "1", "-1", "0.5", '""', "null", "true", "false", "{}", "[]", '"x"'];
  describe("minimal valid JSON", () => {
    minimalValid.forEach((minimal) => {
      it(`minimal: ${minimal}`, () => {
        const result = repair(minimal);
        expect(result.repaired).toBe(false);
        JSON.parse(result.text); // must not throw
      });
    });
  });

  const almostValid = [
    '{"a": }',
    '{"a": 1, }',
    '{"a" 1}',
    "{: 1}",
    '{"a": 1',
    "[1, 2,]",
    "[,]",
    "{,}",
    '{"a": 1,,}',
  ];
  describe("almost valid", () => {
    almostValid.forEach((input) => {
      it(`almost: ${input}`, () => {
        const result = repair(input);
        expect(typeof result.text).toBe("string");
      });
    });
  });

  const unicodeInputs = [
    '{"a": "café"}',
    '{"a": "你好"}',
    '{"a": "مرحبا"}',
    '{"a": "🎉🎊🎈"}',
    '{"a": "\\ud83d\\ude00"}',
    '{"a": "\\u0000"}',
    '{"a": "Ω≈ç√∫"}',
    '{"a": "→←↑↓"}',
    '{"a": "\\n\\t\\r"}',
  ];
  describe("unicode preserved", () => {
    unicodeInputs.forEach((input) => {
      it(`unicode: ${input.slice(0, 30)}`, () => {
        const result = repair(input);
        expect(result.repaired).toBe(false);
        JSON.parse(result.text); // must not throw
      });
    });
  });

  it("empty object with whitespace", () => {
    const result = repair("{   }");
    expect(result.repaired).toBe(false);
  });

  it("empty array with whitespace", () => {
    const result = repair("[   ]");
    expect(result.repaired).toBe(false);
  });

  it("only whitespace between brackets", () => {
    const result = repair("{  \n\t  }");
    expect(result.repaired).toBe(false);
  });

  it("max int", () => {
    const text = `{"big": ${2 ** 53}}`;
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("negative max int", () => {
    const text = `{"neg": ${-(2 ** 53)}}`;
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("float precision", () => {
    const text = '{"pi": 3.141592653589793238462643383279}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Class 4: TestNoDataLoss (15+ cases)
// ---------------------------------------------------------------------------

describe("TestNoDataLoss", () => {
  const fencedData = [
    { name: "Alice", age: 30 },
    { list: [1, 2, 3, 4, 5] },
    { nested: { a: { b: { c: 1 } } } },
    { special: "hello\nworld\ttab" },
    { unicode: "café ☕ 你好" },
    { empty: "", null: null, bool: true },
    { numbers: [0, -1, 1.5, 1e10, -3.14] },
    { mixed: [1, "two", true, null, { five: 5 }] },
  ];
  describe("fenced data preserved", () => {
    fencedData.forEach((original, i) => {
      it(`case ${i}`, () => {
        const text = "```json\n" + JSON.stringify(original) + "\n```";
        const result = repair(text);
        expect(result.repaired).toBe(true);
        expect(JSON.parse(result.text)).toEqual(original);
      });
    });
  });

  const commentaryData = [
    { name: "Alice", age: 30 },
    { items: [1, 2, 3] },
    { nested: { a: 1 } },
  ];
  describe("commentary data preserved", () => {
    commentaryData.forEach((original, i) => {
      it(`case ${i}`, () => {
        const text = "Here is the result:\n" + JSON.stringify(original) + "\nHope this helps!";
        const result = repair(text);
        expect(JSON.parse(result.text)).toEqual(original);
      });
    });
  });

  it("trailing comma data preserved", () => {
    const result = repair('{"name": "Alice", "age": 30, "city": "NYC",}');
    const data = JSON.parse(result.text);
    expect(data).toEqual({ name: "Alice", age: 30, city: "NYC" });
  });

  it("single quotes data preserved", () => {
    const result = repair("{'name': 'Alice', 'scores': [95, 87, 92]}");
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
    expect(data.scores).toEqual([95, 87, 92]);
  });

  it("python booleans data preserved", () => {
    const result = repair('{"active": True, "deleted": False, "val": None}');
    const data = JSON.parse(result.text);
    expect(data.active).toBe(true);
    expect(data.deleted).toBe(false);
    expect(data.val).toBe(null);
  });

  it("unquoted keys data preserved", () => {
    const result = repair('{name: "Alice", age: 30}');
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
    expect(data.age).toBe(30);
  });

  it("NaN replaced data preserved", () => {
    const result = repair('{"a": 1, "b": NaN, "c": 3}');
    const data = JSON.parse(result.text);
    expect(data.a).toBe(1);
    expect(data.c).toBe(3);
  });

  it("large nested preserved", () => {
    const original = { level1: { level2: { level3: { data: [1, 2, 3] } } } };
    const text = "```json\n" + JSON.stringify(original) + "\n```";
    const result = repair(text);
    expect(JSON.parse(result.text)).toEqual(original);
  });

  it("array of objects preserved", () => {
    const original = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `item_${i}` }));
    const text = "```json\n" + JSON.stringify(original) + "\n```";
    const result = repair(text);
    expect(JSON.parse(result.text)).toEqual(original);
  });

  it("empty structures preserved", () => {
    const original = { empty_obj: {}, empty_arr: [], empty_str: "" };
    const text = "```json\n" + JSON.stringify(original) + "\n```";
    const result = repair(text);
    expect(JSON.parse(result.text)).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// Class 5: TestConcurrentSafety (5+ cases — run sequentially in JS)
// ---------------------------------------------------------------------------

describe("TestConcurrentSafety", () => {
  it("concurrent repairs via Promise.all", async () => {
    const inputs = Array.from({ length: 20 }, () => [
      '```json\n{"a": 1}\n```',
      "{'b': 2}",
      "{c: 3, d: NaN,}",
      'Sure: {"e": True}\nDone',
      '{"f": [1, 2,]}',
    ]).flat(); // 100 repairs

    const results = await Promise.all(inputs.map((text) => Promise.resolve(repair(text))));
    expect(results.every((r) => typeof r.text === "string")).toBe(true);
    expect(results.every((r) => r.repaired)).toBe(true);
  });

  it("concurrent validates via Promise.all", async () => {
    const schema = {
      type: "object",
      properties: { x: { type: "integer" } },
      required: ["x"],
    };
    const inputs = [
      ...Array(50).fill('{"x": 1}'),
      ...Array(50).fill('```json\n{"x": 2}\n```'),
    ];

    const results = await Promise.all(
      inputs.map((text) => Promise.resolve(validateAndRepair(text, schema))),
    );
    expect(results.every((r) => r.valid)).toBe(true);
  });

  it("concurrent different strategies", async () => {
    const inputs = Array.from({ length: 10 }, () => [
      '{"a": True}',
      "{'b': 2}",
      "{c: 3}",
      '{"d": 1,}',
      '{"e": 1,}',
    ]).flat();

    const results = await Promise.all(inputs.map((text) => Promise.resolve(repair(text))));
    expect(results.every((r) => typeof r.text === "string")).toBe(true);
    expect(results.every((r) => r.repaired)).toBe(true);
  });

  it("concurrent raw repair", async () => {
    const inputs = Array(50).fill('{"x": 1,}');
    const results = await Promise.all(
      inputs.map((text: string) => Promise.resolve(rawRepair(text, undefined))),
    );
    expect(results.every((r) => r.repaired)).toBe(true);
  });

  it("concurrent parse", async () => {
    const schema = { type: "object", properties: { a: { type: "integer" } } };
    const inputs = Array(50).fill('{"a": 1}');
    const results = await Promise.all(
      inputs.map((text: string) => Promise.resolve(parse(text, schema))),
    );
    expect(results.every((r) => (r as Record<string, unknown>).a === 1)).toBe(true);
  });

  it("concurrent mixed valid invalid", async () => {
    const valid = Array(25).fill('{"a": 1}');
    const invalid = Array(25).fill("}}}}");
    const inputs = [...valid, ...invalid];
    // Simple shuffle with seed
    for (let i = inputs.length - 1; i > 0; i--) {
      const j = (i * 42) % (i + 1);
      [inputs[i], inputs[j]] = [inputs[j], inputs[i]];
    }

    const results = await Promise.all(inputs.map((text) => Promise.resolve(repair(text))));
    expect(results.every((r) => typeof r.text === "string")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Class 6: TestSpecialPatterns (15+ cases)
// ---------------------------------------------------------------------------

describe("TestSpecialPatterns", () => {
  it("json inside json string", () => {
    const text = '{"data": "{\\"inner\\": 1}", "meta": "ok"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    const data = JSON.parse(result.text);
    expect(data.meta).toBe("ok");
  });

  it("base64 in string", () => {
    const text = '{"encoded": "SGVsbG8gV29ybGQ="}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("very long key", () => {
    const key = "a".repeat(1000);
    const text = `{"${key}": 1}`;
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("empty array values", () => {
    const text = '{"a": [], "b": {}, "c": ""}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("scientific notation", () => {
    const text = '{"val": 1.23e-4, "big": 9.99E+15}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    const data = JSON.parse(result.text);
    expect(data.val).toBe(1.23e-4);
  });

  it("negative zero", () => {
    const text = '{"val": -0}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("json with BOM", () => {
    const text = '﻿{"a": 1}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data).toEqual({ a: 1 });
  });

  it("windows line endings", () => {
    const text = '{"a": 1,\r\n"b": 2\r\n}';
    const result = repair(text);
    expect(!result.repaired || JSON.parse(result.text)).toBeTruthy();
    if (result.repaired) {
      expect(JSON.parse(result.text)).toEqual({ a: 1, b: 2 });
    }
  });

  it("tab indented json", () => {
    const text = '{\n\t"a": 1,\n\t"b": 2\n}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("mixed indentation", () => {
    const text = '{\n  "a": 1,\n\t"b": 2,\n    "c": 3\n}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("multiple json blocks", () => {
    const text = '{"a": 1}\n{"b": 2}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect("a" in data || "b" in data).toBe(true);
  });

  it("json preceded by html", () => {
    const text = '<div>Hello</div>\n{"a": 1}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data).toEqual({ a: 1 });
  });

  it("json with markdown bold", () => {
    const text = '**Here:**\n```json\n{"a": 1}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data).toEqual({ a: 1 });
  });

  it("string that looks like number", () => {
    const text = '{"phone": "555-1234", "zip": "01234"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    const data = JSON.parse(result.text);
    expect(data.zip).toBe("01234");
  });

  it("url with special chars", () => {
    const text = '{"url": "https://example.com/path?q=1&r=2#frag"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("multiline string value", () => {
    const text = '{"text": "line1\\nline2\\nline3"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("escaped backslashes", () => {
    const text = '{"path": "C:\\\\Users\\\\test"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("null values in array", () => {
    const text = '{"items": [null, null, null]}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("boolean string not converted", () => {
    const text = '{"flag": "true", "other": "false"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    const data = JSON.parse(result.text);
    expect(data.flag).toBe("true");
  });

  it("number as key in quotes", () => {
    const text = '{"123": "numeric key", "456": "another"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Class 7: TestFuzzingPatterns (additional coverage)
// ---------------------------------------------------------------------------

describe("TestFuzzingPatterns", () => {
  const repeatedPairs = ["{}", "[]", '""', "  ", ",,", "::", "//", "**", "``"];
  describe("repeated pairs", () => {
    repeatedPairs.forEach((pair) => {
      it(`pair: ${JSON.stringify(pair)}`, () => {
        const text = pair.repeat(500);
        const result = repair(text);
        expect(typeof result.text).toBe("string");
      });
    });
  });

  it("alternating brackets", () => {
    const text = "{[}]".repeat(200);
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("json with control chars", () => {
    const text = '{"a":\x01 1,\x02 "b":\x03 2}';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("only commas", () => {
    const result = repair(",,,,,,,,,");
    expect(typeof result.text).toBe("string");
  });

  it("only colons", () => {
    const result = repair("::::::::");
    expect(typeof result.text).toBe("string");
  });

  it("mixed quote styles", () => {
    const text = `{"a": 'b', 'c': "d", \`e\`: \`f\`}`;
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("triple quoted value", () => {
    const text = '{"a": """hello world"""}';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("javascript undefined", () => {
    const text = '{"a": undefined, "b": undefined}';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("multiple fenced blocks", () => {
    const text = '```json\n{"a": 1}\n```\n\nSome text\n\n```json\n{"b": 2}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(typeof data).toBe("object");
  });

  it("fenced block wrong language", () => {
    const text = '```python\n{"a": 1}\n```';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("incomplete fence", () => {
    const text = '```json\n{"a": 1}';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("fence with extra backticks", () => {
    const text = '````json\n{"a": 1}\n````';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  const bareTokens = ["NaN", "Infinity", "-Infinity", "undefined", "None", "True", "False"];
  describe("bare non-json tokens", () => {
    bareTokens.forEach((token) => {
      it(`token: ${token}`, () => {
        const text = `{"val": ${token}}`;
        const result = repair(text);
        expect(typeof result.text).toBe("string");
      });
    });
  });

  it("extremely long number", () => {
    const text = '{"n": ' + "9".repeat(1000) + "}";
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("all escape sequences", () => {
    const text = '{"esc": "\\" \\\\ \\/ \\b \\f \\n \\r \\t"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Class 8: TestRobustnessInvariants
// ---------------------------------------------------------------------------

describe("TestRobustnessInvariants", () => {
  it("repair is idempotent for valid json", () => {
    const validTexts = [
      '{"a": 1}',
      "[1, 2, 3]",
      '"hello"',
      "42",
      "true",
      "null",
      '{"nested": {"arr": [1, null, "x"]}}',
    ];
    for (const text of validTexts) {
      const result = repair(text);
      expect(result.repaired).toBe(false);
      expect(result.text).toBe(text);
    }
  });

  it("repair result always has text", () => {
    const inputs = ["", "garbage", '{"a": 1}', "{invalid", "```json\n{}\n```"];
    for (const text of inputs) {
      const result = repair(text);
      expect(result.text).not.toBeNull();
      expect(result.text).not.toBeUndefined();
    }
  });

  it("strategiesApplied is array", () => {
    for (const text of ["{}", '{"a": 1,}', "garbage"]) {
      const result = repair(text);
      expect(Array.isArray(result.strategiesApplied)).toBe(true);
    }
  });

  it("repaired false means unchanged or unfixable", () => {
    const originals = ['{"a": 1}', "completely broken garbage"];
    for (const text of originals) {
      const result = repair(text);
      if (!result.repaired) {
        expect(result.text).toBe(text);
      }
    }
  });

  it("repaired true means valid json", () => {
    const fixable = [
      '{"a": 1,}',
      "{'a': 1}",
      '```json\n{"a": 1}\n```',
      "{a: 1}",
      '{"a": True}',
    ];
    for (const text of fixable) {
      const result = repair(text);
      if (result.repaired) {
        JSON.parse(result.text); // must not throw
      }
    }
  });
});
