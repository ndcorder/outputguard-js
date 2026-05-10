# Formats Guide

outputguard started with JSON. Version 2.0 keeps JSON as the default while
adding explicit support for other structured formats that LLMs commonly emit.

## Supported Formats

| Format | `format` values | Typical use |
| --- | --- | --- |
| JSON | `"json"` | API payloads, tool calls, eval fixtures |
| YAML | `"yaml"`, `"yml"` | Human-readable configs and long model outputs |
| TOML | `"toml"` | Config files and package metadata snippets |
| Python literal | `"python-literal"`, `"python"`, `"py"`, `"literal"` | Python dict/list/tuple output from models |
| Auto | `"auto"` | Mixed-format input where the format is unknown |
| Forced JSON off | `"forced-json-off"`, `"forced_json_off"` | Prompts that explicitly prohibit JSON |

## JSON Is Still the Default

These calls are equivalent:

```typescript
validateAndRepair('{"name": "Ada"}', schema);
validateAndRepair('{"name": "Ada"}', schema, { format: "json" });
```

Use an explicit `format` when a prompt asks for a non-JSON output format or
when you are validating saved model output from a mixed-format source.

## JSON

JSON repair handles common LLM mistakes such as:

- Trailing commas.
- Single quotes.
- Unquoted object keys.
- Markdown code fences.
- Text before or after the JSON payload.

```typescript
import { validateAndRepair } from "outputguard";

const result = validateAndRepair("{name: 'Ada', score: 1,}", schema, {
  format: "json",
});
```

## YAML

YAML validation parses YAML into JavaScript data. Repair focuses on extracting
the structured block and normalizing common wrapper issues.

```typescript
const result = validateAndRepair(
  `
  \`\`\`yaml
  name: Ada
  score: 1
  \`\`\`
  `,
  schema,
  { format: "yaml" },
);
```

## TOML

TOML support is useful when models generate configuration fragments.

```typescript
const result = validateAndRepair(
  `
  name = "Ada"
  score = 1
  `,
  schema,
  { format: "toml" },
);
```

## Python Literals

Python literal support accepts a safe literal subset such as dicts, lists,
tuples, strings, numbers, booleans, and `None`.

```typescript
const result = validateAndRepair(
  "{'name': 'Ada', 'score': 1, 'tags': ['math', 'systems']}",
  schema,
  { format: "python-literal" },
);
```

This mode is for data literals, not executable Python code.

## Auto Detection

Use `format: "auto"` when you do not know the format in advance.

```typescript
const result = validateAndRepair("name: Ada\nscore: 1\n", schema, {
  format: "auto",
});
```

Auto detection tries supported formats and records the resolved format in the
result. Prefer an explicit format when you control the prompt because explicit
formats produce more predictable feedback.

## Forced JSON Off

Use `format: "forced-json-off"` when your prompt explicitly says not to return
JSON. This makes intent clear in code and prevents a later reader from assuming
JSON repair is appropriate.

```typescript
const result = validateAndRepair(modelOutput, schema, {
  format: "forced-json-off",
});
```

This mode is especially useful when a model is asked for YAML, TOML, or another
non-JSON structured response and may include explanatory text.

## Schema-Free Repair

When you do not have a schema, use `repair()` instead of a validation API.

```typescript
import { repair } from "outputguard";

const result = repair("{name: 'Ada', score: 1,}", { format: "json" });
console.log(result.text);
```
