/**
 * Real-world LLM failure corpus — 100+ test cases based on actual outputs from
 * different models and providers observed in production.
 */

import { repair, validateAndRepair } from "../src/index.js";

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const SIMPLE_SCHEMA = {
  type: "object",
  properties: { name: { type: "string" }, age: { type: "integer" } },
  required: ["name", "age"],
};

const BOOL_SCHEMA = {
  type: "object",
  properties: { active: { type: "boolean" }, name: { type: "string" } },
  required: ["active", "name"],
};

const ARRAY_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" } },
      },
    },
  },
  required: ["items"],
};

const FLEXIBLE_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: true,
};

// ===================================================================
// Class 1: ChatGPT / OpenAI Patterns
// ===================================================================

describe("TestChatGPTPatterns", () => {
  it("json fence despite instructions", () => {
    const text = '```json\n{"name": "Alice", "age": 30}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
  });

  it("here is the json preamble", () => {
    const text = 'Here is the JSON:\n\n{"name": "Bob", "age": 25}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Bob");
  });

  it("trailing explanation", () => {
    const text = '{"name": "Carol", "age": 35}\n\nThis JSON contains the user\'s information as requested.';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Carol");
  });

  it("json with line comments", () => {
    const text = '{\n  "name": "Dave", // user name\n  "age": 28 // in years\n}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Dave");
  });

  it("trailing commas in arrays", () => {
    const text = '{"name": "Eve", "age": 22, "tags": ["admin", "user",]}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.tags).toEqual(["admin", "user"]);
  });

  it("truncated large response", () => {
    const text = '{"name": "Frank", "age": 40, "bio": "A long biography that gets cut off mid';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Frank");
  });

  it("multiple json blocks with explanations", () => {
    const text =
      "Here is the first result:\n\n" +
      '```json\n{"name": "Grace", "age": 31}\n```\n\n' +
      "And here is another variant:\n\n" +
      '```json\n{"name": "Hank", "age": 45}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Grace");
  });

  it("typescript fence", () => {
    const text = '```typescript\n{"name": "Ivy", "age": 27}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Ivy");
  });

  it("note after json", () => {
    const text = '{"name": "Jack", "age": 33}\n\nNote: The age field is required by the schema.';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Jack");
  });

  it("json in numbered list", () => {
    const text = '1. The result:\n{"name": "Kate", "age": 29}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Kate");
  });

  it("sure preamble", () => {
    const text = 'Sure! Here you go:\n\n{"name": "Leo", "age": 41}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Leo");
  });

  it("block comment in json", () => {
    const text = '{\n  "name": "Mia", /* first name */\n  "age": 26 /* years */\n}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Mia");
  });

  it("trailing comma in object", () => {
    const text = '{"name": "Nora", "age": 38,}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Nora");
  });

  it("preamble and fence combined", () => {
    const text = 'Here is the requested JSON output:\n\n```json\n{"name": "Oscar", "age": 50}\n```\n\nLet me know if you need changes!';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Oscar");
  });

  it("response with markdown bold", () => {
    const text = '**Output:**\n\n{"name": "Pat", "age": 44}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Pat");
  });
});

// ===================================================================
// Class 2: Claude / Anthropic Patterns
// ===================================================================

