import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import {
  OutputGuard,
  ParseError,
  SchemaValidationError,
  SUPPORTED_FORMATS,
  parse,
  repair,
  retryPrompt,
  validate,
  validateAndRepair,
} from "../src/index.js";
import { repair as rawRepair } from "../src/repairer.js";

interface FormatCase {
  name: string;
  validObject: string;
  invalidObject: string;
  repairableObject: string;
  garbage: string;
  expectedRepairedText: string;
}

const FORMAT_CASES: FormatCase[] = [
  {
    name: "json",
    validObject: '{"name": "Alice", "age": 30}',
    invalidObject: '{"name": "Alice"}',
    repairableObject: '```json\n{"name": "Alice", "age": 30}\n```',
    garbage: "not json at all",
    expectedRepairedText: '{"name": "Alice", "age": 30}',
  },
  {
    name: "yaml",
    validObject: "name: Alice\nage: 30\n",
    invalidObject: "name: Alice\n",
    repairableObject: "```yaml\nname: Alice\nage: 30\n```",
    garbage: "name: [unterminated\n",
    expectedRepairedText: "name: Alice\nage: 30",
  },
  {
    name: "toml",
    validObject: 'name = "Alice"\nage = 30\n',
    invalidObject: 'name = "Alice"\n',
    repairableObject: '```toml\nname = "Alice"\nage = 30\n```',
    garbage: 'name = "Alice"\nage = \n',
    expectedRepairedText: 'name = "Alice"\nage = 30',
  },
  {
    name: "python",
    validObject: "{'name': 'Alice', 'age': 30}",
    invalidObject: "{'name': 'Alice'}",
    repairableObject: "```python\n{'name': 'Alice', 'age': 30}\n```",
    garbage: "{'name': 'Alice', 'age': }",
    expectedRepairedText: "{'name': 'Alice', 'age': 30}",
  },
];

const AUTO_CASES: Array<[string, string]> = [
  ["auto", FORMAT_CASES[0].validObject],
  ["auto", FORMAT_CASES[1].validObject],
  ["auto", FORMAT_CASES[2].validObject],
  ["auto", FORMAT_CASES[3].validObject],
  ["forced-json-off", FORMAT_CASES[1].validObject],
  ["forced-json-off", FORMAT_CASES[3].validObject],
];

const ALIAS_CASES: Array<[string, string]> = [
  ["yml", FORMAT_CASES[1].validObject],
  ["python-literal", FORMAT_CASES[3].validObject],
  ["literal", FORMAT_CASES[3].validObject],
];

