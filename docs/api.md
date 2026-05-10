# API Guide

This guide lists the public functions most users need.

```typescript
import {
  validate,
  repair,
  validateAndRepair,
  parse,
  retryPrompt,
  guardedGenerate,
  validateBatch,
  repairBatch,
} from "outputguard";
```

## Choosing an API

| Use case | Function |
| --- | --- |
| Validate one output against a JSON Schema | `validate()` |
| Validate, repair if needed, then validate again | `validateAndRepair()` |
| Repair syntax without a schema | `repair()` |
| Parse valid schema-matching data or throw | `parse()` |
| Build a retry prompt from validation errors | `retryPrompt()` |
| Wrap an LLM generation function | `guardedGenerate()` |
| Validate many outputs against one schema | `validateBatch()` |
| Repair many outputs without a schema | `repairBatch()` |

## Minimal Schema Example

Validation APIs require a JSON Schema object.

```typescript
const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    score: { type: "number" },
  },
  required: ["name", "score"],
};
```

## Formats

Most APIs accept a `format` option. The default is `"json"`.

Supported values:

- `"json"`
- `"yaml"` or `"yml"`
- `"toml"`
- `"python-literal"`, `"python"`, `"py"`, or `"literal"`
- `"auto"`
- `"forced-json-off"` or `"forced_json_off"`

See [formats.md](formats.md) for detailed behavior.

## `validate()`

Use this when you only need a validity check.

```typescript
import { validate } from "outputguard";

const result = validate('{"name": "Ada", "score": 1}', schema);

if (result.valid) {
  console.log(result.data);
} else {
  for (const error of result.errors) {
    console.log(error.path, error.message);
  }
}
```

`validate()` returns a `ValidationResult` with:

- `valid`: whether the parsed data matches the schema.
- `data`: parsed data when parsing succeeds.
- `errors`: validation or parse errors.
- `repaired`: always `false` for validate-only calls.
- `strategiesApplied`: repair strategies used, if any.
- `originalText`: input text.
- `repairedText`: repaired text, if any.
- `format`: resolved input format.

## `validateAndRepair()`

Use this for the common path: validate one model output, repair it when needed,
and validate the repaired output against the same schema.

```typescript
import { validateAndRepair } from "outputguard";

const result = validateAndRepair("{name: 'Ada', score: 1,}", schema, {
  format: "json",
});

console.log(result.valid);
console.log(result.data);
console.log(result.repaired);
console.log(result.strategiesApplied);
```

If the original text is already valid, no repair is applied. If repair succeeds,
`repaired` is `true` and `repairedText` contains the repaired payload.

## `repair()`

Use this when you want schema-free syntax repair.

```typescript
import { repair } from "outputguard";

const result = repair("{'name': 'Ada', 'active': True}", {
  format: "python-literal",
});

console.log(result.repaired);
console.log(result.text);
console.log(result.parseError);
```

`repair()` returns a `RepairResult` with:

- `repaired`: whether the text changed.
- `text`: repaired or original text.
- `strategiesApplied`: strategy names that changed the text.
- `parseError`: parser error when repair cannot produce parseable data.
- `format`: resolved input format.

## `parse()`

Use this when invalid output should fail immediately.

```typescript
import { parse } from "outputguard";

const payload = parse('{"name": "Ada", "score": 1}', schema);
```

`parse()` validates, attempts repair if needed, returns parsed data, or throws
`ParseError` / `SchemaValidationError`.

## `retryPrompt()`

Use this after a validation failure when you own the retry loop.

```typescript
import { retryPrompt, validate } from "outputguard";

const result = validate(rawText, schema);
if (!result.valid) {
  const prompt = retryPrompt(rawText, schema, result.errors);
}
```

The returned string explains what failed and asks the model to try again with
schema-compatible structured output.

By default, the retry prompt includes the previous model output in an
`Original output:` section. Turn that off when the prior output is too large or
should not be sent back to the model:

```typescript
const prompt = retryPrompt(rawText, schema, result.errors, {
  includeMessageHistory: false,
});
```

## `guardedGenerate()`

Use this when you want outputguard to coordinate generation, validation, repair,
and retry in one call.

```typescript
import { guardedGenerate } from "outputguard";

const result = await guardedGenerate({
  prompt: "Return a YAML object with name and score.",
  schema,
  format: "yaml",
  maxRetries: 2,
  includeMessageHistory: false,
  generate: async (prompt, context) => {
    return callModel(prompt);
  },
});

console.log(result.valid);
console.log(result.data);
console.log(result.attempts);
```

See [guarded-generation.md](guarded-generation.md) for result fields and retry
behavior.

## Batch APIs

Use `validateBatch()` when you need validity and parsed data for many outputs.
Use `repairBatch()` when you need repaired text for many outputs without schema
validation.

```typescript
import { validateBatch, repairBatch } from "outputguard";

const validation = validateBatch(["{'name': 'Ada', 'score': 1}"], schema, {
  format: "python-literal",
});
const repairs = repairBatch(['{"name": "Ada",}']);
```

See [batch-processing.md](batch-processing.md) for result objects and CLI usage.

## Error Handling

outputguard throws package-specific exceptions for strict parse paths. The most
common 2.0 guarded-generation error is `GuardedGenerationError`, raised when
guarded generation cannot produce valid output within the retry budget and
`throwOnFailure: true`.

Use non-throwing result objects when you need to record failed attempts instead
of interrupting a pipeline.
