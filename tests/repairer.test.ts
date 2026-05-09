import { repair } from "../src/repairer.js";

describe("repairer", () => {
  it("already valid", () => {
    const r = repair('{"a":1}');
    expect(r.repaired).toBe(false);
  });
  it("markdown fenced", () => {
    const r = repair('```json\n{"a":1}\n```');
    expect(r.repaired).toBe(true);
    expect(JSON.parse(r.text)).toEqual({ a: 1 });
  });
  it("commentary", () => {
    const r = repair('Here:\n{"a":1}\nDone!');
    expect(r.repaired).toBe(true);
    expect(JSON.parse(r.text)).toEqual({ a: 1 });
  });
  it("multiple issues", () => {
    const r = repair("```json\n{name:'Alice',age:30,}\n```");
    expect(r.repaired).toBe(true);
    const d = JSON.parse(r.text);
    expect(d.name).toBe("Alice");
  });
  it("unrepairable", () => {
    const r = repair("this is not json at all");
    expect(r.repaired).toBe(false);
  });
});
