import { apply } from "../../src/strategies/fixClosers.js";

describe("fix_closers", () => {
  it("missing brace", () => expect(JSON.parse(apply('{"a":1'))).toEqual({ a: 1 }));
  it("missing bracket and brace", () => expect(JSON.parse(apply('{"a":[1,2'))).toEqual({ a: [1, 2] }));
  it("already balanced", () => expect(apply('{"a":[1,2]}')).toBe('{"a":[1,2]}'));
});
