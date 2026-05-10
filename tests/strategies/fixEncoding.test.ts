import { apply } from "../../src/strategies/fixEncoding.js";

describe("fix_encoding", () => {
  it("replaces BPE space token", () => {
    expect(apply('{"key":Ġ"value"}')).toBe('{"key": "value"}');
  });

  it("replaces BPE newline token", () => {
    expect(apply('helloĊworld')).toBe('hello\nworld');
  });

  it("replaces BPE tab token", () => {
    expect(apply('helloĉworld')).toBe('hello\tworld');
  });

  it("replaces BPE carriage return token", () => {
    expect(apply('helločworld')).toBe('hello\rworld');
  });

  it("replaces multiple BPE tokens", () => {
    expect(apply('ĠhelloĠworldĊ')).toBe(' hello world\n');
  });

  it("returns unchanged text without BPE tokens", () => {
    const text = '{"key": "value"}';
    expect(apply(text)).toBe(text);
  });
});
