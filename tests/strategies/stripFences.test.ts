import { apply } from "../../src/strategies/stripFences.js";

describe("strip_fences", () => {
  it("removes json fence", () => expect(apply('```json\n{"a":1}\n```')).toBe('{"a":1}'));
  it("removes plain fence", () => expect(apply('```\n{"a":1}\n```')).toBe('{"a":1}'));
  it("no fences unchanged", () => expect(apply('{"a":1}')).toBe('{"a":1}'));
  it("multiple fences takes first", () => {
    expect(apply('```json\n{"a":1}\n```\n```json\n{"b":2}\n```')).toBe('{"a":1}');
  });
  it("jsonc fence", () => expect(apply('```jsonc\n{"a":1}\n```')).toBe('{"a":1}'));
  it("javascript fence", () => expect(apply('```javascript\n{"a":1}\n```')).toBe('{"a":1}'));
});
