import { apply } from "../../src/strategies/fixKeys.js";

describe("fix_keys", () => {
  it("unquoted key", () => expect(JSON.parse(apply('{key:"value"}'))).toEqual({ key: "value" }));
  it("underscore key", () => expect(JSON.parse(apply('{my_key:1}'))).toEqual({ my_key: 1 }));
  it("already quoted", () => expect(apply('{"key":"value"}')).toBe('{"key":"value"}'));
  it("multiple keys", () => {
    const r = JSON.parse(apply('{name:"Alice",age:30}'));
    expect(r).toEqual({ name: "Alice", age: 30 });
  });
});
