import { apply } from "../../src/strategies/fixBooleans.js";

describe("fix_booleans", () => {
  it("True", () => expect(JSON.parse(apply('{"a":True}'))).toEqual({ a: true }));
  it("False", () => expect(JSON.parse(apply('{"a":False}'))).toEqual({ a: false }));
  it("None", () => expect(JSON.parse(apply('{"a":None}'))).toEqual({ a: null }));
  it("in string preserved", () => {
    const t = '{"a":"True is not False"}';
    expect(apply(t)).toBe(t);
  });
  it("already json", () => {
    const t = '{"a":true,"b":false,"c":null}';
    expect(apply(t)).toBe(t);
  });
});
