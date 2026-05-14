import { apply } from "../../src/strategies/fixInnerQuotes.js";

describe("fix_inner_quotes", () => {
  it("escapes inner quote in value", () => {
    const input = '{"key": "hello "world" there"}';
    const result = apply(input);
    expect(JSON.parse(result)).toEqual({ key: 'hello "world" there' });
  });

  it("leaves properly escaped quotes", () => {
    const input = '{"key": "hello \\"world\\" there"}';
    expect(apply(input)).toBe(input);
  });

  it("leaves valid JSON unchanged", () => {
    const input = '{"key": "value"}';
    expect(apply(input)).toBe(input);
  });

  it("handles key without inner quotes", () => {
    const input = '{"name": "Alice"}';
    expect(apply(input)).toBe(input);
  });

  it("handles multiple fields", () => {
    const input = '{"a": "x"y"z", "b": "ok"}';
    const result = apply(input);
    expect(JSON.parse(result)).toEqual({ a: 'x"y"z', b: 'ok' });
  });

  it("handles escaped char in key string", () => {
    const input = '{"ke\\y": "value"}';
    const result = apply(input);
    expect(result).toBe('{"ke\\y": "value"}');
  });

  it("handles escaped char in value string", () => {
    const input = '{"key": "va\\lue"}';
    const result = apply(input);
    expect(result).toBe('{"key": "va\\lue"}');
  });

  it("handles backslash at end of non-value string", () => {
    const result = apply('{"test\\');
    expect(result).toContain("test");
  });

  it("handles backslash at end of value string", () => {
    const result = apply('{"k": "v\\');
    expect(result).toContain("v");
  });
});
