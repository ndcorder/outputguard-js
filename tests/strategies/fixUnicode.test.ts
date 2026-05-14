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

  it("incomplete unicode — pads with zeros", () => {
    // \u41 (2 hex digits) gets padded to 䄀
    const r = JSON.parse(apply('{"a":"\\u41"}'));
    expect(r.a).toBe(String.fromCharCode(0x4100));
  });

  it("unicode with no hex digits — removes \\u", () => {
    const r = JSON.parse(apply('{"a":"test\\uxyz"}'));
    expect(r.a).toBe("testxyz");
  });

  it("null byte \\0 — removed", () => {
    const r = JSON.parse(apply('{"a":"before\\0after"}'));
    expect(r.a).toBe("beforeafter");
  });
});
