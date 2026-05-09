import { OutputGuard } from "../src/guard.js";
import { ParseError, SchemaValidationError } from "../src/exceptions.js";

const schema = {
  type: "object",
  properties: { name: { type: "string" }, age: { type: "integer" } },
  required: ["name", "age"],
};

describe("OutputGuard", () => {
  const guard = new OutputGuard();

  it("validateAndRepair repairable", () => {
    const r = guard.validateAndRepair('```json\n{"name":"Alice","age":30}\n```', schema);
    expect(r.valid).toBe(true);
    expect(r.repaired).toBe(true);
  });
  it("validateAndRepair unrepairable", () => {
    const r = guard.validateAndRepair("broken", schema);
    expect(r.valid).toBe(false);
  });
  it("validateAndRepair already valid", () => {
    const r = guard.validateAndRepair('{"name":"Alice","age":30}', schema);
    expect(r.valid).toBe(true);
    expect(r.repaired).toBe(false);
  });
  it("parse valid", () => {
    const d = guard.parse('{"name":"Alice","age":30}', schema);
    expect(d).toEqual({ name: "Alice", age: 30 });
  });
  it("parse repairable", () => {
    const d = guard.parse('```json\n{"name":"Alice","age":30}\n```', schema);
    expect((d as any).name).toBe("Alice");
  });
  it("parse throws ParseError", () => {
    expect(() => guard.parse("broken", { type: "object" })).toThrow(ParseError);
  });
  it("parse throws SchemaValidationError", () => {
    expect(() => guard.parse('{"name":"Alice"}', schema)).toThrow(SchemaValidationError);
  });
  it("custom strategies", () => {
    const g = new OutputGuard({ strategies: ["strip_fences"] });
    const r = g.repair('```json\n{"a":1}\n```');
    expect(r.repaired).toBe(true);
  });
});
