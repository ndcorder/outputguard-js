import { apply } from "../../src/strategies/fixQuotes.js";

describe("fix_quotes", () => {
  it("single quotes", () => expect(JSON.parse(apply("{'key':'value'}"))).toEqual({ key: "value" }));
  it("mixed quotes", () => expect(JSON.parse(apply("{'key':\"value\"}"))).toEqual({ key: "value" }));
  it("already double", () => expect(apply('{"key":"value"}')).toBe('{"key":"value"}'));
});
