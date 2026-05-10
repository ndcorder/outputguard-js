# Guarded Generation Guide

Guarded generation wraps your LLM call with outputguard. You provide the model
function. outputguard validates the response against your schema, optionally
repairs it, and retries with structured feedback when the output is still
invalid.

## When to Use It

Use guarded generation when:

- A downstream system expects schema-compatible structured data.
- You want retry attempts to include validation feedback.
- You need a record of each generation attempt.
- You want one reusable wrapper around different model providers.

Use lower-level APIs such as `validateAndRepair()` when you already have the
model output and do not need outputguard to call the model.

## Generator Signature

Your generator receives the current prompt and a context object. It may return a
string or a promise for a string.

```typescript
const generate = (prompt: string, context: GuardedGenerateContext) => {
  return "...";
};
```

The context contains:

- `attempt`: zero-based attempt number.
- `prompt`: the prompt for this attempt.
- `previousText`: previous raw or repaired text, if any.
- `previousResult`: previous validation result, if any.

## Example

```typescript
import { guardedGenerate } from "outputguard";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    score: { type: "number" },
  },
  required: ["name", "score"],
};

const result = await guardedGenerate({
  prompt: "Return a JSON object with name and score.",
  schema,
  format: "json",
  maxRetries: 2,
  generate: async (prompt, context) => {
    return client.responses.create({
      model: "example-model",
      input: prompt,
    }).then(response => response.output_text);
  },
});

console.log(result.valid);
console.log(result.data);
```

## What outputguard Does Per Attempt

For each attempt, outputguard:

1. Calls your `generate` function with the prompt and context.
2. Validates the model output using the selected format and schema.
3. Repairs the output when `repair: true`.
4. Parses the repaired output into JavaScript data.
5. Stops on success or prepares feedback for the next attempt.

The original prompt remains yours. outputguard only builds retry feedback when
an attempt fails validation or repair.

## Result Fields

`guardedGenerate()` returns `GuardedGenerateResult`.

Common fields:

- `valid`: whether valid parsed data was produced.
- `data`: parsed data when generation succeeds, otherwise `null`.
- `text`: final raw or repaired text.
- `attempts`: per-attempt records.
- `errors`: final validation errors when generation fails.
- `repaired`: whether any attempt required repair.
- `strategiesApplied`: unique repair strategies used across attempts.
- `exhausted`: whether all retries were used.
- `format`: requested or resolved format.

Attempt records include the attempt number, prompt, raw model text, and
`ValidationResult`.

## Failure Behavior

If generation fails after all attempts, you have two choices:

- Set `throwOnFailure: true` to throw `GuardedGenerationError`.
- Set `throwOnFailure: false` to receive a failed result object with attempt
  history.

Use throwing behavior for request/response paths where invalid data cannot
continue. Use non-throwing behavior for batch jobs, evals, and logging.

## Repair Behavior

`repair: true` is useful for normal LLM output, where small syntax mistakes are
common. `repair: false` is useful when you want failed attempts to produce
direct validation feedback instead of repaired output.

Guarded generation validates against your schema either way.

## Observing Attempts

Use `onAttempt` to log each attempt.

```typescript
const result = await guardedGenerate({
  prompt: "Return a JSON object with name and score.",
  schema,
  generate: async prompt => callModel(prompt),
  onAttempt: attempt => {
    console.log(attempt.attempt, attempt.result.valid);
  },
});
```

