import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { repairBatch, validateBatch } from "../src/index.js";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
  },
  required: ["name", "age"],
};

function makeTempFile(prefix: string, suffix: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const filePath = join(dir, suffix);
  writeFileSync(filePath, content);
  return filePath;
}

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", ["dist/cli.js", ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

describe("batch helpers", () => {
  it("validates many outputs and summarizes validity, repair, and failures", () => {
    const batch = validateBatch([
      '{"name":"Alice","age":30}',
      '```json\n{"name":"Bob","age":31}\n```',
      '{"name":"Carol"}',
      "not structured output",
    ], schema, { repair: true });

    expect(batch.summary).toEqual({
      total: 4,
      valid: 2,
      invalid: 2,
      repaired: 1,
      parseFailures: 1,
      schemaFailures: 1,
      successRate: 0.5,
      strategyCounts: { strip_fences: 1 },
      formats: { json: 4 },
    });
    expect(batch.results.map(result => result.index)).toEqual([0, 1, 2, 3]);
    expect(batch.results[1].repairedText).toBe('{"name":"Bob","age":31}');
    expect(batch.results[2].errors.some(error => error.message.includes("age"))).toBe(true);
  });

  it("can validate auto-detected mixed formats", () => {
    const batch = validateBatch([
      '{"name":"Alice","age":30}',
      "name: Bob\nage: 31\n",
      "{'name': 'Carol', 'age': 32}",
    ], schema, { format: "auto" });

    expect(batch.summary.valid).toBe(3);
    expect(batch.summary.invalid).toBe(0);
    expect(batch.summary.formats).toEqual({ auto: 3 });
    expect(batch.results.map(result => result.data)).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 31 },
      { name: "Carol", age: 32 },
    ]);
  });

  it("repairs many outputs and tracks strategy counts", () => {
    const batch = repairBatch([
      '{"name":"Alice","age":30}',
      '```json\n{"name":"Bob","age":31}\n```',
      "{name:'Carol', age:32,}",
      "not structured output",
    ]);

    expect(batch.summary.total).toBe(4);
    expect(batch.summary.valid).toBe(3);
    expect(batch.summary.invalid).toBe(1);
    expect(batch.summary.repaired).toBe(2);
    expect(batch.summary.strategyCounts).toMatchObject({
      strip_fences: 1,
      fix_commas: 1,
      fix_quotes: 1,
      fix_keys: 1,
    });
    expect(batch.results[0].index).toBe(0);
    expect(batch.results[3].parseError).not.toBeNull();
  });

  it("CLI validates a JSON array of outputs in batch mode", () => {
    const schemaPath = makeTempFile("outputguard-js-schema-", "schema.json", JSON.stringify(schema));
    const inputPath = makeTempFile(
      "outputguard-js-batch-",
      "outputs.json",
      JSON.stringify([
        '{"name":"Alice","age":30}',
        '```json\n{"name":"Bob","age":31}\n```',
        '{"name":"Carol"}',
      ]),
    );

    const result = runCli([
      "batch",
      inputPath,
      "-s",
      schemaPath,
      "--repair",
      "--format",
      "json",
    ]);

    expect(result.status).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary).toMatchObject({
      total: 3,
      valid: 2,
      invalid: 1,
      repaired: 1,
    });
    expect(payload.results[1].repairedText).toBe('{"name":"Bob","age":31}');
  });
});