describe("TestClaudePatterns", () => {
  it("thinking preamble", () => {
    const text =
      "Let me think about this carefully.\n\n" +
      "Based on the requirements, the appropriate response is:\n\n" +
      '{"name": "Alice", "age": 30}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
  });

  it("ill create preamble", () => {
    const text = 'I\'ll create a JSON object with the requested fields:\n\n{"name": "Bob", "age": 25}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Bob");
  });

  it("bare backtick fence", () => {
    const text = '```\n{"name": "Carol", "age": 35}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Carol");
  });

  it("python dict true false none", () => {
    const text = '{"active": True, "name": "Diana", "deleted": False, "middle_name": None}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.active).toBe(true);
    expect(data.deleted).toBe(false);
    expect(data.middle_name).toBeNull();
  });

  it("json fence extra newlines", () => {
    const text = '```json\n\n\n{"name": "Eve", "age": 22}\n\n\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Eve");
  });

  it("heres the json response", () => {
    const text = 'Here\'s the JSON response:\n\n```json\n{"name": "Frank", "age": 40}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Frank");
  });

  it("explanation paragraphs above and below", () => {
    const text =
      "Based on the input data, I've constructed the following JSON object " +
      "that captures the key information:\n\n" +
      '{"name": "Grace", "age": 31}\n\n' +
      "This represents the user profile with all required fields populated " +
      "according to the schema.";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Grace");
  });

  it("markdown heading before json", () => {
    const text = '## Result\n\n```json\n{"name": "Hank", "age": 45}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Hank");
  });

  it("thinking tags then json", () => {
    const text =
      "[thinking]The user wants a simple JSON object with name and age.[/thinking]\n\n" +
      '```json\n{"name": "Ivy", "age": 27}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Ivy");
  });

  it("bullet points before json", () => {
    const text =
      "Key considerations:\n" +
      "- Name must be a string\n" +
      "- Age must be an integer\n\n" +
      '{"name": "Jack", "age": 33}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Jack");
  });

  it("xml artifact wrapper", () => {
    const text = '<artifact>\n{"name": "Kate", "age": 29}\n</artifact>';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Kate");
  });

  it("indented json in explanation", () => {
    const text =
      "The resulting JSON is:\n\n" +
      '    {"name": "Leo", "age": 41}\n\n' +
      "Which satisfies all constraints.";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Leo");
  });

  it("trailing comma in nested", () => {
    const text = '{"users": [{"name": "Mia", "age": 26,}, {"name": "Nora", "age": 38,},]}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.users).toHaveLength(2);
  });

  it("heres what i came up with", () => {
    const text = 'Here\'s what I came up with:\n\n{"name": "Oscar", "age": 50}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Oscar");
  });

  it("double newline fence", () => {
    const text = '```json\n\n{"name": "Pat", "age": 44}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Pat");
  });
});

// ===================================================================
// Class 3: Llama / Meta Patterns
// ===================================================================

describe("TestLlamaPatterns", () => {
  it("everything in markdown fences", () => {
    const text = '```\n{"name": "Alice", "age": 30}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
  });

  it("output prefix", () => {
    const text = 'Output:\n{"name": "Bob", "age": 25}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Bob");
  });

  it("single quotes python style", () => {
    const text = "{'name': 'Carol', 'age': 35}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Carol");
  });

  it("python booleans mixed with json", () => {
    const text = '{"active": True, "name": "Dave", "verified": False}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.active).toBe(true);
    expect(data.verified).toBe(false);
  });

  it("i hope this helps suffix", () => {
    const text = '{"name": "Eve", "age": 22}\n\nI hope this helps!';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Eve");
  });

  it("truncated mid string", () => {
    const text = '{"name": "Frank", "description": "This is a very long description that goes on and on';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Frank");
  });

  it("python dict literal", () => {
    const text = "{'name': 'Grace', 'age': 31, 'active': True, 'score': None}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Grace");
    expect(data.active).toBe(true);
    expect(data.score).toBeNull();
  });

  it("blank lines inside json", () => {
    const text = '{\n"name": "Hank",\n\n"age": 45\n\n}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Hank");
  });

  it("prompt repeated before answer", () => {
    const text = 'Generate a JSON object with name and age fields.\n\n{"name": "Ivy", "age": 27}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Ivy");
  });

  it("answer prefix", () => {
    const text = 'Answer:\n{"name": "Jack", "age": 33}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Jack");
  });

  it("result prefix", () => {
    const text = 'Result: {"name": "Kate", "age": 29}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Kate");
  });

  it("json with none values", () => {
    const text = '{"name": "Leo", "age": 41, "email": None}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.email).toBeNull();
  });

  it("trailing newlines", () => {
    const text = '{"name": "Mia", "age": 26}\n\n\n\n\n';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Mia");
  });

  it("response prefix", () => {
    const text = 'Response:\n\n{"name": "Nora", "age": 38}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Nora");
  });

  it("triple backtick same line", () => {
    const text = '```{"name": "Oscar", "age": 50}```';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });
});

// ===================================================================
// Class 4: DeepSeek Patterns
// ===================================================================

