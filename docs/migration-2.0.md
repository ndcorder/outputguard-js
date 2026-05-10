# Migration to 2.0

outputguard 2.0 keeps the JSON-first API intact and adds new structured-output
workflows. Most 1.x code does not need to change.

## What Stayed the Same

These calls still default to JSON:

```typescript
validate(text, schema);
repair(text);
validateAndRepair(text, schema);
parse(text, schema);
retryPrompt(text, schema, errors);
```

Existing JSON prompts and JSON Schema validation continue to work.

## What Changed

2.0 adds:

- `format` options for JSON, YAML, TOML, Python literals, `auto`, and
  `forced-json-off`.
- `guardedGenerate()`.
- `validateBatch()` and `repairBatch()`.
- `outputguard batch`.
- `includeMessageHistory: false` for retry prompts that should not repeat prior
  model output.

## Adopt Formats Gradually

Start by keeping existing JSON code unchanged. Add `format` only where prompts
return another structured format.

```typescript
const result = validateAndRepair(rawYaml, schema, { format: "yaml" });
```

## Replace Custom Retry Loops When Useful

If your application has a hand-written retry loop, you can keep it. If it only
does validation, repair, and retry prompt generation, consider replacing it with
`guardedGenerate()`.

```typescript
const result = await guardedGenerate({
  prompt,
  schema,
  maxRetries: 2,
  generate,
});
```

## Review Retry Prompt History

Before 2.0, retry prompts always included the previous output. That remains the
default. New code can opt out:

```typescript
const prompt = retryPrompt(raw, schema, errors, {
  includeMessageHistory: false,
});
```

Use the opt-out for large outputs, sensitive outputs, or chat systems that
already include prior messages separately.

## Use Batch APIs for Fixtures and Logs

If you have scripts that loop over saved outputs, move them to batch APIs:

```typescript
const batch = validateBatch(outputs, schema, { repair: true });
```

The summary gives counts for valid, invalid, repaired, parse failures, schema
failures, strategy usage, and formats.

## CLI Changes

Validation and repair commands accept `--input-format`. Batch validation is now
available:

```bash
outputguard batch outputs.json --schema schema.json --repair
```

Retry prompts can omit prior output:

```bash
outputguard retry-prompt response.txt --schema schema.json --no-message-history
```

## Migration Checklist

- Keep existing JSON calls unchanged.
- Add explicit `format` for non-JSON prompt contracts.
- Decide whether retry prompts should include previous output.
- Move eval fixtures or saved logs to `validateBatch()` or `outputguard batch`.
- Add tests around the exact formats your prompts request.

