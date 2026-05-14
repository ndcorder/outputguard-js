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

  it("unrepairable with report", () => {
    const { result, report } = repair("completely broken }{{", undefined, { report: true });
    expect(result.repaired).toBe(false);
    expect(result.parseError).toBeTruthy();
    expect(report.success).toBe(false);
    expect(report.parseError).toBeTruthy();
  });

  it("already valid with report", () => {
    const { result, report } = repair('{"a":1}', undefined, { report: true });
    expect(result.repaired).toBe(false);
    expect(report.success).toBe(true);
    expect(report.originalText).toBe('{"a":1}');
  });

  it("second pass succeeds when first pass fails", () => {
    // Input that needs extract_json (strips surrounding text) which is an
    // early strategy. When ALL strategies are applied in sequence the later
    // ones may alter already-valid JSON. The second pass applies one-at-a-time
    // and checks after each, catching the early fix.
    const input = 'Here is the JSON:\n{"a": 1}\nEnd.';
    const r = repair(input);
    expect(r.repaired).toBe(true);
    expect(JSON.parse(r.text)).toEqual({ a: 1 });
  });

  it("second pass with report", () => {
    const input = 'Here is the JSON:\n{"a": 1}\nEnd.';
    const { result, report } = repair(input, undefined, { report: true });
    expect(result.repaired).toBe(true);
    expect(report.success).toBe(true);
  });
});
