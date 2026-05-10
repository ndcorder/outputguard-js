# Batch Processing Guide

Batch processing is for validating or repairing many model outputs at once. It
is useful for evals, saved logs, migration audits, and CI checks.

## Validate a Batch

```typescript
import { validateBatch } from "outputguard";

const results = validateBatch(
  [
    '{"name": "Ada", "score": 1}',
    "{'name': 'Grace', 'score': 2}",
  ],
  schema,
  { format: "auto" },
);

for (const item of results.results) {
  console.log(item.index, item.valid, item.format);
}
```

The validation result includes:

- `results`: one result per input.
- `summary`: counts for valid, invalid, repaired, and failed items.

## Validate and Repair a Batch

Pass `repair: true` when each item should be repaired before the final schema
validation result is reported.

```typescript
const results = validateBatch(outputs, schema, {
  repair: true,
  format: "json",
});
```

This is the batch equivalent of `validateAndRepair()`.

## Repair a Batch Without a Schema

```typescript
import { repairBatch } from "outputguard";

const results = repairBatch(
  [
    '{"name": "Ada",}',
    "{name: 'Grace'}",
  ],
  { format: "json" },
);

for (const item of results.results) {
  console.log(item.index, item.text, item.parseError);
}
```

The repair result includes repaired text and parse status for each item.

## Batch Summary

`BatchSummary` contains:

- `total`: number of inputs.
- `valid`: number of valid or parseable outputs.
- `invalid`: number of failed outputs.
- `repaired`: number of outputs changed by repair.
- `parseFailures`: number of outputs that could not be parsed.
- `schemaFailures`: number of parsed outputs that failed the schema.
- `successRate`: valid divided by total, rounded to three decimals.
- `strategyCounts`: repair strategy usage counts.
- `formats`: resolved format counts.

## Choosing a Format

Use a specific format when every item should follow the same contract:

```typescript
validateBatch(outputs, schema, { format: "json" });
```

Use `auto` when the source can contain mixed formats:

```typescript
validateBatch(outputs, schema, { format: "auto" });
```

Auto detection is helpful for audits, but explicit formats are better for
production prompts because they make failures easier to interpret.

## CLI Input Shape

The batch CLI reads a JSON array of strings and validates each item against a
schema.

```json
[
  "{\"name\": \"Ada\",}",
  "{name: 'Grace'}"
]
```

Pass that file to `outputguard batch`:

```bash
outputguard batch outputs.json --schema schema.json --repair --input-format json
```

See [cli.md](cli.md) for flags and exit codes.

## Practical Workflows

Common batch workflows:

- Run nightly checks against saved model outputs.
- Validate prompt changes against an eval fixture.
- Repair historical logs before loading them into an analysis tool.
- Fail CI when a prompt fixture produces invalid structured data.

For CI, prefer explicit formats and schema validation.