describe("TestDeepSeekPatterns", () => {
  it("always json fences", () => {
    const text = '```json\n{"status": "ok", "count": 42}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.status).toBe("ok");
  });

  it("extra newlines after fence", () => {
    const text = '```json\n{"name": "Alice", "age": 30}\n```\n\n';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
  });

  it("trailing commas frequent", () => {
    const text = '{"a": 1, "b": 2, "c": 3,}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.c).toBe(3);
  });

  it("nested trailing commas", () => {
    const text = '{"data": {"x": 1, "y": 2,}, "meta": ["a", "b",],}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.data.x).toBe(1);
  });

  it("thinking block", () => {
    const text = '<think>\nI need to return a JSON object.\n</think>\n\n{"name": "Bob", "age": 25}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Bob");
  });

  it("fenced with trailing comma", () => {
    const text = '```json\n{"items": [1, 2, 3,],}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.items).toEqual([1, 2, 3]);
  });

  it("comments inside fence", () => {
    const text = '```json\n{\n  // main config\n  "debug": true,\n  "level": 5\n}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.debug).toBe(true);
  });

  it("extra whitespace", () => {
    const text = '{  "name"  :  "Carol"  ,  "age"  :  35  }';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Carol");
  });

  it("truncated array", () => {
    const text = '{"values": [1, 2, 3, 4, 5';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.values).toContain(1);
  });

  it("preamble and fence", () => {
    const text = 'The result is as follows:\n\n```json\n{"score": 95, "grade": "A"}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.grade).toBe("A");
  });
});

// ===================================================================
// Class 5: Mistral Patterns
// ===================================================================

describe("TestMistralPatterns", () => {
  it("unquoted keys js style", () => {
    const text = '{name: "Alice", age: 30}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
  });

  it("undefined mixed with null", () => {
    const text = '{"name": "Bob", "email": undefined, "phone": null}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.email).toBeNull();
    expect(data.phone).toBeNull();
  });

  it("commentary text around json", () => {
    const text =
      "I analyzed the input and here is the structured output:\n\n" +
      '{"name": "Carol", "age": 35}\n\n' +
      "The fields have been validated against the schema.";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Carol");
  });

  it("nan for missing numeric", () => {
    const text = '{"name": "Dave", "score": NaN}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Dave");
  });

  it("truncated mid array", () => {
    const text = '{"results": [{"id": 1}, {"id": 2}, {"id": 3';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.results.length).toBeGreaterThanOrEqual(2);
  });

  it("mixed quotes and unquoted keys", () => {
    const text = '{"name": "Eve", age: 22, "city": "Paris"}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Eve");
    expect(data.age).toBe(22);
  });

  it("trailing text with fence", () => {
    const text = '```json\n{"name": "Frank", "age": 40}\n```\n\nPlease review the output above.';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Frank");
  });

  it("json in paragraph", () => {
    const text = 'The computed result is {"value": 42, "unit": "meters"} based on input.';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.value).toBe(42);
  });

  it("infinity value", () => {
    const text = '{"name": "Grace", "max_value": Infinity}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Grace");
  });

  it("multiple unquoted keys", () => {
    const text = '{name: "Hank", age: 45, city: "Lyon",}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.city).toBe("Lyon");
  });
});

// ===================================================================
// Class 6: Gemini / Google Patterns
// ===================================================================

describe("TestGeminiPatterns", () => {
  it("bare array when object asked", () => {
    const text = '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data).toHaveLength(2);
  });

  it("json fences", () => {
    const text = '```json\n{"name": "Carol", "age": 35}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Carol");
  });

  it("heres the result preamble", () => {
    const text = 'Here\'s the result:\n\n{"name": "Dave", "age": 28}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Dave");
  });

  it("infinity for large numbers", () => {
    const text = '{"count": 999999, "limit": Infinity}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.count).toBe(999999);
  });

  it("line comments in json", () => {
    const text = '{\n  "name": "Eve", // primary key\n  "age": 22 // years\n}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Eve");
  });

  it("trailing comma nested", () => {
    const text = '{"tags": ["a", "b", "c",], "count": 3,}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.count).toBe(3);
  });

  it("response label", () => {
    const text = 'Response:\n{"name": "Frank", "age": 40}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Frank");
  });

  it("bold key labels", () => {
    const text = 'The **name** and **age** fields are:\n\n{"name": "Grace", "age": 31}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Grace");
  });

  it("javascript fence", () => {
    const text = '```javascript\n{"name": "Hank", "age": 45}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Hank");
  });

  it("preamble with schema echo", () => {
    const text =
      "Based on the schema with properties name (string) and age (integer):\n\n" +
      '{"name": "Ivy", "age": 27}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Ivy");
  });
});