const SIMPLE_SCHEMA = {
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

function runCli(args: string[], input?: string): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", ["dist/cli.js", ...args], {
      cwd: process.cwd(),
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

describe("format support", () => {
  for (const formatCase of FORMAT_CASES) {
    describe(formatCase.name, () => {
      it("validate accepts supported format", () => {
        const result = validate(formatCase.validObject, SIMPLE_SCHEMA, { format: formatCase.name });

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.data).toEqual({ name: "Alice", age: 30 });
        expect(result.format).toBe(formatCase.name);
      });

      it("validate reports schema errors", () => {
        const result = validate(formatCase.invalidObject, SIMPLE_SCHEMA, {
          format: formatCase.name,
        });

        expect(result.valid).toBe(false);
        expect(result.data).toEqual({ name: "Alice" });
        expect(result.errors.some(error => error.message.includes("age"))).toBe(true);
        expect(result.format).toBe(formatCase.name);
      });

      it("validate reports parse errors", () => {
        const result = validate(formatCase.garbage, SIMPLE_SCHEMA, { format: formatCase.name });

        expect(result.valid).toBe(false);
        expect(result.data).toBeNull();
        expect(result.errors[0].path).toBe("$");
        expect(result.format).toBe(formatCase.name);
      });

      it("repair handles fenced supported format", () => {
        const result = repair(formatCase.repairableObject, { format: formatCase.name });

        expect(result.repaired).toBe(true);
        expect(result.text).toBe(formatCase.expectedRepairedText);
        expect(result.strategiesApplied).toContain("strip_fences");
        expect(result.format).toBe(formatCase.name);
      });

      it("repair report handles supported format", () => {
        const { result, report } = rawRepair(formatCase.repairableObject, undefined, {
          report: true,
          format: formatCase.name,
        });

        expect(result.repaired).toBe(true);
        expect(report.success).toBe(true);
        expect(report.finalText).toBe(formatCase.expectedRepairedText);
        expect(report.format).toBe(formatCase.name);
      });

      it("validateAndRepair handles supported format", () => {
        const result = validateAndRepair(formatCase.repairableObject, SIMPLE_SCHEMA, {
          format: formatCase.name,
        });

        expect(result.valid).toBe(true);
        expect(result.repaired).toBe(true);
        expect(result.data).toEqual({ name: "Alice", age: 30 });
        expect(result.repairedText).toBe(formatCase.expectedRepairedText);
        expect(result.format).toBe(formatCase.name);
      });

      it("parse returns data", () => {
        const data = parse(formatCase.validObject, SIMPLE_SCHEMA, { format: formatCase.name });

        expect(data).toEqual({ name: "Alice", age: 30 });
      });

      it("parse raises ParseError", () => {
        expect(() => parse(formatCase.garbage, SIMPLE_SCHEMA, { format: formatCase.name }))
          .toThrow(ParseError);
      });

      it("parse raises SchemaValidationError", () => {
        expect(() => parse(formatCase.invalidObject, SIMPLE_SCHEMA, { format: formatCase.name }))
          .toThrow(SchemaValidationError);
      });

      it("OutputGuard instance default format", () => {
        const guard = new OutputGuard({ format: formatCase.name });

        expect(guard.validate(formatCase.validObject, SIMPLE_SCHEMA).valid).toBe(true);
        expect(guard.repair(formatCase.repairableObject).repaired).toBe(true);
        expect(guard.parse(formatCase.validObject, SIMPLE_SCHEMA)).toEqual({
          name: "Alice",
          age: 30,
        });
      });

      it("OutputGuard method format override", () => {
        const guard = new OutputGuard({ format: "json" });
        const result = guard.validate(formatCase.validObject, SIMPLE_SCHEMA, {
          format: formatCase.name,
        });

        expect(result.valid).toBe(true);
        expect(result.format).toBe(formatCase.name);
      });
    });
  }

  for (const [format, text] of AUTO_CASES) {
    it(`parses ${format} input`, () => {
      const result = validate(text, SIMPLE_SCHEMA, { format });

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ name: "Alice", age: 30 });
      expect(result.format).toBe(format);
    });
  }

  for (const [format, text] of ALIAS_CASES) {
    it(`parses documented alias ${format}`, () => {
      const result = validate(text, SIMPLE_SCHEMA, { format });

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ name: "Alice", age: 30 });
      expect(result.format).toBe(format);
    });
  }

  it("exports supported formats", () => {
    expect(new Set(SUPPORTED_FORMATS)).toEqual(
      new Set(["json", "yaml", "toml", "python", "auto", "forced-json-off"]),
    );
  });

  it("unsupported format raises", () => {
    expect(() => validate("{}", SIMPLE_SCHEMA, { format: "xml" })).toThrow(/Unsupported format/);
  });

  it("formatLabel for forced-json-off", async () => {
    const { formatLabel } = await import("../src/formats.js");
    expect(formatLabel("forced-json-off")).toBe("forced-JSON-off structured output");
  });

  it("formatLabel for auto", async () => {
    const { formatLabel } = await import("../src/formats.js");
    expect(formatLabel("auto")).toBe("structured output");
  });

  it("auto format fails with all parsers", async () => {
    const { parseDocument } = await import("../src/formats.js");
    // YAML parses bare strings, so we need something that breaks all parsers
    // A bare tab character in YAML is invalid
    expect(() => parseDocument("\t: [\t", "auto")).toThrow();
  });

  it("auto format validates invalid", () => {
    const result = validate("<<<not any format>>>", { type: "object" }, { format: "auto" });
    expect(result.valid).toBe(false);
  });

  describe("PythonLiteralParser edge cases", () => {
    it("parses tuples", () => {
      const result = validate("{'items': (1, 2, 3)}", { type: "object", properties: { items: { type: "array" } } }, { format: "python" });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ items: [1, 2, 3] });
    });

    it("parses string escape sequences", () => {
      const result = validate("{'a': 'tab\\there\\r\\n\\b\\f'}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
    });

    it("parses unicode escape in string", () => {
      const result = validate("{'a': '\\u0041'}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect((result.data as Record<string, string>).a).toBe("A");
    });

    it("rejects invalid unicode escape", () => {
      const result = validate("{'a': '\\uxyz0'}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(false);
    });

    it("parses positive number with + prefix", () => {
      const result = validate("{'a': +5}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect((result.data as Record<string, number>).a).toBe(5);
    });

    it("parses number with leading dot", () => {
      const result = validate("{'a': .5}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect((result.data as Record<string, number>).a).toBe(0.5);
    });

    it("parses numbers with underscores", () => {
      const result = validate("{'a': 1_000}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect((result.data as Record<string, number>).a).toBe(1000);
    });

    it("parses scientific notation", () => {
      const result = validate("{'a': 1e3}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect((result.data as Record<string, number>).a).toBe(1000);
    });

    it("rejects unknown identifier", () => {
      const result = validate("{'a': undefined}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(false);
    });

    it("rejects trailing content", () => {
      const result = validate("{'a': 1} extra", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(false);
    });

    it("rejects unterminated string", () => {
      const result = validate("{'a': 'unterminated", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(false);
    });

    it("handles empty dict", () => {
      const result = validate("{}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({});
    });

    it("handles empty list", () => {
      const result = validate("[]", { type: "array" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("handles empty tuple", () => {
      const result = validate("()", { type: "array" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("handles trailing comma in dict", () => {
      const result = validate("{'a': 1,}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
    });

    it("handles trailing comma in list", () => {
      const result = validate("[1, 2,]", { type: "array" }, { format: "python" });
      expect(result.valid).toBe(true);
    });

    it("parses None", () => {
      const result = validate("{'a': None}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      expect((result.data as Record<string, unknown>).a).toBeNull();
    });

    it("parses True and False", () => {
      const result = validate("{'a': True, 'b': False}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
      const data = result.data as Record<string, boolean>;
      expect(data.a).toBe(true);
      expect(data.b).toBe(false);
    });

    it("rejects invalid value start character", () => {
      const result = validate("{'a': @bad}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(false);
    });

    it("default escape passthrough in string", () => {
      const result = validate("{'a': '\\a'}", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(true);
    });

    it("handles unterminated escape at end of string", () => {
      const result = validate("{'a': 'val\\", { type: "object" }, { format: "python" });
      expect(result.valid).toBe(false);
    });
  });

  it("retry prompt names target format", () => {
    const result = validate("name: Alice\n", SIMPLE_SCHEMA, { format: "yaml" });
    const prompt = retryPrompt("name: Alice\n", SIMPLE_SCHEMA, result.errors, { format: "yaml" });

    expect(prompt).toContain("YAML");
    expect(prompt).toContain("age");
  });

  it("CLI retry prompt can omit message history", () => {
    const schemaPath = makeTempFile("outputguard-js-schema-", "schema.json", JSON.stringify(SIMPLE_SCHEMA));
    const inputPath = makeTempFile("outputguard-js-input-", "invalid.json", '{"name":"Sensitive Name"}');

    const result = runCli([
      "retry-prompt",
      inputPath,
      "-s",
      schemaPath,
      "--no-message-history",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("Original output:");
    expect(result.stdout).not.toContain("Sensitive Name");
    expect(result.stdout).toContain("age");
  });

  it("CLI validates supported formats", () => {
    const schemaPath = makeTempFile("outputguard-js-schema-", "schema.json", JSON.stringify(SIMPLE_SCHEMA));
    const inputPath = makeTempFile("outputguard-js-input-", "valid.yaml", FORMAT_CASES[1].validObject);

    const result = runCli(["validate", inputPath, "-s", schemaPath, "--input-format", "yaml"]);

    expect(result.status).toBe(0);
  });

  it("CLI repairs supported formats", () => {
    const inputPath = makeTempFile(
      "outputguard-js-input-",
      "repairable.toml",
      FORMAT_CASES[2].repairableObject,
    );

    const result = runCli(["repair", inputPath, "--input-format", "toml", "--format", "json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.repaired).toBe(true);
    expect(payload.format).toBe("toml");
  });
});
