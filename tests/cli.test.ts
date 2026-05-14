import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  parseArgs,
  getVersion,
  readInput,
  printHelp,
  cmdValidate,
  cmdRepair,
  cmdRetryPrompt,
  cmdBatch,
  cmdStrategies,
} from "../src/cli.js";

const SIMPLE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
  },
  required: ["name", "age"],
};

function tmpFile(name: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "cli-test-"));
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

function tmpSchemaAndInput(
  schema: unknown,
  input: string,
): { schemaPath: string; inputPath: string } {
  const schemaPath = tmpFile("schema.json", JSON.stringify(schema));
  const inputPath = tmpFile("input.json", input);
  return { schemaPath, inputPath };
}

describe("parseArgs", () => {
  it("parses command and positional args", () => {
    const result = parseArgs(["validate", "input.json"]);
    expect(result.command).toBe("validate");
    expect(result.args).toEqual(["input.json"]);
    expect(result.flags).toEqual({});
  });

  it("parses --flag=value", () => {
    const result = parseArgs(["cmd", "--format=json"]);
    expect(result.flags.format).toBe("json");
  });

  it("parses --flag value", () => {
    const result = parseArgs(["cmd", "--schema", "s.json"]);
    expect(result.flags.schema).toBe("s.json");
  });

  it("parses --boolean-flag", () => {
    const result = parseArgs(["cmd", "--repair"]);
    expect(result.flags.repair).toBe(true);
  });

  it("parses --flag followed by another --flag as boolean", () => {
    const result = parseArgs(["cmd", "--repair", "--quiet"]);
    expect(result.flags.repair).toBe(true);
    expect(result.flags.quiet).toBe(true);
  });

  it("parses -s value (short flag)", () => {
    const result = parseArgs(["cmd", "-s", "schema.json"]);
    expect(result.flags.s).toBe("schema.json");
  });

  it("parses -q as boolean (short flag with no value)", () => {
    const result = parseArgs(["cmd", "-q"]);
    expect(result.flags.q).toBe(true);
  });

  it("parses short flag followed by another flag as boolean", () => {
    const result = parseArgs(["cmd", "-q", "--repair"]);
    expect(result.flags.q).toBe(true);
    expect(result.flags.repair).toBe(true);
  });

  it("handles empty argv", () => {
    const result = parseArgs([]);
    expect(result.command).toBe("");
    expect(result.args).toEqual([]);
  });
});

describe("getVersion", () => {
  it("returns a semver string", () => {
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("readInput", () => {
  it("reads from file path", () => {
    const path = tmpFile("test.json", '{"ok": true}');
    expect(readInput(path)).toBe('{"ok": true}');
  });
});

describe("printHelp", () => {
  it("prints help text", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    printHelp();
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain("outputguard");
    spy.mockRestore();
  });
});

describe("cmdValidate", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("returns 2 when missing input", async () => {
    expect(await cmdValidate([], {})).toBe(2);
  });

  it("returns 2 when missing schema", async () => {
    const inputPath = tmpFile("i.json", "{}");
    expect(await cmdValidate([inputPath], {})).toBe(2);
  });

  it("returns 0 for valid input", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice", "age": 30}',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath })).toBe(0);
  });

  it("returns 0 for valid input (quiet)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice", "age": 30}',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, quiet: true })).toBe(0);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("returns 1 for invalid input", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice"}',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath })).toBe(1);
  });

  it("returns 1 for invalid input (quiet)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice"}',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, quiet: true })).toBe(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("returns JSON format for valid input", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice", "age": 30}',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, format: "json" })).toBe(0);
    const out = JSON.parse(logSpy.mock.calls[0][0]);
    expect(out.valid).toBe(true);
  });

  it("returns JSON format for invalid input", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice"}',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, format: "json" })).toBe(1);
  });

  it("validates and repairs (valid after repair)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '```json\n{"name": "Alice", "age": 30}\n```',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true })).toBe(0);
  });

  it("validates and repairs (already valid)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice", "age": 30}',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true })).toBe(0);
  });

  it("validates and repairs (repair failed)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      "not json at all",
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true })).toBe(1);
  });

  it("validates and repairs (repair failed, quiet)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      "not json at all",
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true, quiet: true })).toBe(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("validates and repairs with JSON format", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '```json\n{"name": "Alice", "age": 30}\n```',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true, format: "json" })).toBe(0);
    const out = JSON.parse(logSpy.mock.calls[0][0]);
    expect(out.valid).toBe(true);
    expect(out.repaired).toBe(true);
  });

  it("validates and repairs with JSON format (failed)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      "not json at all",
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true, format: "json" })).toBe(1);
  });

  it("shows diff on repair", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '```json\n{"name": "Alice", "age": 30}\n```',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true, diff: true })).toBe(0);
    const output = logSpy.mock.calls.map(c => c[0]).join("\n");
    expect(output).toContain("Diff");
  });

  it("shows verbose on repair", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '```json\n{"name": "Alice", "age": 30}\n```',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true, verbose: true })).toBe(0);
    const output = logSpy.mock.calls.map(c => c[0]).join("\n");
    expect(output).toContain("Steps");
    expect(output).toContain("Confidence");
  });

  it("shows diff and verbose on repair (quiet suppresses header)", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '```json\n{"name": "Alice", "age": 30}\n```',
    );
    expect(await cmdValidate([inputPath], { s: schemaPath, repair: true, diff: true, verbose: true, quiet: true })).toBe(0);
  });
});