// ===================================================================
// Class 7: Local / Small Model Patterns
// ===================================================================

describe("TestLocalModelPatterns", () => {
  it("mixed python and json syntax", () => {
    const text = "{'key': True, \"other\": false}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.key).toBe(true);
    expect(data.other).toBe(false);
  });

  it("incomplete truncated json", () => {
    const text = '{"name": "Alice", "items": [{"id": 1}, {"id": 2';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Alice");
  });

  it("backtick on same line", () => {
    const text = '```{"name": "Bob", "age": 25}```';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("ellipsis abbreviated content", () => {
    const text = '{"items": [1, 2, 3, ...], "count": 100}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.count).toBe(100);
  });

  it("undefined for missing", () => {
    const text = '{"name": "Carol", "email": undefined}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.email).toBeNull();
  });

  it("json followed by python explanation", () => {
    const text =
      '{"name": "Dave", "age": 28}\n\n' +
      "# The above JSON contains the user info\n" +
      "# name: str, age: int";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Dave");
  });

  it("consecutive commas", () => {
    const text = '{"a": 1,, "b": 2}';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("jsonc block comments", () => {
    const text = '{/* config */ "debug": true, "level": /* importance */ 5}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.debug).toBe(true);
    expect(data.level).toBe(5);
  });

  it("key equals value no crash", () => {
    const text = '{name = "Alice", age = 30}';
    const result = repair(text);
    expect(typeof result.text).toBe("string");
  });

  it("mixed quoted and unquoted keys", () => {
    const text = '{"name": "Eve", age: 22, "city": "Berlin"}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Eve");
    expect(data.age).toBe(22);
  });

  it("python none", () => {
    const text = '{"result": None, "error": None}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.result).toBeNull();
  });

  it("single quotes nested", () => {
    const text = "{'users': [{'name': 'Frank', 'age': 40}, {'name': 'Grace', 'age': 31}]}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.users).toHaveLength(2);
  });

  it("output label and fence", () => {
    const text = 'Output:\n```json\n{"status": "success"}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.status).toBe("success");
  });

  it("negative infinity", () => {
    // In JS, JSON.parse rejects Infinity/-Infinity, so the repairer should fix them to null
    const text = '{"min": -Infinity, "max": Infinity}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    // After repair, these should be parseable (likely replaced with null)
    expect(data.min).toBeNull();
    expect(data.max).toBeNull();
  });

  it("truncated deeply nested", () => {
    const text = '{"a": {"b": {"c": {"d": "value"';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.a.b.c.d).toBe("value");
  });
});

// ===================================================================
// Class 8: Real-World Prompt Responses
// ===================================================================

describe("TestRealWorldPromptResponses", () => {
  it("sentiment analysis fenced", () => {
    const text = '```json\n{"text": "I love this product!", "sentiment": "positive", "confidence": 0.95}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.sentiment).toBe("positive");
  });

  it("data extraction with commentary", () => {
    const text =
      "Based on the document, here are the extracted entities:\n\n" +
      '{"entities": [\n' +
      '    {"name": "John Smith", "type": "person"},\n' +
      '    {"name": "Acme Corp", "type": "organization"},\n' +
      '    {"name": "New York", "type": "location"}\n' +
      "]}\n\n" +
      "I identified 3 entities in the text.";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.entities).toHaveLength(3);
  });

  it("classification python style", () => {
    const text = "{'category': 'technology', 'subcategory': 'AI', 'confidence': 0.88, 'tags': ['machine-learning', 'NLP',]}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.category).toBe("technology");
  });

  it("code review with thinking", () => {
    const text =
      "Let me analyze this code carefully.\n\n" +
      "The main issues I found are:\n\n" +
      "```json\n" +
      "{\n" +
      '    "issues": [\n' +
      '        {"severity": "high", "line": 42, "message": "SQL injection vulnerability"},\n' +
      '        {"severity": "medium", "line": 15, "message": "Missing null check"},\n' +
      "    ],\n" +
      '    "overall_quality": "needs improvement"\n' +
      "}\n" +
      "```\n\n" +
      "I recommend addressing the SQL injection issue first.";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.issues).toHaveLength(2);
  });

  it("translation with special chars", () => {
    const text = '```json\n{"original": "Hello, world!", "translated": "Bonjour, le monde!", "language": "fr", "confidence": 0.98}\n```';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.language).toBe("fr");
  });

  it("summarization unquoted keys", () => {
    const text = '{summary: "The article discusses AI safety.", word_count: 42, key_topics: ["AI", "safety", "regulation"]}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.key_topics).toContain("AI");
  });

  it("function call response fenced", () => {
    const text =
      "```json\n" +
      '{"function": "get_weather", "arguments": {"location": "San Francisco", "unit": "celsius"}}\n' +
      "```";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.function).toBe("get_weather");
    expect(data.arguments.location).toBe("San Francisco");
  });

  it("tool use with preamble", () => {
    const text =
      "I'll use the search tool to find that information:\n\n" +
      '{"tool": "web_search", "query": "latest Python release date", "max_results": 5}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.tool).toBe("web_search");
  });

  it("structured extraction trailing comma", () => {
    const text =
      '{"invoice": {"number": "INV-2024-001", ' +
      '"date": "2024-06-15", ' +
      '"items": [{"desc": "Widget", "qty": 10, "price": 9.99,},],' +
      '"total": 99.90,}}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.invoice.number).toBe("INV-2024-001");
  });

  it("quiz generation with comments", () => {
    const text =
      "{\n" +
      '  "question": "What is the capital of France?", // geography\n' +
      '  "options": ["London", "Paris", "Berlin", "Madrid"],\n' +
      '  "correct_answer": "Paris", // correct\n' +
      '  "difficulty": "easy"\n' +
      "}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.correct_answer).toBe("Paris");
  });

  it("recipe generation python booleans", () => {
    const text =
      "{'recipe': 'Pasta Carbonara', " +
      "'vegetarian': False, " +
      "'gluten_free': False, " +
      "'prep_time_minutes': 30, " +
      "'ingredients': ['pasta', 'eggs', 'bacon', 'parmesan',]}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.recipe).toBe("Pasta Carbonara");
    expect(data.vegetarian).toBe(false);
  });

  it("product description mixed issues", () => {
    const text =
      "Here is the product listing:\n\n" +
      "```json\n" +
      "{\n" +
      '  name: "Wireless Headphones",\n' +
      "  price: 79.99,\n" +
      '  "in_stock": True,\n' +
      '  "features": ["noise canceling", "bluetooth 5.0", "30hr battery",],\n' +
      "}\n" +
      "```";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Wireless Headphones");
    expect(data.in_stock).toBe(true);
  });

  it("calendar event with commentary", () => {
    const text =
      "I've created the calendar event:\n\n" +
      '{"title": "Team Standup", "start": "2024-06-15T09:00:00Z", ' +
      '"end": "2024-06-15T09:30:00Z", "recurring": true, "attendees": ["alice@co.com", "bob@co.com"]}\n\n' +
      "The event has been scheduled.";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.title).toBe("Team Standup");
  });

  it("email parsing response", () => {
    const text =
      "```json\n" +
      "{\n" +
      '  "from": "alice@example.com",\n' +
      '  "to": ["bob@example.com"],\n' +
      '  "subject": "Q2 Report",\n' +
      '  "has_attachments": true,\n' +
      '  "priority": "high",\n' +
      "}\n" +
      "```";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.subject).toBe("Q2 Report");
  });

  it("api schema unquoted keys and comments", () => {
    const text =
      "{\n" +
      '  endpoint: "/api/users", // REST endpoint\n' +
      '  method: "GET",\n' +
      '  "response_type": "json",\n' +
      '  "paginated": true\n' +
      "}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.endpoint).toBe("/api/users");
  });

  it("resume parsing nested python style", () => {
    const text =
      "{'name': 'Jane Doe', " +
      "'experience': [{'company': 'Tech Corp', 'years': 3, 'current': True}, " +
      "{'company': 'StartupX', 'years': 2, 'current': False}], " +
      "'skills': ['Python', 'TypeScript', 'SQL']}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.name).toBe("Jane Doe");
    expect(data.experience).toHaveLength(2);
  });

  it("error report with nan", () => {
    const text = '{"errors": [{"code": 404, "latency_ms": NaN, "message": "Not Found"}], "total": 1}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.errors[0].code).toBe(404);
  });

  it("db query result truncated", () => {
    const text =
      '{"query": "SELECT * FROM users", "rows": [' +
      '{"id": 1, "name": "Alice"}, ' +
      '{"id": 2, "name": "Bob"}, ' +
      '{"id": 3, "name": "Carol"';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.query).toBe("SELECT * FROM users");
  });

  it("config generation with all issues", () => {
    const text =
      "```json\n" +
      "{\n" +
      "  // Database configuration\n" +
      '  host: "localhost",\n' +
      "  port: 5432,\n" +
      '  "database": "myapp",\n' +
      '  "ssl": True, /* enable in production */\n' +
      "}\n" +
      "```";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.host).toBe("localhost");
    expect(data.port).toBe(5432);
    expect(data.ssl).toBe(true);
  });

  it("chatbot intent classification", () => {
    const text =
      "Based on the user's message, I've classified the intent:\n\n" +
      "{'intent': 'book_flight', 'confidence': 0.92, " +
      "'entities': {'destination': 'Tokyo', 'date': '2024-07-01'}, " +
      "'fallback': False}";
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.intent).toBe("book_flight");
  });

  it("multilabel classification trailing", () => {
    const text = '{"labels": ["sports", "technology", "business",], "confidence_scores": [0.85, 0.72, 0.68,],}';
    const result = repair(text);
    const data = JSON.parse(result.text);
    expect(data.labels).toHaveLength(3);
  });
});

