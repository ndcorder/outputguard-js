import { validate } from "../src/validator.js";

const simpleSchema = {
  type: "object",
  properties: { name: { type: "string" }, age: { type: "integer" } },
  required: ["name", "age"],
};

describe("validator", () => {
  it("valid json", () => {
    const r = validate('{"name":"Alice","age":30}', simpleSchema);
    expect(r.valid).toBe(true);
    expect(r.data).toEqual({ name: "Alice", age: 30 });
  });
  it("invalid type", () => {
    const r = validate('{"name":"Alice","age":"thirty"}', simpleSchema);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it("missing required", () => {
    const r = validate('{"name":"Alice"}', simpleSchema);
    expect(r.valid).toBe(false);
  });
  it("invalid json", () => {
    const r = validate("not json", { type: "object" });
    expect(r.valid).toBe(false);
    expect(r.errors[0].path).toBe("$");
  });
});
