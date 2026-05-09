import { apply } from "../../src/strategies/removeComments.js";

describe("remove_comments", () => {
  it("single line comment", () => expect(JSON.parse(apply('{"a": 1 // comment\n}'))).toEqual({ a: 1 }));
  it("multi line comment", () => expect(JSON.parse(apply('{"a": /* inline */ 1}'))).toEqual({ a: 1 }));
  it("url preserved", () => {
    const t = '{"url": "http://example.com"}';
    expect(apply(t)).toBe(t);
  });
  it("no comments unchanged", () => expect(apply('{"a":1}')).toBe('{"a":1}'));
});
