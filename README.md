# outputguard

**Stop wrestling with broken LLM JSON.** Validate, repair, and retry — automatically.

[![npm](https://img.shields.io/npm/v/outputguard)](https://www.npmjs.com/package/outputguard)
[![CI](https://github.com/ndcorder/outputguard-js/actions/workflows/ci.yml/badge.svg)](https://github.com/ndcorder/outputguard-js/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-82-brightgreen)](#)

---

## The Problem

LLMs produce broken JSON constantly. They wrap it in markdown fences, leave trailing commas, use Python `True`/`False` instead of `true`/`false`, sprinkle in `NaN`, truncate mid-object when they hit token limits, and helpfully add commentary around the JSON you asked for. Every AI application ends up writing the same brittle `JSON.parse()` + `try/catch` + regex gauntlet.

## The Solution

```typescript
import { validateAndRepair } from "outputguard";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
  },
  required: ["name", "age"],
};

// Typical LLM output — fenced, trailing comma, single quotes
const llmOutput = "```json\n{'name': 'Alice', 'age': 30,}\n```";

const result = validateAndRepair(llmOutput, schema);
console.log(result.valid);              // true
console.log(result.data);               // { name: "Alice", age: 30 }
console.log(result.strategiesApplied);   // ["strip_fences", "fix_quotes", "fix_commas"]
```

Thirteen repair strategies, JSON Schema validation, retry prompt generation, and a CLI — in one tiny package with two dependencies.

## Installation

```bash
npm install outputguard
```

```bash
pnpm add outputguard
```

```bash
yarn add outputguard
```

```bash
bun add outputguard
```

> Requires Node.js >= 18. ESM only.

## Quick Start

### Validate & Repair

The most common pattern — validate against a schema, auto-repair if broken, get clean data back:

```typescript
import { validateAndRepair } from "outputguard";

const result = validateAndRepair(llmOutput, schema);

if (result.valid) {
  process(result.data);                    // Clean, validated object
  if (result.repaired) {
    log(result.strategiesApplied);         // What was fixed
  }
} else {
  handleErrors(result.errors);             // Detailed error paths
}
```

### Repair Only

When you just need parseable JSON and don't have a schema:

```typescript
import { repair } from "outputguard";

const result = repair(brokenJson);
console.log(result.text);                // Clean JSON string
console.log(result.strategiesApplied);   // ["fix_booleans", "fix_commas"]
```

### Validate Only

Check JSON against a schema without attempting repair:

```typescript
import { validate } from "outputguard";

const result = validate(llmOutput, schema);
for (const error of result.errors) {
  console.log(`${error.path}: ${error.message}`);
  // $.age: must be integer
}
```

### Parse or Throw

When you want clean data or an exception — no middle ground:

```typescript
import { parse } from "outputguard";

try {
  const data = parse(llmOutput, schema);  // Returns validated object
} catch (err) {
  // ParseError or SchemaValidationError
}
```

### Retry Loop

When repair is not enough, generate a correction prompt and send it back to the LLM:

```typescript
import { validateAndRepair, retryPrompt } from "outputguard";

async function getStructuredOutput(
  llm: LLMClient,
  prompt: string,
  schema: Record<string, unknown>,
  maxRetries = 3,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const raw = await llm.generate(prompt);
    const result = validateAndRepair(raw, schema);

    if (result.valid) return result.data!;

    // Generate a targeted correction prompt
    prompt = retryPrompt(raw, schema, result.errors);
  }
  throw new Error("Failed to get valid output");
}
```

The retry prompt tells the LLM exactly what went wrong — which fields are missing, which types are incorrect, and what the schema expects. Works with any LLM provider.

## What It Fixes

Thirteen strategies, applied in order. Each one targets a specific class of LLM JSON malformation:

| # | Strategy | Before | After |
|---|---|---|---|
| 1 | `strip_fences` | `` ```json\n{"a": 1}\n``` `` | `{"a": 1}` |
| 2 | `extract_json` | `Sure! Here's the JSON: {"a": 1} Let me know!` | `{"a": 1}` |
| 3 | `remove_comments` | `{"a": 1} // a comment` | `{"a": 1}` |
| 4 | `fix_commas` | `{"a": 1, "b": 2,}` | `{"a": 1, "b": 2}` |
| 5 | `fix_quotes` | `{'a': 'hello'}` | `{"a": "hello"}` |
| 6 | `fix_keys` | `{a: 1, b: 2}` | `{"a": 1, "b": 2}` |
| 7 | `fix_values` | `{"a": NaN, "b": Infinity}` | `{"a": null, "b": null}` |
| 8 | `fix_booleans` | `{"a": True, "b": None}` | `{"a": true, "b": null}` |
| 9 | `fix_truncated` | `{"a": 1, "b": "hel` | `{"a": 1, "b": "hel"}` |
| 10 | `fix_ellipsis` | `{"items": [1, 2, ...]}` | `{"items": [1, 2]}` |
| 11 | `fix_unicode` | `{"a": "\u00"}` | `{"a": "�"}` |
| 12 | `fix_closers` | `{"a": [1, 2, 3` | `{"a": [1, 2, 3]}` |
| 13 | `fix_newlines` | `{"a": "line1\nline2"}` | `{"a": "line1\\nline2"}` |

## Configuration

Use the `OutputGuard` class for fine-grained control over which strategies run:

```typescript
import { OutputGuard } from "outputguard";

// Strict mode — only fix formatting, not content
const strict = new OutputGuard({
  strategies: ["strip_fences", "fix_commas"],
  maxRepairAttempts: 1,
});
const result = strict.validateAndRepair(text, schema);

// Aggressive mode — all strategies, more attempts
const aggressive = new OutputGuard({
  maxRepairAttempts: 5,
});
```

## RepairReport

For debugging and observability, request a `RepairReport` for a full breakdown of what happened:

```typescript
import { OutputGuard, getDiff, getStepDiffs, getConfidence, getSummary } from "outputguard";

const guard = new OutputGuard();
const { result, report } = guard.repair(text, { report: true });

console.log(getSummary(report));
// Repaired using 2 strategy(ies): strip_fences, fix_commas

console.log(getConfidence(report));  // 0.8 — fewer strategies = higher confidence
console.log(getDiff(report));        // Unified diff from original to repaired
console.log(getStepDiffs(report));   // Per-strategy diffs for verbose logging
```

**Confidence scoring** is a heuristic from 0.0 to 1.0. It decreases as more strategies are needed and as the text changes more. Useful for deciding whether to trust a repair or escalate to a retry.

## CLI Reference

```bash
# Validate JSON against a schema
outputguard validate output.json -s schema.json

# Validate with auto-repair
outputguard validate output.json -s schema.json --repair

# Repair only (no schema)
outputguard repair output.json

# Repair with specific strategies
outputguard repair output.json --strategies strip_fences,fix_commas

# Pipe from stdin
echo '{name: "Alice", age: 30,}' | outputguard repair -

# Generate a retry prompt
outputguard retry-prompt output.json -s schema.json

# List all repair strategies
outputguard strategies

# Show version
outputguard version
```

**Flags:**

| Flag | Description |
|---|---|
| `-s, --schema <file>` | JSON Schema file path |
| `--repair` | Attempt to repair invalid JSON (validate only) |
| `--format json` | Machine-readable JSON output |
| `--strategies s1,s2` | Comma-separated strategies (repair only) |
| `--diff` | Show unified diff of repairs |
| `--verbose` | Show detailed per-strategy diffs and confidence |
| `--quiet` | Suppress non-essential output |

All commands accept `-` as input to read from stdin. Exit codes: `0` = valid/repaired, `1` = invalid/failed, `2` = usage error.

## API Reference

### Module-level Functions

| Function | Returns | Description |
|---|---|---|
| `validate(text, schema)` | `ValidationResult` | Validate JSON against a schema |
| `repair(text)` | `RepairResult` | Auto-repair malformed JSON |
| `validateAndRepair(text, schema)` | `ValidationResult` | Validate, repair if needed, re-validate |
| `parse(text, schema)` | `object \| array` | Parse and validate, throw on failure |
| `retryPrompt(text, schema, errors)` | `string` | Generate a correction prompt for the LLM |

### Classes

| Class | Description |
|---|---|
| `OutputGuard` | Configurable pipeline with strategy selection and retry limits |

### Types

| Type | Key Fields |
|---|---|
| `ValidationResult` | `valid`, `data`, `errors`, `repaired`, `strategiesApplied`, `originalText`, `repairedText` |
| `RepairResult` | `repaired`, `text`, `strategiesApplied`, `parseError` |
| `ValidationError` | `message`, `path`, `schemaPath`, `value` |
| `RepairReport` | `originalText`, `finalText`, `success`, `steps`, `parseError` |
| `StrategyEntry` | `name`, `description`, `apply` |
| `OutputGuardOptions` | `strategies`, `maxRepairAttempts` |

### Exceptions

| Exception | Description |
|---|---|
| `OutputGuardError` | Base exception |
| `ParseError` | JSON could not be parsed even after repair |
| `SchemaValidationError` | JSON parsed but does not match the schema |
| `RepairError` | Repair was attempted but failed |

All types and exceptions are exported from the package entry point.

## Why outputguard?

| | `JSON.parse()` + regex | outputguard |
|---|---|---|
| Repair strategies | Roll your own | 13, tested and ordered |
| Schema validation | Separate library | Built in (Ajv) |
| Retry prompts | Write your own | One function call |
| Confidence scoring | No | Yes |
| Truncated JSON | Breaks | Recovers |
| LLM dependencies | -- | None (works with any provider) |
| Footprint | -- | 2 deps: ajv, ajv-formats |

outputguard has no opinion about which LLM you use. It operates on strings and schemas -- plug it into OpenAI, Anthropic, local models, or anything else.

## Also Available in Python

This is the TypeScript port. The original Python package has the same 13 strategies and API design:

**[outputguard (Python)](https://github.com/ndcorder/outputguard)** -- `pip install outputguard`

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/ndcorder/outputguard-js.git
cd outputguard-js
npm install
npm test
```

## License

[MIT](LICENSE)
