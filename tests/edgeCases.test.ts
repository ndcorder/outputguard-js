/**
 * Edge-case tests -- adversarial inputs and real-world LLM failure patterns.
 * Ported from Python: tests/test_edge_cases.py
 */

import { validateAndRepair } from "../src/index.js";
import { repair } from "../src/repairer.js";
import { apply as applyFixValues } from "../src/strategies/fixValues.js";
import { apply as applyFixQuotes } from "../src/strategies/fixQuotes.js";
import { apply as applyRemoveComments } from "../src/strategies/removeComments.js";
import { apply as applyFixKeys } from "../src/strategies/fixKeys.js";
import { apply as applyFixClosers } from "../src/strategies/fixClosers.js";
import { apply as applyFixCommas } from "../src/strategies/fixCommas.js";

// -- Shared schemas (inline equivalents of the pytest fixtures) ---------------

const simpleSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
    email: { type: "string", format: "email" },
  },
  required: ["name", "age"],
};

const nestedSchema = {
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
    metadata: {
      type: "object",
      properties: {
        total: { type: "integer" },
        timestamp: { type: "string" },
      },
      required: ["total", "timestamp"],
    },
  },
  required: ["items", "metadata"],
};

// -- TestRealWorldLLMOutputs ------------------------------------------------

describe("TestRealWorldLLMOutputs", () => {
  it("chatgpt_style_preamble", () => {
    const text = `Sure! Here is the JSON you requested:

\`\`\`json
{
    "name": "Alice",
    "age": 30
}
\`\`\`

I hope this helps! Let me know if you need anything else.`;
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Alice");
  });

  it("claude_style_thinking", () => {
    const text = `I'll create a JSON object with the user's information.

{"name": "Bob", "age": 25}`;
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Bob");
  });

  it("llm_explains_after_json", () => {
    const text = '{"name": "Charlie", "age": 35}\n\nAs you can see, Charlie is 35 years old.';
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
  });

  it("python_dict_literal", () => {
    const text = "{'name': 'Diana', 'age': 28}";
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Diana");
  });

  it("python_dict_with_booleans", () => {
    const schema = {
      type: "object",
      properties: { active: { type: "boolean" }, name: { type: "string" } },
      required: ["active", "name"],
    };
    const text = "{'active': True, 'name': 'Test'}";
    const result = validateAndRepair(text, schema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).active).toBe(true);
  });

  it("javascript_object_literal", () => {
    const schema = {
      type: "object",
      properties: { x: { type: "number" } },
      required: ["x"],
    };
    const text = "{x: 42}";
    const result = validateAndRepair(text, schema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).x).toBe(42);
  });

  it("json_with_comments_and_trailing_commas", () => {
    const text = '{\n    // User information\n    "name": "Eve", /* first name */\n    "age": 22, // years old\n}';
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Eve");
  });

  it("multiple_json_blocks_takes_first", () => {
    const text = '```json\n{"name": "First", "age": 1}\n```\n\n```json\n{"name": "Second", "age": 2}\n```';
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("First");
  });

  it("json_with_nan_and_infinity", () => {
    const text = '{"a": NaN, "b": Infinity, "c": -Infinity}';
    const repaired = applyFixValues(text);
    const data = JSON.parse(repaired);
    expect(data.a).toBeNull();
    expect(data.b).toBeNull();
    expect(data.c).toBeNull();
  });

  it("deeply_nested_repair", () => {
    const schema = {
      type: "object",
      properties: {
        level1: {
          type: "object",
          properties: {
            level2: {
              type: "object",
              properties: { value: { type: "string" } },
            },
          },
        },
      },
    };
    const text = "{level1: {level2: {value: 'deep'}}}";
    const result = validateAndRepair(text, schema);
    expect(result.valid).toBe(true);
    const data = result.data as Record<string, any>;
    expect(data.level1.level2.value).toBe("deep");
  });

  it("json_in_bullet_point", () => {
    const text = '- Response: {"name": "Test", "age": 20}';
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
  });

  it("large_array_with_issues", () => {
    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" } },
        required: ["id"],
      },
    };
    const items = Array.from({ length: 50 }, (_, i) => `{"id": ${i}}`).join(", ");
    const text = `[${items},]`;
    const result = validateAndRepair(text, schema);
    expect(result.valid).toBe(true);
    expect((result.data as unknown[]).length).toBe(50);
  });
});

// -- TestAdversarialInputs --------------------------------------------------

