# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-05-11

### Added

- `retryPrompt(..., { includeMessageHistory: false })` for correction prompts
  that omit the previous model output.
- `guardedGenerate({ includeMessageHistory: false, ... })` for retry loops that
  do not include prior output in generated retry prompts.
- `outputguard retry-prompt --no-message-history` CLI flag.

## [2.0.0] - 2026-05-10

### Added

- Format-aware validation and repair for JSON, YAML, TOML, and Python literal
  outputs.
- Format aliases for common user input: `yaml`/`yml`, `python-literal`/`python`
  /`py`/`literal`, and `forced-json-off`/`forced_json_off`.
- `auto` format detection for mixed structured-output workflows.
- `forced-json-off` mode for prompts that explicitly prohibit JSON output.
- `guardedGenerate()` for wrapping LLM calls with generation, validation,
  optional repair, retry feedback, and attempt history.
- `GuardedGenerationError` for guarded generation runs that exhaust their retry
  budget when configured to throw.
- `validateBatch()` for validating many model outputs in one call.
- `repairBatch()` for repairing many model outputs in one call.
- `outputguard batch` CLI command for validating a JSON array of strings, with
  optional repair.
- Dedicated docs for formats, API choices, guarded generation, batch
  processing, and CLI usage.

### Changed

- JSON remains the default format, so existing 1.x calls continue to use the
  original JSON workflow unless a different `format` option is passed.
- README examples now show the main 2.0 workflows instead of only single-output
  JSON repair.
- Package metadata now advertises YAML, TOML, Python literal, batch, and
  forced-JSON-off support.
- Published package files now include the changelog and docs directory.
- Test coverage now includes format-specific behavior, guarded generation, batch
  APIs, and CLI batch behavior.

### Compatibility and Migration Notes

- Existing calls such as `validateAndRepair(text, schema)`, `repair(text)`,
  `validate(text, schema)`, and `parse(text, schema)` continue to default to
  JSON.
- To validate non-JSON output, pass `{ format: "yaml" }`, `{ format: "toml" }`,
  `{ format: "python-literal" }`, `{ format: "auto" }`, or
  `{ format: "forced-json-off" }`.
- Guarded generation does not add an LLM provider dependency. Pass your own
  generation function.
- Batch CLI input must be a JSON array of strings. Use `--input-format` to
  choose how each item should be interpreted.
- For CI and evals, prefer explicit formats and schema validation so invalid
  outputs fail loudly.

### Verification

- TypeScript tests: 1,180 passing.
- Static checks: `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## [1.0.0] - 2026-05-09

### Added

- Initial TypeScript release of outputguard.
- JSON Schema validation, repair strategies, retry prompt generation, and CLI.
