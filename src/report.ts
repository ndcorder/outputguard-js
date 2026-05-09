export interface StrategyApplication {
  name: string;
  changed: boolean;
  inputText: string;
  outputText: string;
}

export interface RepairReport {
  originalText: string;
  finalText: string;
  success: boolean;
  steps: StrategyApplication[];
  parseError: string | null;
}

export function createReport(
  originalText: string,
  finalText: string,
  success: boolean,
  steps: StrategyApplication[] = [],
  parseError: string | null = null,
): RepairReport {
  return { originalText, finalText, success, steps, parseError };
}

export function getStrategiesApplied(report: RepairReport): string[] {
  return report.steps.filter(s => s.changed).map(s => s.name);
}

export function getStrategiesTried(report: RepairReport): string[] {
  return report.steps.map(s => s.name);
}

export function getDiff(report: RepairReport): string {
  if (report.originalText === report.finalText) return "";
  const origLines = report.originalText.split("\n");
  const finalLines = report.finalText.split("\n");
  const parts: string[] = ["--- original", "+++ repaired"];
  const maxLines = Math.max(origLines.length, finalLines.length);
  for (let i = 0; i < maxLines; i++) {
    const orig = origLines[i];
    const final = finalLines[i];
    if (orig === final) {
      parts.push(` ${orig ?? ""}`);
    } else {
      if (orig !== undefined) parts.push(`-${orig}`);
      if (final !== undefined) parts.push(`+${final}`);
    }
  }
  return parts.join("\n");
}

export function getStepDiffs(report: RepairReport): string {
  const parts: string[] = [];
  for (const step of report.steps) {
    if (!step.changed) continue;
    parts.push(`=== ${step.name} ===`);
    const origLines = step.inputText.split("\n");
    const outLines = step.outputText.split("\n");
    const max = Math.max(origLines.length, outLines.length);
    for (let i = 0; i < max; i++) {
      if (origLines[i] === outLines[i]) {
        parts.push(` ${origLines[i] ?? ""}`);
      } else {
        if (origLines[i] !== undefined) parts.push(`-${origLines[i]}`);
        if (outLines[i] !== undefined) parts.push(`+${outLines[i]}`);
      }
    }
    parts.push("");
  }
  return parts.join("\n");
}

export function getConfidence(report: RepairReport): number {
  if (!report.success) return 0;
  const applied = report.steps.filter(s => s.changed).length;
  if (applied === 0) return 1;
  const strategyPenalty = Math.min(applied * 0.1, 0.5);
  const origLen = Math.max(report.originalText.length, 1);
  const finalLen = Math.max(report.finalText.length, 1);
  const changeRatio = Math.abs(origLen - finalLen) / Math.max(origLen, finalLen);
  const changePenalty = Math.min(changeRatio * 0.5, 0.3);
  return Math.max(Math.round((1 - strategyPenalty - changePenalty) * 100) / 100, 0.1);
}

export function getSummary(report: RepairReport): string {
  if (!report.success) return `Repair failed after trying ${report.steps.length} strategies`;
  const applied = getStrategiesApplied(report);
  if (applied.length === 0) return "No repair needed — JSON was already valid";
  return `Repaired using ${applied.length} strategy(ies): ${applied.join(", ")}`;
}
