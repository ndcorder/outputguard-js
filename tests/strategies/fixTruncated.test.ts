import { apply } from "../../src/strategies/fixTruncated.js";

describe("fix_truncated", () => {
  it("mid-string", () => expect(JSON.parse(apply('{"name":"Ali'))).toEqual({ name: "Ali" }));
  it("after colon", () => {
    const r = JSON.parse(apply('{"name":"Alice","age":'));
    expect(r.name).toBe("Alice");
  });
  it("mid-array", () => expect(JSON.parse(apply('{"items":[1,2,3'))).toEqual({ items: [1, 2, 3] }));
  it("after comma", () => expect(JSON.parse(apply('{"a":1,"b":2,'))).toHaveProperty("a", 1));
  it("nested", () => {
    const r = JSON.parse(apply('{"user":{"name":"Bob","address":{"city":"NYC"'));
    expect(r.user.name).toBe("Bob");
  });
  it("not truncated", () => expect(apply('{"a":1}')).toBe('{"a":1}'));
});
