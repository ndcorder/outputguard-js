# Getting Started

This guide takes you from installation to a production-shaped retry loop. It
uses JSON because JSON is the default, then shows where to add formats, CLI
usage, and guarded generation.

## 1. Install

```bash
npm install outputguard
```

Other package managers:

```bash
pnpm add outputguard
yarn add outputguard
bun add outputguard
```

The package is ESM-only and requires Node.js 18 or newer.

## 2. Start With a Schema

Validation APIs use JSON Schema. The schema describes the parsed data you want,
not the exact text the model should return.

```typescript
const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
  },
  required: ["name", "age"],
};
```

## 3. Validate Good Output

```typescript
import { validate } from "outputguard";

const result = validate('{"name": "Ada", "age": 30}', schema);

if (result.valid) {
  console.log(result.data);
}
```

`validate()` parses the text, validates the parsed data against the schema, and
returns a `ValidationResult`. It does not repair anything.

## 4. Repair Common Model Mistakes

Models often return almost-valid structured output:

```typescript
import { validateAndRepair } from "outputguard";

const raw = "```json\n{name: 'Ada', age: 30,}\n```";

const result = validateAndRepair(raw, schema);

if (result.valid) {
  console.log(result.data);
  console.log(result.strategiesApplied);
}
```

`validateAndRepair()` first validates the raw text. If it fails, outputguard
applies repair strategies and validates the repaired text.

## 5. Decide How Strict You Want to Be

Use the result object when failures are expected and should be logged:

```typescript
const result = validateAndRepair(raw, schema);
if (!result.valid) {
  logErrors(result.errors);
}
```

Use `parse()` when invalid output should throw:

```typescript
import { parse } from "outputguard";

const data = parse(raw, schema);
```

`parse()` is useful at boundaries where the application cannot continue without
schema-compatible data.

## 6. Generate a Retry Prompt

When repair is not enough, send the model a targeted correction prompt:

```typescript
import { retryPrompt } from "outputguard";

const result = validateAndRepair(raw, schema);

if (!result.valid) {
  const prompt = retryPrompt(raw, schema, result.errors);
}
```

By default the retry prompt includes the previous model output. Omit it when the
output is too large or should not be sent back:

```typescript
const prompt = retryPrompt(raw, schema, result.errors, {
  includeMessageHistory: false,
});
```

## 7. Wrap the Whole Generation Loop

`guardedGenerate()` calls your model function, validates the result, optionally
repairs it, and retries with validation feedback.

```typescript
import { guardedGenerate } from "outputguard";

const result = await guardedGenerate({
  prompt: "Return a JSON object with name and age.",
  schema,
  maxRetries: 2,
  generate: async prompt => llm.generate(prompt),
});

if (result.valid) {
  useUser(result.data);
} else {
  logFailedAttempts(result.attempts);
}
```

## 8. Use Non-JSON Formats Explicitly

JSON remains the default. Pass `format` when the prompt asks for YAML, TOML, or
Python literal output.

```typescript
const result = validateAndRepair("name: Ada\nage: 30\n", schema, {
  format: "yaml",
});
```

Use `format: "auto"` for mixed historical data. Prefer explicit formats for new
prompts because failures are easier to understand.

## 9. Try the CLI

Create `schema.json` and `response.txt`, then run:

```bash
outputguard validate response.txt --schema schema.json --repair
```

Generate a retry prompt:

```bash
outputguard retry-prompt response.txt --schema schema.json
```

Omit the original output from that retry prompt:

```bash
outputguard retry-prompt response.txt --schema schema.json --no-message-history
```

## 10. Where to Go Next

- Use [API guide](api.md) for exact function signatures and result fields.
- Use [Formats guide](formats.md) when prompts return YAML, TOML, or Python
  literals.
- Use [Guarded generation guide](guarded-generation.md) for production retry
  loops.
- Use [Recipes](recipes.md) for copy-paste patterns.
- Use [Troubleshooting](troubleshooting.md) when a model output still fails.

