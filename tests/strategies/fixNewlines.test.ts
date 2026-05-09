import { apply } from "../../src/strategies/fixNewlines.js";

describe("fix_newlines", () => {
  it("literal newline in string", () => {
    const t = '{"a":"line1\nline2"}';
    expect(JSON.parse(apply(t))).toEqual({ a: "line1\nline2" });
  });
  it("no newlines unchanged", () => expect(apply('{"a":"hello"}')).toBe('{"a":"hello"}'));
});
