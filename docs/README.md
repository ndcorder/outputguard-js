# outputguard Documentation

This directory contains the detailed guides for the TypeScript package. The
README gives a quick overview; these pages spell out the behavior you need when
wiring outputguard into an application, an eval pipeline, or a command-line
workflow.

## Start Here

- [API guide](api.md) explains which function to call and what each result
  object contains.
- [Formats guide](formats.md) explains supported input formats, format aliases,
  auto detection, and JSON compatibility.
- [Guarded generation guide](guarded-generation.md) explains how to wrap an LLM
  call with validation, repair, retry, and failure reporting.
- [Batch processing guide](batch-processing.md) explains the TypeScript batch
  APIs and the `outputguard batch` command.
- [CLI guide](cli.md) lists commands, flags, input shapes, output behavior, and
  exit codes.
- [2.0 implementation plan](2.0-plan.md) records the design and verification
  checklist used for the 2.0 release.

## Version 2.0 in One Page

outputguard 2.0 expands the project from JSON repair into a small structured
output guardrail toolkit. JSON remains the default. Existing calls such as
`validateAndRepair(text, schema)` still behave as JSON workflows unless you pass
a different `format`.

New 2.0 capabilities:

- Validate and repair JSON, YAML, TOML, and Python literals.
- Use `auto` when a pipeline receives mixed structured-output formats.
- Use `forced-json-off` when the model was explicitly told not to produce JSON.
- Wrap a model call with `guardedGenerate()`.
- Process many outputs with `validateBatch()` and `repairBatch()`.
- Run batch validation or repair from the CLI with `outputguard batch`.

## Compatibility Notes

- JSON is still the default format.
- The package does not call an LLM provider directly. You pass your own function
  to guarded generation.
- outputguard repairs syntax and common structural problems. It does not infer
  your product schema unless you validate the parsed result yourself.
- The package is ESM-only and requires Node.js 18 or newer.

