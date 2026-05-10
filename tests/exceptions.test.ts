import {
  OutputGuardError,
  ParseError,
  SchemaValidationError,
  RepairError,
} from "../src/exceptions.js";

describe("TestExceptions", () => {
  it("parse error", () => {
    const err = new ParseError("could not parse", "bad json", "Expecting value");
    expect(err).toBeInstanceOf(OutputGuardError);
    expect(err.originalText).toBe("bad json");
    expect(err.parseError).toBe("Expecting value");
    expect(String(err)).toContain("could not parse");
  });

  it("schema validation error", () => {
    const err = new SchemaValidationError(
      "schema mismatch",
      { a: 1 },
      [{ path: "$", message: "missing required", schemaPath: "", value: undefined }],
      { type: "object" },
    );
    expect(err).toBeInstanceOf(OutputGuardError);
    expect(err.data).toEqual({ a: 1 });
    expect(err.validationErrors).toHaveLength(1);
  });

  it("repair error", () => {
    const err = new RepairError("failed", ["strip_fences", "fix_commas"], "{bad}");
    expect(err).toBeInstanceOf(OutputGuardError);
    expect(err.strategiesTried).toEqual(["strip_fences", "fix_commas"]);
  });

  // Skipped: Python-only (StrategyError does not exist in JS)

  it("hierarchy", () => {
    expect(() => {
      throw new ParseError("test", "", null);
    }).toThrow(OutputGuardError);

    expect(() => {
      throw new SchemaValidationError("test", {}, [], {});
    }).toThrow(OutputGuardError);

    expect(() => {
      throw new RepairError("test", [], "");
    }).toThrow(OutputGuardError);
  });
});
