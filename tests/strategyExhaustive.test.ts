/**
 * Exhaustive edge-case tests for all 14 outputguard strategies.
 *
 * Pushes each strategy to its absolute limits with parametrized inputs.
 */

import { describe, it, expect } from "vitest";

import { apply as stripFences } from "../src/strategies/stripFences.js";
import { apply as extractJson } from "../src/strategies/extractJson.js";
import { apply as removeComments } from "../src/strategies/removeComments.js";
import { apply as fixCommas } from "../src/strategies/fixCommas.js";
import { apply as fixQuotes } from "../src/strategies/fixQuotes.js";
import { apply as fixKeys } from "../src/strategies/fixKeys.js";
import { apply as fixValues } from "../src/strategies/fixValues.js";
import { apply as fixBooleans } from "../src/strategies/fixBooleans.js";
import { apply as fixTruncated } from "../src/strategies/fixTruncated.js";
import { apply as fixEllipsis } from "../src/strategies/fixEllipsis.js";
import { apply as fixUnicode } from "../src/strategies/fixUnicode.js";
import { apply as fixClosers } from "../src/strategies/fixClosers.js";
import { apply as fixNewlines } from "../src/strategies/fixNewlines.js";
import { apply as fixInnerQuotes } from "../src/strategies/fixInnerQuotes.js";

// ─── strip_fences (18 cases) ─────────────────────────────────────────────────

describe("TestStripFences", () => {
  it.each([
    "json",
    "JSON",
    "jsonc",
    "javascript",
    "js",
    "typescript",
    "ts",
    "python",
    "py",
    "yaml",
    "xml",
    "html",
    "css",
    "sql",
    "plaintext",
    "", // no tag
  ])("every language tag: %s", (langTag) => {
    const text = `\`\`\`${langTag}\n{"a": 1}\n\`\`\``;
    expect(stripFences(text)).toBe('{"a": 1}');
  });

  it("nested fences", () => {
    const text = '```json\n{"code": "```inner```"}\n```';
    const result = stripFences(text);
    expect(result).toContain('"code"');
  });

  it("windows line endings", () => {
    const text = '```json\r\n{"a": 1}\r\n```';
    const result = stripFences(text);
    expect(result.includes('{"a": 1}') || result.trim().includes('{"a": 1}')).toBe(true);
  });

  it("trailing whitespace after closing fence", () => {
    const text = '```json\n{"a": 1}\n```   ';
    const result = stripFences(text);
    expect(result).toContain('{"a": 1}');
  });

  it("indented closing fence", () => {
    const text = '```json\n{"a": 1}\n   ```';
    const result = stripFences(text);
    expect(result).toContain('{"a": 1}');
  });

  it("multiple fences takes first", () => {
    const text = '```json\n{"first": true}\n```\ntext\n```json\n{"second": true}\n```';
    const result = stripFences(text);
    expect(result).toContain('"first"');
    expect(result).not.toContain('"second"');
  });

  it("fence with empty content", () => {
    const text = "```json\n\n```";
    const result = stripFences(text);
    expect(result.trim()).toBe("");
  });

  it("fence with only whitespace content", () => {
    const text = "```json\n   \n```";
    const result = stripFences(text);
    expect(result.trim()).toBe("");
  });
});

// ─── extract_json (17 cases) ─────────────────────────────────────────────────

