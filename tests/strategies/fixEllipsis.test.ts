import { apply } from "../../src/strategies/fixEllipsis.js";

describe("fix_ellipsis", () => {
  it("as value", () => expect(JSON.parse(apply('{"a":...}'))).toEqual({ a: null }));
  it("in array", () => expect(JSON.parse(apply('{"items":[1,2,...]}'))).toEqual({ items: [1, 2] }));
  it("standalone array", () => expect(JSON.parse(apply('[...]'))).toEqual([]));
  it("standalone object", () => expect(JSON.parse(apply('{...}'))).toEqual({}));
  it("in string preserved", () => expect(apply('{"msg":"Loading..."}')).toBe('{"msg":"Loading..."}'));
  it("no ellipsis", () => expect(apply('{"a":1}')).toBe('{"a":1}'));
});
