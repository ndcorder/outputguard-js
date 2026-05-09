import { apply } from "../../src/strategies/fixUnicode.js";

describe("fix_unicode", () => {
  it("hex escape", () => {
    const r = JSON.parse(apply('{"a":"\\x41\\x42"}'));
    expect(r.a).toBe("AB");
  });
  it("valid unicode preserved", () => {
    const t = '{"a":"caf\\u00e9"}';
    expect(apply(t)).toBe(t);
  });
  it("no escapes unchanged", () => expect(apply('{"a":"hello"}')).toBe('{"a":"hello"}'));
});