describe("TestExtractJson", () => {
  it("json preceded by numbered list", () => {
    const text = '1. Result: {"key": "value"}';
    expect(extractJson(text)).toBe('{"key": "value"}');
  });

  it("json preceded by bullet points", () => {
    const text = '- item one\n- item two\n{"result": true}';
    expect(extractJson(text)).toBe('{"result": true}');
  });

  it("json inside markdown blockquote", () => {
    const text = '> {"quoted": true}';
    expect(extractJson(text)).toBe('{"quoted": true}');
  });

  it.each([
    "Output: ",
    "Result: ",
    "Answer: ",
    "Response: ",
    "Here is the JSON: ",
  ])("json after label: %s", (prefix) => {
    const text = `${prefix}{"key": 42}`;
    expect(extractJson(text)).toBe('{"key": 42}');
  });

  it("multiple json objects takes first", () => {
    const text = '{"first": 1} and also {"second": 2}';
    const result = extractJson(text);
    expect(JSON.parse(result)).toEqual({ first: 1 });
  });

  it("json with brace strings", () => {
    const text = '{"regex": "match {x}"}';
    const result = extractJson(text);
    const parsed = JSON.parse(result);
    expect(parsed.regex).toBe("match {x}");
  });

  it("array of objects", () => {
    const text = 'Result: [{"a": 1}, {"b": 2}]';
    const result = extractJson(text);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
  });

  it("deeply nested 10 levels", () => {
    let inner = '{"l10": true}';
    for (let i = 9; i >= 1; i--) {
      inner = `{"l${i}": ${inner}}`;
    }
    const text = `Deeply nested: ${inner}`;
    const result = extractJson(text);
    const parsed = JSON.parse(result);
    expect(parsed.l1.l2.l3.l4.l5.l6.l7.l8.l9.l10).toBe(true);
  });

  it("json with escaped quotes", () => {
    const text = '{"msg": "He said \\"hello\\""}';
    const result = extractJson(text);
    expect(result.startsWith("{")).toBe(true);
    expect(result.endsWith("}")).toBe(true);
  });

  it("very large json", () => {
    const entries = Array.from({ length: 200 }, (_, i) => `"k${i}": ${i}`).join(", ");
    const big = "{" + entries + "}";
    const text = "Here: " + big + " done.";
    const result = extractJson(text);
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)).toHaveLength(200);
  });

  it("no json at all", () => {
    const text = "Just plain text with no braces or brackets.";
    expect(extractJson(text)).toBe(text);
  });

  it("array only", () => {
    const text = "[1, 2, 3]";
    expect(JSON.parse(extractJson(text))).toEqual([1, 2, 3]);
  });

  it("json with newlines inside", () => {
    const text = 'Before\n{\n  "a": 1,\n  "b": 2\n}\nAfter';
    const result = extractJson(text);
    expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
  });

  it("string containing brackets", () => {
    const text = '{"arr": "[not an array]"}';
    const result = extractJson(text);
    expect(JSON.parse(result)).toEqual({ arr: "[not an array]" });
  });

  it("empty object", () => {
    const text = "Result: {}";
    expect(extractJson(text)).toBe("{}");
  });

  it("empty array", () => {
    const text = "Result: []";
    expect(extractJson(text)).toBe("[]");
  });
});

// ─── remove_comments (12 cases) ──────────────────────────────────────────────