describe("cmdRepair", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("returns 2 when missing input", async () => {
    expect(await cmdRepair([], {})).toBe(2);
  });

  it("repairs fenced JSON", async () => {
    const inputPath = tmpFile("r.json", '```json\n{"a":1}\n```');
    expect(await cmdRepair([inputPath], {})).toBe(0);
  });

  it("repairs with JSON output format", async () => {
    const inputPath = tmpFile("r.json", '```json\n{"a":1}\n```');
    expect(await cmdRepair([inputPath], { format: "json" })).toBe(0);
    const out = JSON.parse(logSpy.mock.calls[0][0]);
    expect(out.repaired).toBe(true);
  });

  it("reports failure", async () => {
    const inputPath = tmpFile("r.json", "not json");
    expect(await cmdRepair([inputPath], {})).toBe(1);
  });

  it("reports failure with parseError", async () => {
    const inputPath = tmpFile("r.json", "{{{");
    expect(await cmdRepair([inputPath], {})).toBe(1);
    const output = errSpy.mock.calls.map(c => c[0]).join("\n");
    expect(output).toContain("Could not repair");
  });

  it("repairs with diff", async () => {
    const inputPath = tmpFile("r.json", '```json\n{"a":1}\n```');
    expect(await cmdRepair([inputPath], { diff: true })).toBe(0);
    const output = logSpy.mock.calls.map(c => c[0]).join("\n");
    expect(output).toContain("Diff");
  });

  it("repairs with verbose", async () => {
    const inputPath = tmpFile("r.json", '```json\n{"a":1}\n```');
    expect(await cmdRepair([inputPath], { verbose: true })).toBe(0);
    const output = logSpy.mock.calls.map(c => c[0]).join("\n");
    expect(output).toContain("Steps");
    expect(output).toContain("Confidence");
  });

  it("repairs with diff and JSON output", async () => {
    const inputPath = tmpFile("r.json", '```json\n{"a":1}\n```');
    expect(await cmdRepair([inputPath], { diff: true, format: "json" })).toBe(0);
  });

  it("fails with diff and JSON output", async () => {
    const inputPath = tmpFile("r.json", "not json");
    expect(await cmdRepair([inputPath], { diff: true, format: "json" })).toBe(1);
  });

  it("fails with diff (text output, with parseError)", async () => {
    const inputPath = tmpFile("r.json", "{{{");
    expect(await cmdRepair([inputPath], { diff: true })).toBe(1);
  });

  it("accepts --strategies flag", async () => {
    const inputPath = tmpFile("r.json", '```json\n{"a":1}\n```');
    expect(await cmdRepair([inputPath], { strategies: "strip_fences" })).toBe(0);
  });

  it("repairs with JSON output format (failure)", async () => {
    const inputPath = tmpFile("r.json", "not json");
    expect(await cmdRepair([inputPath], { format: "json" })).toBe(1);
  });
});

