# CLI Guide

The `outputguard` command validates and repairs structured output from files or
stdin. The CLI is organized around subcommands.

## Install

```bash
npm install outputguard
```

## Validate

Validate one output against a JSON Schema file:

```bash
outputguard validate response.txt --schema schema.json
```

Validate and repair if needed:

```bash
outputguard validate response.txt --schema schema.json --repair
```

Use a non-JSON format:

```bash
outputguard validate response.yaml --schema schema.json --input-format yaml
```

Read from stdin:

```bash
cat response.txt | outputguard validate - --schema schema.json
```

## Repair

Repair one output without schema validation:

```bash
outputguard repair response.txt
```

Inspect repairs:

```bash
outputguard repair response.txt --diff
outputguard repair response.txt --verbose
```

Emit machine-readable JSON:

```bash
outputguard repair response.txt --format json
```

## Retry Prompt

Generate feedback for an invalid output:

```bash
outputguard retry-prompt response.txt --schema schema.json
```

## Batch

The batch command reads a JSON array of strings and validates each item against
one JSON Schema.

```bash
outputguard batch outputs.json --schema schema.json --input-format auto
outputguard batch outputs.json --schema schema.json --repair --input-format json
```

Emit machine-readable JSON:

```bash
outputguard batch outputs.json --schema schema.json --repair --format json
```

## Strategies and Version

```bash
outputguard strategies
outputguard version
```

## Common Flags

| Flag | Meaning |
| --- | --- |
| `--schema`, `-s` | JSON Schema file path for validation commands |
| `--repair` | Attempt repair before final validation |
| `--input-format` | Input format: `json`, `yaml`, `toml`, `python`, `auto`, or `forced-json-off` |
| `--format` | CLI output format: `text` or `json` |
| `--quiet` | Suppress non-essential validation output |
| `--diff` | Show a repair diff |
| `--verbose` | Show per-strategy repair details |
| `--strategies` | Comma-separated repair strategy names for `repair` |

Run `outputguard --help` for the exact options supported by the installed
version.

## Exit Codes

The CLI uses conventional exit codes:

- `0`: command completed successfully and validation passed when applicable.
- `1`: validation or repair failed.
- `2`: command usage or input shape was invalid.

For automation, inspect both the exit code and `--format json` output when using
validation or batch commands.

## Format Notes

JSON is the default. Pass `--input-format` whenever the prompt expected another
format. Use `auto` for mixed historical output and `forced-json-off` when the
prompt explicitly told the model not to return JSON.