describe("TestAdversarialInputs", () => {
  it("empty_string", () => {
    const result = repair("");
    expect(result.repaired).toBe(false);
  });

  it("only_whitespace", () => {
    const result = repair("   \n\t  ");
    expect(result.repaired).toBe(false);
  });

  it("only_braces", () => {
    const result = repair("{}");
    expect(result.repaired).toBe(false);
    expect(JSON.parse(result.text)).toEqual({});
  });

  it("only_brackets", () => {
    const result = repair("[]");
    expect(result.repaired).toBe(false);
    expect(JSON.parse(result.text)).toEqual([]);
  });

  it("nested_empty", () => {
    const result = repair('{"a": {}, "b": []}');
    expect(result.repaired).toBe(false);
  });

  it("very_deep_nesting", () => {
    const text = '{"a": '.repeat(20) + "1" + "}".repeat(20);
    const result = repair(text);
    expect(result.repaired).toBe(false);
    const data = JSON.parse(result.text);
    expect(data).not.toBeNull();
  });

  it("special_characters_in_strings", () => {
    const text = '{"emoji": "Hello 🙋🌍", "path": "C:\\\\Users\\\\test"}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.emoji).toContain("Hello");
  });

  it("url_in_value", () => {
    const text = '{"url": "https://example.com/path?q=1&r=2#anchor"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    expect(JSON.parse(result.text).url.startsWith("https://")).toBe(true);
  });

  it("html_in_value", () => {
    const text = '{"html": "<div class=\\"test\\">Hello</div>"}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("multiline_string_value", () => {
    const text = '{"text": "line1\nline2\nline3"}';
    const result = repair(text);
    expect(result.repaired).toBe(true);
    const data = JSON.parse(result.text);
    expect(data.text).toContain("line1");
  });

  it("json_number_edge_cases", () => {
    const text = '{"a": 0, "b": -1, "c": 1.5e10, "d": -3.14}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    const data = JSON.parse(result.text);
    expect(data.c).toBe(1.5e10);
  });

  it("null_values", () => {
    const text = '{"a": null, "b": null}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    const data = JSON.parse(result.text);
    expect(data.a).toBeNull();
  });

  it("boolean_values", () => {
    const text = '{"a": true, "b": false}';
    const result = repair(text);
    expect(result.repaired).toBe(false);
  });

  it("mixed_array", () => {
    const text = '[1, "two", true, null, {"five": 5}]';
    const result = repair(text);
    expect(result.repaired).toBe(false);
    expect(JSON.parse(result.text).length).toBe(5);
  });
});

// -- TestStrategyInteractions -----------------------------------------------

describe("TestStrategyInteractions", () => {
  it("fences_plus_comments_plus_trailing_comma", () => {
    const text = '```json\n{\n  "name": "Test", // a name\n  "age": 25, // years\n}\n```';
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
  });

  it("extract_plus_quotes_plus_keys", () => {
    const text = "The output is: {name: 'Alice', age: 30} and that's it.";
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Alice");
  });

  it("all_strategies_combined", () => {
    const text = `\`\`\`json
{
    name: 'Grace', // first name
    age: 40, /* years */
}
\`\`\``;
    const result = validateAndRepair(text, simpleSchema);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Grace");
    expect((result.data as Record<string, unknown>).age).toBe(40);
  });

  it("repair_preserves_data_integrity", () => {
    const text = `\`\`\`json
{
    "items": [
        {"name": "Widget A", "price": 19.99},
        {"name": "Widget B", "price": 29.99},
    ],
    "metadata": {
        "total": 2,
        "timestamp": "2024-06-15T10:30:00Z",
    }
}
\`\`\``;
    const result = validateAndRepair(text, nestedSchema);
    expect(result.valid).toBe(true);
    const data = result.data as Record<string, any>;
    expect(data.items.length).toBe(2);
    expect(data.items[0].price).toBe(19.99);
    expect(data.metadata.total).toBe(2);
  });
});

// -- TestEdgeCasesInStrategies ----------------------------------------------

describe("TestEdgeCasesInStrategies", () => {
  it("fence_with_extra_whitespace", () => {
    const text = '```json  \n  {"a": 1}  \n  ```';
    const result = repair(text);
    expect(result.repaired).toBe(true);
  });

  it("fence_with_no_newline", () => {
    const text = '```json{"a": 1}```';
    const result = repair(text);
    expect(typeof result.repaired).toBe("boolean"); // must not crash
  });

  it("single_quote_with_escaped_apostrophe", () => {
    const result = applyFixQuotes("{'key': 'it\\'s fine'}");
    const data = JSON.parse(result);
    expect(data.key).toBe("it's fine");
  });

  it("single_quote_with_inner_double_quote", () => {
    const result = applyFixQuotes("{'key': 'say \"hello\"'}");
    const data = JSON.parse(result);
    expect(data.key).toBe('say "hello"');
  });

  it("comment_in_url_string", () => {
    const text = '{"url": "https://api.example.com/v1/users"}';
    expect(applyRemoveComments(text)).toBe(text);
  });

  it("keys_with_dollar_sign", () => {
    const result = applyFixKeys('{$id: 1, $type: "test"}');
    const data = JSON.parse(result);
    expect(data.$id).toBe(1);
  });

  it("closers_with_strings_containing_braces", () => {
    const text = '{"regex": "\\\\{.*\\\\}", "data": [1, 2';
    const result = applyFixClosers(text);
    const data = JSON.parse(result);
    expect(data.data).toEqual([1, 2]);
  });

  it("values_nan_in_string", () => {
    const text = '{"msg": "NaN means Not a Number", "val": NaN}';
    const result = applyFixValues(text);
    const data = JSON.parse(result);
    expect(data.msg).toContain("NaN"); // Preserved in string
    expect(data.val).toBeNull(); // Replaced outside string
  });

  it("commas_in_strings_preserved", () => {
    const text = '{"msg": "a, b, c,", "x": 1,}';
    const result = applyFixCommas(text);
    const data = JSON.parse(result);
    expect(data.msg).toBe("a, b, c,"); // Comma in string preserved
    expect(data.x).toBe(1);
  });
});