describe("cmdRetryPrompt", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("returns 2 when missing input", async () => {
    expect(await cmdRetryPrompt([], {})).toBe(2);
  });

  it("returns 2 when missing schema", async () => {
    const inputPath = tmpFile("i.json", "{}");
    expect(await cmdRetryPrompt([inputPath], {})).toBe(2);
  });

  it("returns 0 when already valid", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice", "age": 30}',
    );
    expect(await cmdRetryPrompt([inputPath], { s: schemaPath })).toBe(0);
    expect(logSpy.mock.calls[0][0]).toContain("Already valid");
  });

  it("returns 0 with retry prompt for invalid", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Alice"}',
    );
    expect(await cmdRetryPrompt([inputPath], { s: schemaPath })).toBe(0);
    expect(logSpy.mock.calls[0][0]).toContain("age");
  });

  it("supports --no-message-history", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(
      SIMPLE_SCHEMA,
      '{"name": "Secret"}',
    );
    expect(await cmdRetryPrompt([inputPath], { s: schemaPath, "no-message-history": true })).toBe(0);
    const output = logSpy.mock.calls[0][0];
    expect(output).not.toContain("Secret");
  });
});

describe("cmdBatch", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("returns 2 when missing input", async () => {
    expect(await cmdBatch([], {})).toBe(2);
  });

  it("returns 2 when missing schema", async () => {
    const inputPath = tmpFile("b.json", "[]");
    expect(await cmdBatch([inputPath], {})).toBe(2);
  });

  it("returns 2 for non-array input", async () => {
    const { schemaPath, inputPath } = tmpSchemaAndInput(SIMPLE_SCHEMA, '{"not": "array"}');
    expect(await cmdBatch([inputPath], { s: schemaPath })).toBe(2);
  });

  it("returns 2 for array of non-strings", async () => {
    const { schemaPath } = tmpSchemaAndInput(SIMPLE_SCHEMA, "");
    const inputPath = tmpFile("b.json", "[1, 2, 3]");
    expect(await cmdBatch([inputPath], { s: schemaPath })).toBe(2);
  });

  it("returns 0 for all valid", async () => {
    const batch = ['{"name": "Alice", "age": 30}', '{"name": "Bob", "age": 25}'];
    const { schemaPath } = tmpSchemaAndInput(SIMPLE_SCHEMA, "");
    const inputPath = tmpFile("b.json", JSON.stringify(batch));
    expect(await cmdBatch([inputPath], { s: schemaPath })).toBe(0);
  });

  it("returns 1 for some invalid", async () => {
    const batch = ['{"name": "Alice", "age": 30}', '{"name": "Bob"}'];
    const { schemaPath } = tmpSchemaAndInput(SIMPLE_SCHEMA, "");
    const inputPath = tmpFile("b.json", JSON.stringify(batch));
    expect(await cmdBatch([inputPath], { s: schemaPath })).toBe(1);
  });

  it("returns JSON format", async () => {
    const batch = ['{"name": "Alice", "age": 30}'];
    const { schemaPath } = tmpSchemaAndInput(SIMPLE_SCHEMA, "");
    const inputPath = tmpFile("b.json", JSON.stringify(batch));
    expect(await cmdBatch([inputPath], { s: schemaPath, format: "json" })).toBe(0);
    const out = JSON.parse(logSpy.mock.calls[0][0]);
    expect(out.summary.total).toBe(1);
  });

  it("returns JSON format with invalid", async () => {
    const batch = ['{"name": "Alice"}'];
    const { schemaPath } = tmpSchemaAndInput(SIMPLE_SCHEMA, "");
    const inputPath = tmpFile("b.json", JSON.stringify(batch));
    expect(await cmdBatch([inputPath], { s: schemaPath, format: "json" })).toBe(1);
  });

  it("shows repair count", async () => {
    const batch = ['```json\n{"name": "Alice", "age": 30}\n```'];
    const { schemaPath } = tmpSchemaAndInput(SIMPLE_SCHEMA, "");
    const inputPath = tmpFile("b.json", JSON.stringify(batch));
    expect(await cmdBatch([inputPath], { s: schemaPath, repair: true })).toBe(0);
    const output = logSpy.mock.calls.map(c => c[0]).join("\n");
    expect(output).toContain("Repaired");
  });
});

describe("cmdStrategies", () => {
  it("lists strategies", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await cmdStrategies()).toBe(0);
    const output = logSpy.mock.calls.map(c => c[0]).join("\n");
    expect(output).toContain("strip_fences");
    expect(output).toContain("strategies available");
    logSpy.mockRestore();
  });
});