// ===================================================================
// Class 8b: validate_and_repair integration with schemas
// ===================================================================

describe("TestValidateAndRepairIntegration", () => {
  it("fenced json with schema", () => {
    const text = '```json\n{"name": "Alice", "age": 30}\n```';
    const result = validateAndRepair(text, SIMPLE_SCHEMA);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Alice");
  });

  it("python booleans with schema", () => {
    const text = '{"active": True, "name": "Bob"}';
    const result = validateAndRepair(text, BOOL_SCHEMA);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).active).toBe(true);
  });

  it("trailing comma array with schema", () => {
    const text = '{"items": [{"id": 1}, {"id": 2}, {"id": 3},]}';
    const result = validateAndRepair(text, ARRAY_SCHEMA);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).items).toHaveLength(3);
  });

  it("preamble and comments with schema", () => {
    const text = 'Here is the result:\n\n{\n  "name": "Carol", // first\n  "age": 35 // years\n}';
    const result = validateAndRepair(text, SIMPLE_SCHEMA);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).age).toBe(35);
  });

  it("unquoted keys with schema", () => {
    const text = '{name: "Dave", age: 28}';
    const result = validateAndRepair(text, SIMPLE_SCHEMA);
    expect(result.valid).toBe(true);
  });

  it("python dict with schema", () => {
    const text = "{'name': 'Eve', 'age': 22}";
    const result = validateAndRepair(text, SIMPLE_SCHEMA);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Eve");
  });

  it("truncated with schema", () => {
    const text = '{"items": [{"id": 1}, {"id": 2';
    const result = validateAndRepair(text, ARRAY_SCHEMA);
    expect(result.valid).toBe(true);
    expect(((result.data as Record<string, unknown>).items as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it("full pipeline complex", () => {
    const text =
      "Sure! Here is the JSON:\n\n" +
      "```json\n" +
      "{\n" +
      "  // User profile\n" +
      "  name: 'Frank',\n" +
      "  age: 40, /* years old */\n" +
      "}\n" +
      "```\n\n" +
      "Let me know if you need anything else!";
    const result = validateAndRepair(text, SIMPLE_SCHEMA);
    expect(result.valid).toBe(true);
    expect((result.data as Record<string, unknown>).name).toBe("Frank");
    expect((result.data as Record<string, unknown>).age).toBe(40);
    expect(result.repaired).toBe(true);
  });
});
