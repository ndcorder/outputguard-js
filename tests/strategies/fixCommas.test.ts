import { apply } from "../../src/strategies/fixCommas.js";

describe("fix_commas", () => {
  it("trailing comma object", () => expect(JSON.parse(apply('{"a":1,"b":2,}'))).toEqual({ a: 1, b: 2 }));
  it("trailing comma array", () => expect(JSON.parse(apply('[1,2,3,]'))).toEqual([1, 2, 3]));
  it("nested trailing", () => expect(JSON.parse(apply('{"a":[1,2,],"b":3,}'))).toEqual({ a: [1, 2], b: 3 }));
  it("no trailing unchanged", () => expect(apply('{"a":1}')).toBe('{"a":1}'));
});