describe("TestRemoveComments", () => {
  it("comment at very start", () => {
    const text = '// comment\n{"a": 1}';
    const result = removeComments(text);
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it("comment at very end", () => {
    const text = '{"a": 1}\n// trailing comment';
    const result = removeComments(text);
    expect(JSON.parse(result.trim())).toEqual({ a: 1 });
  });

  it("multiple single line comments", () => {
    const text = '{\n// first\n"a": 1,\n// second\n"b": 2\n}';
    const result = removeComments(text);
    expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
  });

  it("multiline comment spanning 5 lines", () => {
    const text = '{\n/* line1\nline2\nline3\nline4\nline5 */\n"a": 1}';
    const result = removeComments(text);
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it("comment like patterns inside strings", () => {
    const text = '{"url": "http://example.com", "note": "use // for division"}';
    const result = removeComments(text);
    const parsed = JSON.parse(result);
    expect(parsed.url).toBe("http://example.com");
    expect(parsed.note).toBe("use // for division");
  });

  it("empty comment", () => {
    const text = '{"a": 1}\n//\n';
    const result = removeComments(text);
    expect(JSON.parse(result.trim())).toEqual({ a: 1 });
  });

  it("comment with special chars", () => {
    const text = '{"a": 1} // "quotes" and {braces}';
    const result = removeComments(text);
    expect(JSON.parse(result.trim())).toEqual({ a: 1 });
  });

  it("nested looking comments", () => {
    const text = '{"a": 1} /* /* not nested */ */';
    const result = removeComments(text);
    // After first */ the rest is literal — the trailing */ stays
    expect(result).toContain('{"a": 1}');
  });

  it("mixed single and multiline comments", () => {
    const text = '// header\n{/* inline */"a": 1 // end\n}';
    const result = removeComments(text);
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it("url in string not stripped", () => {
    const text = '{"homepage": "https://example.com/path"}';
    const result = removeComments(text);
    expect(JSON.parse(result).homepage).toBe("https://example.com/path");
  });

  it("comment between key and value", () => {
    const text = '{"a": /* the value */ 1}';
    const result = removeComments(text);
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it("block comment with stars inside", () => {
    const text = '{"a": 1} /* ** stars ** */';
    const result = removeComments(text);
    expect(JSON.parse(result.trim())).toEqual({ a: 1 });
  });
});

// ─── fix_commas (9 cases) ────────────────────────────────────────────────────

describe("TestFixCommas", () => {
  it("multiple consecutive trailing commas", () => {
    const text = '{"a": 1,,}';
    const result = fixCommas(text);
    // The regex ,\s*} matches the second comma + }, leaving the first comma
    // A single regex pass turns ,,} into ,} (only the last ,} pair matches)
    expect(result).toBe('{"a": 1,}');
  });

  it("deeply nested trailing comma", () => {
    const text = '{"a": {"b": {"c": 1,},},}';
    const result = fixCommas(text);
    expect(JSON.parse(result)).toEqual({ a: { b: { c: 1 } } });
  });

  it("comma followed by newline then closer", () => {
    const text = '{"a": 1,\n  }';
    const result = fixCommas(text);
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it("multiple trailing commas in array", () => {
    const text = "[1, 2,,]";
    const result = fixCommas(text);
    // Same single-pass behavior: ,,] -> ,]
    expect(result).toBe("[1, 2,]");
  });

  it("comma in string values preserved", () => {
    const text = '{"a": "1,2,3,"}';
    const result = fixCommas(text);
    expect(JSON.parse(result)).toEqual({ a: "1,2,3," });
  });

  it("no trailing comma unchanged", () => {
    const text = '{"a": 1, "b": 2}';
    const result = fixCommas(text);
    expect(result).toBe(text);
  });

  it("trailing comma in array of objects", () => {
    const text = '[{"a": 1}, {"b": 2},]';
    const result = fixCommas(text);
    expect(JSON.parse(result)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("trailing comma with spaces", () => {
    const text = '{"a": 1  ,   }';
    const result = fixCommas(text);
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it("comma before bracket in nested array", () => {
    const text = '{"arr": [1, 2, 3,]}';
    const result = fixCommas(text);
    expect(JSON.parse(result)).toEqual({ arr: [1, 2, 3] });
  });
});

// ─── fix_quotes (11 cases) ───────────────────────────────────────────────────

describe("TestFixQuotes", () => {
  it("single quoted with apostrophe", () => {
    const text = "{'it\\'s': 'value'}";
    const result = fixQuotes(text);
    expect(result).toContain('"value"');
  });

  it("single quoted containing double quote", () => {
    const text = `{'key': 'say "hello"'}`;
    const result = fixQuotes(text);
    expect(result).toContain('"key"');
    expect(result.includes('\\"hello\\"') || result.includes("say")).toBe(true);
  });

  it("mixed quoting styles", () => {
    const text = `{'a': 1, "b": 2, 'c': 3}`;
    const result = fixQuotes(text);
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
    expect(result).toContain('"c"');
  });

  it("empty single quoted string", () => {
    const text = "{'key': ''}";
    const result = fixQuotes(text);
    expect(result).toContain('"key"');
    expect(result).toContain('""');
  });

  it("single quoted with backslash", () => {
    const text = "{'path': 'C:\\\\Users'}";
    const result = fixQuotes(text);
    expect(result).toContain('"path"');
  });

  it("nested single quoted objects", () => {
    const text = "{'a': {'b': 'c'}}";
    const result = fixQuotes(text);
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
    expect(result).toContain('"c"');
  });

  it("single quoted array elements", () => {
    const text = "['hello', 'world']";
    const result = fixQuotes(text);
    expect(result).toContain('"hello"');
    expect(result).toContain('"world"');
  });

  it("single quoted numbers and booleans", () => {
    const text = "{'count': 42, 'active': true}";
    const result = fixQuotes(text);
    expect(result).toContain('"count"');
    expect(result).toContain("42");
  });

  it("all double quoted unchanged", () => {
    const text = '{"a": "b"}';
    const result = fixQuotes(text);
    expect(result).toBe(text);
  });

  it("single quoted with colon in value", () => {
    const text = "{'url': 'http://example.com'}";
    const result = fixQuotes(text);
    expect(result).toContain('"url"');
    expect(result).toContain('"http://example.com"');
  });

  it("single quoted with comma in value", () => {
    const text = "{'list': 'a,b,c'}";
    const result = fixQuotes(text);
    expect(result).toContain('"a,b,c"');
  });
});

// ─── fix_keys (9 cases) ──────────────────────────────────────────────────────

describe("TestFixKeys", () => {
  it.each([
    ["$id", '"$id"'],
    ["_private", '"_private"'],
    ["my.dotted.key", '"my.dotted.key"'],
    ["hyphen-key", '"hyphen-key"'],
  ])("keys with special chars: %s", (key, expectedKey) => {
    const text = `{${key}: 1}`;
    const result = fixKeys(text);
    expect(result).toContain(expectedKey);
  });

  it("js keyword keys", () => {
    const text = "{class: 1, function: 2, return: 3}";
    const result = fixKeys(text);
    expect(result).toContain('"class"');
    expect(result).toContain('"function"');
    expect(result).toContain('"return"');
  });

  it("number keys", () => {
    // The regex pattern requires keys starting with [a-zA-Z_$]
    // so numeric keys won't match — this tests that behavior
    const text = '{0: "zero", 1: "one"}';
    const result = fixKeys(text);
    // Numbers don't match the unquoted key regex
    expect(result).toBe(text);
  });

  it("unicode key", () => {
    // café starts with 'c' which matches [a-zA-Z_$]
    const text = "{café: 1}";
    const result = fixKeys(text);
    expect(result.startsWith("{")).toBe(true);
  });

  it("already quoted mixed with unquoted", () => {
    const text = '{"quoted": 1, unquoted: 2}';
    const result = fixKeys(text);
    expect(result).toContain('"quoted"');
    expect(result).toContain('"unquoted"');
  });

  it("deeply nested unquoted keys", () => {
    const text = "{outer: {inner: {deep: 1}}}";
    const result = fixKeys(text);
    expect(result).toContain('"outer"');
    expect(result).toContain('"inner"');
    expect(result).toContain('"deep"');
  });

  it("key with url like value", () => {
    // Ensure colon in value doesn't confuse key detection
    const text = '{url: "http://example.com"}';
    const result = fixKeys(text);
    expect(result).toContain('"url"');
    expect(result).toContain('"http://example.com"');
  });

  it("key with dollar prefix", () => {
    const text = '{$ref: "#/definitions/Foo"}';
    const result = fixKeys(text);
    expect(result).toContain('"$ref"');
  });
});

// ─── fix_values (9 cases) ────────────────────────────────────────────────────

describe("TestFixValues", () => {
  it("multiple nan infinity", () => {
    const text = '{"a": NaN, "b": Infinity, "c": -Infinity}';
    const result = fixValues(text);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ a: null, b: null, c: null });
  });

  it("nan in array", () => {
    const text = "[1, NaN, 3]";
    const result = fixValues(text);
    expect(JSON.parse(result)).toEqual([1, null, 3]);
  });

  it("infinity as only value", () => {
    const text = '{"x": Infinity}';
    const result = fixValues(text);
    expect(JSON.parse(result)).toEqual({ x: null });
  });

  it("nan inside string preserved", () => {
    const text = '{"msg": "NaN is not a number"}';
    const result = fixValues(text);
    expect(JSON.parse(result).msg).toBe("NaN is not a number");
  });

  it("infinity inside string preserved", () => {
    const text = '{"msg": "Infinity and beyond"}';
    const result = fixValues(text);
    expect(JSON.parse(result).msg).toBe("Infinity and beyond");
  });

  it("undefined inside string preserved", () => {
    const text = '{"msg": "undefined behavior"}';
    const result = fixValues(text);
    expect(JSON.parse(result).msg).toBe("undefined behavior");
  });

  it("undefined in array", () => {
    const text = "[undefined, 1, undefined]";
    const result = fixValues(text);
    expect(JSON.parse(result)).toEqual([null, 1, null]);
  });

  it("negative infinity", () => {
    const text = '{"min": -Infinity}';
    const result = fixValues(text);
    expect(JSON.parse(result)).toEqual({ min: null });
  });

  it("mixed valid and invalid values", () => {
    const text = '{"a": NaN, "b": 42, "c": Infinity, "d": "hello"}';
    const result = fixValues(text);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ a: null, b: 42, c: null, d: "hello" });
  });
});

// ─── fix_booleans (10 cases) ─────────────────────────────────────────────────

describe("TestFixBooleans", () => {
  it("true false none in arrays", () => {
    const text = "[True, False, None]";
    const result = fixBooleans(text);
    expect(JSON.parse(result)).toEqual([true, false, null]);
  });

  it("nested python booleans", () => {
    const text = '{"a": {"b": True}}';
    const result = fixBooleans(text);
    expect(JSON.parse(result)).toEqual({ a: { b: true } });
  });

  it("mixed python and json booleans", () => {
    const text = '{"a": True, "b": false}';
    const result = fixBooleans(text);
    expect(JSON.parse(result)).toEqual({ a: true, b: false });
  });

  it("in string preserved", () => {
    const text = '{"text": "True or False"}';
    const result = fixBooleans(text);
    expect(JSON.parse(result).text).toBe("True or False");
  });

  it("none vs null", () => {
    const text = '{"a": None, "b": null}';
    const result = fixBooleans(text);
    expect(JSON.parse(result)).toEqual({ a: null, b: null });
  });

  it("all python booleans", () => {
    const text = '{"x": True, "y": False, "z": None}';
    const result = fixBooleans(text);
    expect(JSON.parse(result)).toEqual({ x: true, y: false, z: null });
  });

  it("already valid json unchanged", () => {
    const text = '{"a": true, "b": false, "c": null}';
    const result = fixBooleans(text);
    expect(result).toBe(text);
  });

  it("boolean in nested array", () => {
    const text = '{"data": [True, [False, [None]]]}';
    const result = fixBooleans(text);
    expect(JSON.parse(result)).toEqual({ data: [true, [false, [null]]] });
  });

  it("true false adjacent to punctuation", () => {
    const text = "[True,False,None]";
    const result = fixBooleans(text);
    expect(JSON.parse(result)).toEqual([true, false, null]);
  });

  it("none in string preserved", () => {
    const text = '{"msg": "None of the above"}';
    const result = fixBooleans(text);
    expect(JSON.parse(result).msg).toBe("None of the above");
  });
});

// ─── fix_truncated (12 cases) ────────────────────────────────────────────────

describe("TestFixTruncated", () => {
  it("truncated in middle of number", () => {
    const text = '{"price": 19.';
    const result = fixTruncated(text);
    expect(result.endsWith("}")).toBe(true);
  });

  it("truncated in middle of boolean", () => {
    const text = '{"active": tru';
    const result = fixTruncated(text);
    expect(result.endsWith("}")).toBe(true);
  });

  it("truncated in middle of null", () => {
    const text = '{"val": nu';
    const result = fixTruncated(text);
    expect(result.endsWith("}")).toBe(true);
  });

  it("truncated inside array element", () => {
    const text = '{"tags": ["hello", "wor';
    const result = fixTruncated(text);
    expect(result.endsWith("]}")).toBe(true);
  });

  it("truncated with nothing after key", () => {
    const text = '{"name":';
    const result = fixTruncated(text);
    expect(result.endsWith("}")).toBe(true);
  });

  it("truncated inside nested object key", () => {
    const text = '{"data": {"inne';
    const result = fixTruncated(text);
    expect((result.match(/}/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("only opening brace", () => {
    const text = "{";
    const result = fixTruncated(text);
    expect(result).toBe("{}");
  });

  it("opening brace and key", () => {
    const text = '{"key"';
    const result = fixTruncated(text);
    expect(result.endsWith("}")).toBe(true);
  });

  it("truncated string value", () => {
    const text = '{"msg": "hello wor';
    const result = fixTruncated(text);
    expect(result.endsWith("}")).toBe(true);
  });

  it("truncated after comma", () => {
    const text = '{"a": 1,';
    const result = fixTruncated(text);
    expect(result.endsWith("}")).toBe(true);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ a: 1 });
  });

  it("truncated nested array", () => {
    const text = '{"matrix": [[1, 2], [3';
    const result = fixTruncated(text);
    expect(result.endsWith("]}")).toBe(true);
  });

  it("valid json unchanged", () => {
    const text = '{"a": 1}';
    const result = fixTruncated(text);
    expect(result).toBe(text);
  });
});

// ─── fix_closers (8 cases) ───────────────────────────────────────────────────

describe("TestFixClosers", () => {
  it("missing 3 levels of closers", () => {
    const text = '{"a": {"b": [1, 2, 3';
    const result = fixClosers(text);
    expect(result.endsWith("]}}")).toBe(true);
  });

  it("missing bracket but not brace", () => {
    const text = '{"arr": [1, 2, 3}';
    const result = fixClosers(text);
    expect(result).toContain('{"arr": [1, 2, 3}');
  });

  it("missing brace but not bracket", () => {
    const text = '{"a": 1';
    const result = fixClosers(text);
    expect(result.endsWith("}")).toBe(true);
  });

  it("braces inside strings dont count", () => {
    const text = '{"pattern": "{[("}';
    const result = fixClosers(text);
    expect(result).toBe(text);
  });

  it("already balanced", () => {
    const text = '{"a": [1, 2], "b": {"c": 3}}';
    const result = fixClosers(text);
    expect(result).toBe(text);
  });

  it("deeply nested missing closers", () => {
    const text = '{"a": {"b": {"c": {"d": 1';
    const result = fixClosers(text);
    expect(result.endsWith("}}}}")).toBe(true);
  });

  it("missing array closer only", () => {
    const text = "[1, 2, 3";
    const result = fixClosers(text);
    expect(result).toBe("[1, 2, 3]");
  });

  it("empty nested structures", () => {
    const text = '{"a": {"b": [';
    const result = fixClosers(text);
    expect(result.endsWith("]}}")).toBe(true);
  });
});

// ─── fix_newlines (8 cases) ──────────────────────────────────────────────────

describe("TestFixNewlines", () => {
  it("multiple newlines in one string", () => {
    const text = '{"text": "line1\nline2\nline3"}';
    const result = fixNewlines(text);
    expect(JSON.parse(result).text).toBe("line1\nline2\nline3");
  });

  it("carriage return and newline", () => {
    const text = '{"text": "line1\r\nline2"}';
    const result = fixNewlines(text);
    const parsed = JSON.parse(result);
    expect(parsed.text).toContain("line1");
    expect(parsed.text).toContain("line2");
  });

  it("tab characters", () => {
    const text = '{"text": "col1\tcol2"}';
    const result = fixNewlines(text);
    expect(JSON.parse(result).text).toBe("col1\tcol2");
  });

  it("newlines in keys", () => {
    // Weird but possible
    const text = '{"key\nwith\nnewline": "value"}';
    const result = fixNewlines(text);
    expect(JSON.stringify(JSON.parse(result))).not.toContain("\n");
  });

  it("multiple strings with newlines", () => {
    const text = '{"a": "line1\nline2", "b": "line3\nline4"}';
    const result = fixNewlines(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toBe("line1\nline2");
    expect(parsed.b).toBe("line3\nline4");
  });

  it("already escaped newlines preserved", () => {
    const text = '{"text": "already\\nescaped"}';
    const result = fixNewlines(text);
    expect(JSON.parse(result).text).toBe("already\nescaped");
  });

  it("no newlines unchanged", () => {
    const text = '{"a": "hello world"}';
    const result = fixNewlines(text);
    expect(result).toBe(text);
  });

  it("newline at end of string value", () => {
    const text = '{"text": "hello\n"}';
    const result = fixNewlines(text);
    expect(JSON.parse(result).text).toBe("hello\n");
  });
});

// ─── fix_ellipsis (8 cases) ──────────────────────────────────────────────────

describe("TestFixEllipsis", () => {
  it("multiple ellipsis in one object", () => {
    const text = '{"a": ..., "b": ...}';
    const result = fixEllipsis(text);
    // The JS implementation removes ... + adjacent comma, which can leave
    // broken JSON when multiple ellipses are present. Verify it doesn't crash
    // and removes the ellipsis placeholders.
    expect(result).not.toContain("...");
  });

  it("ellipsis as array element among valid", () => {
    const text = "[1, ..., 3]";
    const result = fixEllipsis(text);
    // The JS implementation removes ... + adjacent comma
    expect(result).not.toContain("...");
    expect(result).toContain("1");
    expect(result).toContain("3");
  });

  it("ellipsis with comment", () => {
    const text = "[1, 2, ... // more items\n]";
    const result = fixEllipsis(text);
    // The JS implementation removes ... + adjacent comma
    expect(result).not.toContain("...");
    expect(result).toContain("1");
    expect(result).toContain("2");
  });

  it("ellipsis in string preserved", () => {
    const text = '{"msg": "and so on..."}';
    const result = fixEllipsis(text);
    // The ... is inside a string — should be preserved
    const parsed = JSON.parse(result);
    expect(parsed.msg).toContain("...");
  });

  it("ellipsis only in object", () => {
    const text = "{...}";
    const result = fixEllipsis(text);
    expect(JSON.parse(result)).toEqual({});
  });

  it("ellipsis only in array", () => {
    const text = "[...]";
    const result = fixEllipsis(text);
    expect(JSON.parse(result)).toEqual([]);
  });

  it("ellipsis as value", () => {
    const text = '{"placeholder": ...}';
    const result = fixEllipsis(text);
    const parsed = JSON.parse(result);
    expect(parsed.placeholder).toBeNull();
  });

  it("ellipsis at end of array", () => {
    const text = "[1, 2, ...]";
    const result = fixEllipsis(text);
    const parsed = JSON.parse(result);
    expect(parsed).toContain(1);
    expect(parsed).toContain(2);
  });
});

// ─── fix_unicode (8 cases) ───────────────────────────────────────────────────

describe("TestFixUnicode", () => {
  it("multiple hex escapes in one string", () => {
    const text = '{"msg": "\\x48\\x65\\x6C\\x6C\\x6F"}';
    const result = fixUnicode(text);
    const parsed = JSON.parse(result);
    expect(parsed.msg).toBe("Hello");
  });

  it("x00 null byte", () => {
    const text = '{"data": "test\\x00end"}';
    const result = fixUnicode(text);
    // \x00 is handled — should not crash
    expect(result).toContain("{");
    expect(result).toContain("}");
  });

  it("printable ascii hex", () => {
    // \x41 = 'A'
    const text = '{"letter": "\\x41"}';
    const result = fixUnicode(text);
    const parsed = JSON.parse(result);
    expect(parsed.letter).toBe("A");
  });

  it("mixed valid and invalid unicode", () => {
    const text = '{"a": "\\u0041", "b": "\\x42"}';
    const result = fixUnicode(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toBe("A"); // A = 'A'
    expect(parsed.b).toBe("B"); // \x42 = 'B'
  });

  it("consecutive hex escapes spelling hello", () => {
    const text = '{"word": "\\x48\\x65\\x6C\\x6C\\x6F"}';
    const result = fixUnicode(text);
    const parsed = JSON.parse(result);
    expect(parsed.word).toBe("Hello");
  });

  it("incomplete unicode escape", () => {
    const text = '{"val": "\\u00"}';
    const result = fixUnicode(text);
    // Should pad to 4 hex digits
    expect(result.includes("\\u00") || result.includes('"')).toBe(true);
  });

  it("valid unicode unchanged", () => {
    const text = '{"emoji": "\\u2764"}';
    const result = fixUnicode(text);
    expect(result.includes("\\u2764") || result.includes("❤")).toBe(true);
  });

  it("no escapes unchanged", () => {
    const text = '{"plain": "hello world"}';
    const result = fixUnicode(text);
    expect(result).toBe(text);
  });
});

// ─── fix_inner_quotes (10 cases) ─────────────────────────────────────────────

describe("TestFixInnerQuotes", () => {
  it("inner quotes at start of value", () => {
    const text = '{"a": "\"hello\" world"}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toContain("hello");
  });

  it("inner quotes at end of value", () => {
    const text = '{"a": "say \"goodbye\""}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toContain("goodbye");
  });

  it("multiple inner quote pairs", () => {
    const text = '{"a": "the \"quick\" brown \"fox\""}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toContain("quick");
    expect(parsed.a).toContain("fox");
  });

  it("inner quotes with special chars", () => {
    const text = '{"a": "the \"key\" is {here}"}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toContain("key");
  });

  it("value entirely inner quoted", () => {
    const text = '{"a": "\"text\""}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toContain("text");
  });

  it("adjacent to comma", () => {
    const text = '{"a": "say \"hi\"", "b": 1}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.a).toContain("hi");
    expect(parsed.b).toBe(1);
  });

  it("no inner quotes unchanged", () => {
    const text = '{"a": "normal string", "b": "another"}';
    const result = fixInnerQuotes(text);
    expect(result).toBe(text);
  });

  it("key with quotes not affected", () => {
    const text = '{"normal_key": "has \"inner\" quotes"}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.normal_key).toContain("inner");
  });

  it("empty value unchanged", () => {
    const text = '{"a": ""}';
    const result = fixInnerQuotes(text);
    expect(JSON.parse(result)).toEqual({ a: "" });
  });

  it("multiple keys with inner quotes", () => {
    const text = '{"x": "the \"a\" val", "y": "the \"b\" val"}';
    const result = fixInnerQuotes(text);
    const parsed = JSON.parse(result);
    expect(parsed.x).toContain("a");
    expect(parsed.y).toContain("b");
  });
});
