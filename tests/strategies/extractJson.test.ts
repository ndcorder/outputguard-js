import { apply } from "../../src/strategies/extractJson.js";

describe("extract_json", () => {
  it("extracts object", () => expect(apply('Here is: {"a":1} done')).toBe('{"a":1}'));
  it("extracts array", () => expect(apply('[1,2,3]')).toBe('[1,2,3]'));
  it("nested braces", () => expect(apply('Result: {"a":{"b":1}} done')).toBe('{"a":{"b":1}}'));
  it("no json unchanged", () => expect(apply('no json')).toBe('no json'));
  it("with surrounding text", () => {
    const r = apply('Sure!\n{"name":"test"}\nLet me know!');
    expect(JSON.parse(r)).toEqual({ name: "test" });
  });
});
