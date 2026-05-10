# outputguard

**Stop wrestling with broken LLM structured output.** Validate, repair, and retry - automatically.

[![npm](https://img.shields.io/npm/v/outputguard)](https://www.npmjs.com/package/outputguard)
[![CI](https://github.com/ndcorder/outputguard-js/actions/workflows/ci.yml/badge.svg)](https://github.com/ndcorder/outputguard-js/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-1180-brightgreen)](#)

---

## The Problem

LLMs produce broken structured output constantly. They wrap JSON in markdown fences, leave trailing commas, use Python `True`/`False`, sprinkle in `NaN`, truncate mid-object when they hit token limits, and helpfully add commentary around the object you asked for. JSON is the default path, and outputguard can also parse YAML, TOML, Python literals, auto-detected data, and forced-JSON-off model output.

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

Fifteen repair strategies, JSON Schema validation, retry prompt generation, and a CLI - in one small package.

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

## Documentation

Start with the README for a fast overview, then use the focused guides when you
need exact behavior, API signatures, or command examples:

- [API guide](docs/api.md) - choose the right function and understand result
  objects.
- [Formats guide](docs/formats.md) - JSON, YAML, TOML, Python literals, `auto`,
  and `forced-json-off`.
- [Guarded generation guide](docs/guarded-generation.md) - wrap an LLM call with
  validation, repair, retry, and observability.
- [Batch processing guide](docs/batch-processing.md) - validate or repair many
  outputs in one call or from the CLI.
- [CLI guide](docs/cli.md) - commands, flags, examples, and exit codes.
- [Changelog](CHANGELOG.md) - release notes and 2.0 migration notes.

## What's New in 2.0

outputguard 2.0 keeps JSON as the default path, so existing 1.x code continues
to work without passing new options. The new capabilities are opt-in:

- Format-aware validation and repair with `format: "json"`, `"yaml"`, `"toml"`,
  `"python-literal"`, `"auto"`, and `"forced-json-off"`.
- `guardedGenerate()` for calling your LLM function, validating the response,
  optionally repairing it, and retrying with structured feedback.
- Batch APIs and a `batch` CLI command for evals, logs, and offline audits.
- More explicit reports and errors for failed guarded-generation runs.

## Choosing the Right API

| Goal | API |
| --- | --- |
| Validate one model output against a schema | `validate()` |
| Validate and repair one model output | `validateAndRepair()` |
| Repair without schema validation | `repair()` |
| Get parsed data or throw | `parse()` |
| Build a validation-aware retry prompt | `retryPrompt()` |
| Wrap an LLM generation function | `guardedGenerate()` |
| Validate many outputs | `validateBatch()` |
| Repair many outputs | `repairBatch()` |

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

When you just need parseable structured output and don't have a schema:

```typescript
import { repair } from "outputguard";

const result = repair(brokenJson);
console.log(result.text);                // Clean output string
console.log(result.strategiesApplied);   // ["fix_booleans", "fix_commas"]
```

### Input Formats

Use `format` when the model returns a non-JSON format. JSON remains the default, so existing calls do not need options.

```typescript
import { validateAndRepair, parse } from "outputguard";

const yamlResult = validateAndRepair("name: Alice\nage: 30\n", schema, {
  format: "yaml",
});

const tomlData = parse('name = "Alice"\nage = 30\n', schema, {
  format: "toml",
});
```

Supported formats:

| Format | Notes |
|---|---|
| `json` | Default |
| `yaml` / `yml` | YAML documents |
| `toml` | TOML documents |
| `python` / `python-literal` / `literal` | Safe Python literal subset: dicts, lists, tuples, strings, numbers, booleans, and `None` |
| `auto` | Try JSON, TOML, Python literal, then YAML |
| `forced-json-off` | Alias for the same auto-detection path, useful for forced JSON-off model runs |

### Validate Only

Check structured output against a schema without attempting repair:

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

The retry prompt tells the LLM exactly what went wrong - which fields are missing, which types are incorrect, and what the schema expects. Works with any LLM provider.

### Guarded Generation

For production retry loops, use `guardedGenerate()` to wrap any LLM client without adding provider dependencies:

```typescript
import { guardedGenerate } from "outputguard";

const result = await guardedGenerate({
  prompt: "Return a user object as JSON",
  schema,
  maxRetries: 3,
  generate: prompt => llm.generate(prompt),
});

if (result.valid) {
  console.log(result.data);
  console.log(result.attempts.length);
} else {
  console.log(result.errors);
}
```

`guardedGenerate()` validates each generation, repairs when possible, feeds targeted retry prompts back to the generator, and returns every attempt for observability. Pass `repair: false` for strict validation-only loops or `throwOnFailure: true` when invalid output should reject with `GuardedGenerationError`.

### Batch Processing

Use batch helpers when validating fixture sets, eval outputs, or logs:

```typescript
import { validateBatch, repairBatch } from "outputguard";

const batch = validateBatch(outputs, schema, {
  repair: true,
  format: "auto",
});

console.log(batch.summary);
// { total, valid, invalid, repaired, parseFailures, schemaFailures, successRate, ... }

const repaired = repairBatch(outputs);
console.log(repaired.summary.strategyCounts);
```

## What It Fixes

Fifteen strategies, applied in order. Each one targets a specific class of LLM structured-output malformation:

| # | Strategy | Before | After |
|---|---|---|---|
| 1 | `fix_encoding` | Mojibake / smart quote artifacts | Normalized UTF-8 text |
| 2 | `strip_fences` | `` ```json\n{"a": 1}\n``` `` | `{"a": 1}` |
| 3 | `extract_json` | `Sure! Here's the JSON: {"a": 1} Let me know!` | `{"a": 1}` |
| 4 | `remove_comments` | `{"a": 1} // a comment` | `{"a": 1}` |
| 5 | `fix_commas` | `{"a": 1, "b": 2,}` | `{"a": 1, "b": 2}` |
| 6 | `fix_quotes` | `{'a': 'hello'}` | `{"a": "hello"}` |
| 7 | `fix_inner_quotes` | `{"a": "hello "world""}` | `{"a": "hello \"world\""}` |
| 8 | `fix_keys` | `{a: 1, b: 2}` | `{"a": 1, "b": 2}` |
| 9 | `fix_values` | `{"a": NaN, "b": Infinity}` | `{"a": null, "b": null}` |
| 10 | `fix_booleans` | `{"a": True, "b": None}` | `{"a": true, "b": null}` |
| 11 | `fix_truncated` | `{"a": 1, "b": "hel` | `{"a": 1, "b": "hel"}` |
| 12 | `fix_ellipsis` | `{"items": [1, 2, ...]}` | `{"items": [1, 2]}` |
| 13 | `fix_unicode` | `{"a": "\u00"}` | `{"a": "�"}` |
| 14 | `fix_closers` | `{"a": [1, 2, 3` | `{"a": [1, 2, 3]}` |
| 15 | `fix_newlines` | `{"a": "line1\nline2"}` | `{"a": "line1\\nline2"}` |

## Configuration

Use the `OutputGuard` class for fine-grained control over which strategies run:

```typescript
import { OutputGuard } from "outputguard";

// Strict mode — only fix formatting, not content
const strict = new OutputGuard({
  strategies: ["strip_fences", "fix_commas"],
  maxRepairAttempts: 1,
  format: "json",
});
const result = strict.validateAndRepair(text, schema);

// Aggressive mode — all strategies, more attempts
const aggressive = new OutputGuard({
  maxRepairAttempts: 5,
  format: "auto",
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

# Validate YAML against a schema
outputguard validate output.yaml -s schema.json --input-format yaml

# Validate with auto-repair
outputguard validate output.json -s schema.json --repair

# Repair only (no schema)
outputguard repair output.json

# Repair auto-detected structured output
outputguard repair output.txt --input-format auto

# Validate a JSON array of output strings
outputguard batch outputs.json -s schema.json --repair --format json

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

The `batch` command reads `<input>` as a JSON array of output strings.

**Flags:**

| Flag | Description |
|---|---|
| `-s, --schema <file>` | JSON Schema file path |
| `--repair` | Attempt to repair invalid structured output (validate only) |
| `--input-format <format>` | Input format: `json`, `yaml`, `toml`, `python`, `auto`, or `forced-json-off` |
| `--format json` | Machine-readable command output |
| `--strategies s1,s2` | Comma-separated strategies (repair only) |
| `--diff` | Show unified diff of repairs |
| `--verbose` | Show detailed per-strategy diffs and confidence |
| `--quiet` | Suppress non-essential output |

All commands accept `-` as input to read from stdin. Exit codes: `0` = valid/repaired, `1` = invalid/failed, `2` = usage error.

## API Reference

### Module-level Functions

| Function | Returns | Description |
|---|---|---|
| `validate(text, schema, options?)` | `ValidationResult` | Validate structured output against a schema |
| `repair(text, options?)` | `RepairResult` | Auto-repair malformed structured output |
| `validateAndRepair(text, schema, options?)` | `ValidationResult` | Validate, repair if needed, re-validate |
| `parse(text, schema, options?)` | `unknown` | Parse and validate, throw on failure |
| `retryPrompt(text, schema, errors, options?)` | `string` | Generate a correction prompt for the LLM |
| `guardedGenerate(options)` | `Promise<GuardedGenerateResult>` | Retry an arbitrary generator until output validates |
| `validateBatch(texts, schema, options?)` | `BatchValidationResult` | Validate many outputs and return aggregate diagnostics |
| `repairBatch(texts, options?)` | `BatchRepairResult` | Repair many outputs and return aggregate diagnostics |

### Classes

| Class | Description |
|---|---|
| `OutputGuard` | Configurable pipeline with strategy selection and retry limits |

### Types

| Type | Key Fields |
|---|---|
| `DataFormat` | `json`, `yaml`, `toml`, `python`, `auto`, `forced-json-off` |
| `FormatOptions` | `format` |
| `RepairOptions` | `format`, `report` |
| `GuardedGenerateResult` | `valid`, `data`, `text`, `attempts`, `errors`, `repaired`, `strategiesApplied`, `exhausted`, `format` |
| `BatchSummary` | `total`, `valid`, `invalid`, `repaired`, `parseFailures`, `schemaFailures`, `successRate`, `strategyCounts`, `formats` |
| `ValidationResult` | `valid`, `data`, `errors`, `repaired`, `strategiesApplied`, `originalText`, `repairedText`, `format` |
| `RepairResult` | `repaired`, `text`, `strategiesApplied`, `parseError`, `format` |
| `ValidationError` | `message`, `path`, `schemaPath`, `value` |
| `RepairReport` | `originalText`, `finalText`, `success`, `steps`, `parseError`, `format` |
| `StrategyEntry` | `name`, `description`, `apply` |
| `OutputGuardOptions` | `strategies`, `maxRepairAttempts`, `format` |

### Exceptions

| Exception | Description |
|---|---|
| `OutputGuardError` | Base exception |
| `ParseError` | Structured output could not be parsed even after repair |
| `SchemaValidationError` | Parsed data does not match the schema |
| `RepairError` | Repair was attempted but failed |

All types and exceptions are exported from the package entry point.

## Why outputguard?

| | `JSON.parse()` + regex | outputguard |
|---|---|---|
| Repair strategies | Roll your own | 15, tested and ordered |
| Input formats | JSON only | JSON, YAML, TOML, Python literals, auto-detect |
| Schema validation | Separate library | Built in (Ajv) |
| Retry prompts | Write your own | One function call |
| Retry orchestration | Write a custom loop | `guardedGenerate()` |
| Batch processing | Ad hoc scripts | `validateBatch()`, `repairBatch()`, CLI `batch` |
| Confidence scoring | No | Yes |
| Truncated JSON | Breaks | Recovers |
| LLM dependencies | -- | None (works with any provider) |
| Footprint | -- | Small dependency set: Ajv, ajv-formats, yaml, smol-toml |

outputguard has no opinion about which LLM you use. It operates on strings and schemas -- plug it into OpenAI, Anthropic, local models, or anything else.

## Also Available in Python

This is the TypeScript port. It tracks the original Python package's core API and structured-output format support:

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
