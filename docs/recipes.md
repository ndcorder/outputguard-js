# Recipes

These recipes are small patterns you can paste into an application and adapt.

## Validate and Repair One Response

```typescript
const result = validateAndRepair(rawOutput, schema);

if (result.valid) {
  return result.data;
}

throw new Error(JSON.stringify(result.errors));
```

Use this when you want one best effort repair before failing.

## Repair Without a Schema

```typescript
const result = repair(rawOutput);

if (result.parseError) {
  logParseFailure(result.parseError);
} else {
  saveText(result.text);
}
```

Use this for cleanup jobs where you do not have a JSON Schema yet.

## Retry Without Repeating the Original Output

```typescript
const result = validateAndRepair(rawOutput, schema);

if (!result.valid) {
  const prompt = retryPrompt(rawOutput, schema, result.errors, {
    includeMessageHistory: false,
  });
}
```

Use this when the previous output is too large or should not be sent back to the
model.

## Custom Retry Loop

```typescript
let prompt = "Return a JSON object with name and age.";

for (let attempt = 0; attempt < 3; attempt++) {
  const raw = await llm.generate(prompt);
  const result = validateAndRepair(raw, schema);
  if (result.valid) {
    return result.data;
  }
  prompt = retryPrompt(raw, schema, result.errors);
}

throw new Error("Model did not return valid structured output");
```

Use this when you need full control over model calls, tracing, or backoff.

## Guarded Generation Loop

```typescript
const result = await guardedGenerate({
  prompt: "Return a JSON object with name and age.",
  schema,
  maxRetries: 2,
  includeMessageHistory: false,
  generate: async prompt => llm.generate(prompt),
});
```

Use this when you want outputguard to manage retry prompts and attempt history.

## YAML Output

```typescript
const result = validateAndRepair(rawYaml, schema, {
  format: "yaml",
});
```

Use this when the model prompt asks for YAML. Do not rely on `auto` if your
prompt contract is known.

## Forced JSON Off

```typescript
const result = validateAndRepair(rawOutput, schema, {
  format: "forced-json-off",
});
```

Use this when the model or provider setting explicitly disallows JSON mode.

## Validate an Eval Fixture

```typescript
const batch = validateBatch(outputs, schema, { repair: true });

expect(batch.summary.invalid).toBe(0);
```

Use this in tests to prevent prompt changes from breaking structured output.

## CLI in CI

```bash
outputguard batch outputs.json --schema schema.json --repair --format json
```

The command exits non-zero when any item is invalid after repair.

## Log Failed Attempts

```typescript
const result = await guardedGenerate({
  prompt,
  schema,
  maxRetries: 2,
  generate,
});

for (const attempt of result.attempts) {
  logger.info("structured_output_attempt", {
    attempt: attempt.attempt,
    valid: attempt.result.valid,
    errors: attempt.result.errors.map(error => error.message),
  });
}
```

Use attempt logs to improve prompts and compare model behavior.

