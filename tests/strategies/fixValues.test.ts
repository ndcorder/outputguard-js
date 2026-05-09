import { apply } from "../../src/strategies/fixValues.js";

describe("fix_values", () => {
  it("NaN", () => expect(JSON.parse(apply('{"a":NaN}'))).toEqual({ a: null }));
  it("Infinity", () => expect(JSON.parse(apply('{"a":Infinity}'))).toEqual({ a: null }));
  it("-Infinity", () => expect(JSON.parse(apply('{"a":-Infinity}'))).toEqual({ a: null }));
  it("undefined", () => expect(JSON.parse(apply('{"a":undefined}'))).toEqual({ a: null }));
  it("NaN in string preserved", () => {
    const t = '{"a":"NaN is not a number"}';
    expect(apply(t)).toBe(t);
  });
});
