import { validateAndRepair, parse, repair } from "../src/index.js";
import { ParseError } from "../src/exceptions.js";

const simpleSchema = {
  type: "object",
  properties: { name: { type: "string" }, age: { type: "integer" } },
  required: ["name", "age"],
};

describe("integration", () => {
  it("fenced with trailing comma", () => {
    const r = validateAndRepair('```json\n{"name":"Alice","age":30,}\n```', simpleSchema);
    expect(r.valid).toBe(true);
    expect(r.repaired).toBe(true);
  });
  it("commentary with unquoted keys", () => {
    const r = validateAndRepair("Sure!\n{name:'Bob',age:25}\nDone!", simpleSchema);
    expect(r.valid).toBe(true);
    expect(r.data!).toHaveProperty("name", "Bob");
  });
  it("missing closer", () => {
    const r = validateAndRepair('{"name":"Alice","age":30', simpleSchema);
    expect(r.valid).toBe(true);
  });
  it("python booleans", () => {
    const s = {
      type: "object",
      properties: { active: { type: "boolean" }, name: { type: "string" } },
      required: ["active", "name"],
    };
    const r = validateAndRepair("{'active':True,'name':'Test'}", s);
    expect(r.valid).toBe(true);
    expect(r.data!).toHaveProperty("active", true);
  });
  it("already valid", () => {
    const r = validateAndRepair('{"name":"Diana","age":28}', simpleSchema);
    expect(r.valid).toBe(true);
    expect(r.repaired).toBe(false);
  });
  it("completely broken", () => {
    const r = validateAndRepair("plain english", { type: "object" });
    expect(r.valid).toBe(false);
  });
  it("parse convenience", () => {
    const d = parse('```json\n{"name":"X","age":1}\n```', simpleSchema);
    expect(d).toHaveProperty("name", "X");
  });
  it("parse throws on garbage", () => {
    expect(() => parse("not json", { type: "object" })).toThrow(ParseError);
  });
  it("kitchen sink", () => {
    const text = "Sure!\n```json\n{name:'Zara',age:28,active:True,}\n```\nEnjoy!";
    const s = {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "integer" }, active: { type: "boolean" } },
      required: ["name", "age"],
    };
    const r = validateAndRepair(text, s);
    expect(r.valid).toBe(true);
    expect(r.data!).toHaveProperty("name", "Zara");
    expect(r.data!).toHaveProperty("active", true);
  });
});
