import type { RepairReport, StrategyApplication } from "../src/report.js";
import {
  createReport,
  getDiff,
  getStepDiffs,
  getConfidence,
  getSummary,
  getStrategiesApplied,
  getStrategiesTried,
} from "../src/report.js";

describe("TestReport", () => {
  it("no repair needed", () => {
    const report = createReport('{"a": 1}', '{"a": 1}', true, []);
    expect(getConfidence(report)).toBe(1.0);
    expect(getStrategiesApplied(report)).toEqual([]);
    expect(getSummary(report)).toContain("No repair needed");
    expect(getDiff(report)).toBe("");
  });

  it("single strategy", () => {
    const report = createReport(
      '```json\n{"a": 1}\n```',
      '{"a": 1}',
      true,
      [
        {
          name: "strip_fences",
          changed: true,
          inputText: '```json\n{"a": 1}\n```',
          outputText: '{"a": 1}',
        },
      ],
    );
    expect(getConfidence(report)).toBeGreaterThan(0.5);
    expect(getStrategiesApplied(report)).toEqual(["strip_fences"]);
    expect(getSummary(report)).toContain("strip_fences");
    const diff = getDiff(report);
    expect(diff).toContain("original");
    expect(diff).toContain("repaired");
  });

  it("multiple strategies", () => {
    const report = createReport(
      '```json\n{name: "Alice",}\n```',
      '{"name": "Alice"}',
      true,
      [
        { name: "strip_fences", changed: true, inputText: "a", outputText: "b" },
        { name: "fix_commas", changed: true, inputText: "b", outputText: "c" },
        { name: "fix_keys", changed: true, inputText: "c", outputText: "d" },
        { name: "fix_values", changed: false, inputText: "d", outputText: "d" },
      ],
    );
    expect(getConfidence(report)).toBeLessThan(0.8);
    expect(getStrategiesApplied(report)).toEqual(["strip_fences", "fix_commas", "fix_keys"]);
    expect(getStrategiesTried(report)).toEqual(["strip_fences", "fix_commas", "fix_keys", "fix_values"]);
    expect(getSummary(report)).toContain("3");
  });

  it("failure", () => {
    const report = createReport(
      "garbage",
      "garbage",
      false,
      [
        { name: "strip_fences", changed: false, inputText: "garbage", outputText: "garbage" },
      ],
      "Expecting value",
    );
    expect(getConfidence(report)).toBe(0.0);
    expect(getSummary(report).toLowerCase()).toContain("fail");
  });

  it("strategy application diff — changed", () => {
    const step: StrategyApplication = {
      name: "strip_fences",
      changed: true,
      inputText: '```json\n{"a": 1}\n```',
      outputText: '{"a": 1}',
    };
    const report = createReport(step.inputText, step.outputText, true, [step]);
    const stepDiffs = getStepDiffs(report);
    expect(stepDiffs).toContain("strip_fences");
  });

  it("strategy application diff — no change", () => {
    const step: StrategyApplication = {
      name: "fix_commas",
      changed: false,
      inputText: '{"a": 1}',
      outputText: '{"a": 1}',
    };
    const report = createReport(step.inputText, step.outputText, true, [step]);
    const stepDiffs = getStepDiffs(report);
    // fix_commas didn't change, so it should not appear in step diffs
    expect(stepDiffs).not.toContain("fix_commas");
  });

  it("step diffs multi strategy", () => {
    const report = createReport(
      "in",
      "out",
      true,
      [
        { name: "a", changed: true, inputText: "in", outputText: "mid" },
        { name: "b", changed: false, inputText: "mid", outputText: "mid" },
        { name: "c", changed: true, inputText: "mid", outputText: "out" },
      ],
    );
    const verbose = getStepDiffs(report);
    expect(verbose).toContain("=== a ===");
    expect(verbose).toContain("=== c ===");
    expect(verbose).not.toContain("=== b ===");
  });
});
