#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getVersion(): string {
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
  return pkg.version as string;
}

export function readInput(inputArg: string): string {
  if (inputArg === "-") {
    return readFileSync("/dev/stdin", "utf-8");
  }
  return readFileSync(resolve(inputArg), "utf-8");
}

export function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string | boolean> } {
  const command = argv[0] ?? "";
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("-")) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = true;
        }
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags[arg.slice(1)] = next;
        i++;
      } else {
        flags[arg.slice(1)] = true;
      }
    } else {
      args.push(arg);
    }
  }

  return { command, args, flags };
}

export function printHelp(): void {
  console.log(`${BOLD}outputguard${RESET} — Validate, repair, and retry LLM structured outputs

${BOLD}Usage:${RESET}
  outputguard validate <input> -s <schema> [--repair] [--input-format json|yaml|toml|python|auto|forced-json-off] [--format text|json] [--quiet] [--diff] [--verbose]
  outputguard repair <input> [--input-format json|yaml|toml|python|auto|forced-json-off] [--format text|json] [--strategies s1,s2] [--diff] [--verbose]
  outputguard batch <input> -s <schema> [--repair] [--input-format json|yaml|toml|python|auto|forced-json-off] [--format text|json]
  outputguard retry-prompt <input> -s <schema> [--input-format json|yaml|toml|python|auto|forced-json-off] [--no-message-history]
  outputguard strategies
  outputguard version
  outputguard --help

${BOLD}Arguments:${RESET}
  <input>    File path or "-" for stdin
             Batch input must be a JSON array of output strings

${BOLD}Options:${RESET}
  -s, --schema <file>       JSON Schema file path
  --repair                  Attempt to repair invalid structured output
  --input-format <format>   Input data format ${DIM}(default: json)${RESET}
  --format <text|json>      Command output format ${DIM}(default: text)${RESET}
  --strategies <s1,s2,...>  Comma-separated repair strategies
  --no-message-history      Omit the original output from retry prompts
  --quiet                   Suppress non-essential output
  --diff                    Show diff of repairs
  --verbose                 Show detailed repair steps
  --help                    Show this help message
`);
}

export async function cmdValidate(args: string[], flags: Record<string, string | boolean>): Promise<number> {
  const { OutputGuard } = await import("./guard.js");
  const { getDiff, getStepDiffs, getConfidence } = await import("./report.js");

  const inputArg = args[0];
  const schemaPath = (flags.s ?? flags.schema) as string | undefined;
  const doRepair = flags.repair === true;
  const outputFormat = (flags.format as string) ?? "text";
  const inputFormat = (flags["input-format"] as string) ?? "json";
  const quiet = flags.quiet === true;
  const showDiff = flags.diff === true;
  const verbose = flags.verbose === true;

  if (!inputArg) {
    console.error(`${RED}Error: missing <input> argument${RESET}`);
    return 2;
  }
  if (!schemaPath) {
    console.error(`${RED}Error: missing --schema / -s argument${RESET}`);
    return 2;
  }

  const text = readInput(inputArg);
  const schema = JSON.parse(readFileSync(resolve(schemaPath as string), "utf-8"));
  const guard = new OutputGuard({ format: inputFormat });

  if (doRepair) {
    const result = guard.validateAndRepair(text, schema);

    if (outputFormat === "json") {
      console.log(JSON.stringify(result, null, 2));
      return result.valid ? 0 : 1;
    }

    if (result.valid && !result.repaired) {
      if (!quiet) console.log(`${GREEN}✓ Valid${RESET}`);
      return 0;
    }
    if (result.valid && result.repaired) {
      if (!quiet) {
        console.log(`${GREEN}✓ Valid after repair${RESET}`);
        console.log(`${DIM}Strategies: ${result.strategiesApplied.join(", ")}${RESET}`);
      }
      if (showDiff || verbose) {
        const { report } = guard.repair(text, { report: true });
        if (showDiff) {
          console.log(`\n${BOLD}Diff:${RESET}`);
          console.log(getDiff(report));
        }
        if (verbose) {
          console.log(`\n${BOLD}Steps:${RESET}`);
          console.log(getStepDiffs(report));
          console.log(`\n${BOLD}Confidence:${RESET} ${getConfidence(report)}`);
        }
      }
      console.log(result.repairedText);
      return 0;
    }

    if (!quiet) {
      console.error(`${RED}✗ Invalid — repair failed${RESET}`);
      for (const err of result.errors) {
        console.error(`  ${err.path}: ${err.message}`);
      }
    }
    return 1;
  }

  // Validate only (no repair)
  const result = guard.validate(text, schema);

  if (outputFormat === "json") {
    console.log(JSON.stringify(result, null, 2));
    return result.valid ? 0 : 1;
  }

  if (result.valid) {
    if (!quiet) console.log(`${GREEN}✓ Valid${RESET}`);
    return 0;
  }

  if (!quiet) {
    console.error(`${RED}✗ Invalid${RESET}`);
    for (const err of result.errors) {
      console.error(`  ${err.path}: ${err.message}`);
    }
  }
  return 1;
}

export async function cmdRepair(args: string[], flags: Record<string, string | boolean>): Promise<number> {
  const { OutputGuard } = await import("./guard.js");
  const { getDiff, getStepDiffs, getConfidence } = await import("./report.js");

  const inputArg = args[0];
  const outputFormat = (flags.format as string) ?? "text";
  const inputFormat = (flags["input-format"] as string) ?? "json";
  const strategiesStr = flags.strategies as string | undefined;
  const showDiff = flags.diff === true;
  const verbose = flags.verbose === true;

  if (!inputArg) {
    console.error(`${RED}Error: missing <input> argument${RESET}`);
    return 2;
  }

  const text = readInput(inputArg);
  const strategies = strategiesStr ? strategiesStr.split(",").map(s => s.trim()) : undefined;
  const guard = new OutputGuard({ strategies, format: inputFormat });

  if (showDiff || verbose) {
    const { result, report } = guard.repair(text, { report: true });

    if (outputFormat === "json") {
      console.log(JSON.stringify({ result, report }, null, 2));
      return result.repaired ? 0 : 1;
    }

    if (result.repaired) {
      console.log(`${GREEN}✓ Repaired${RESET}`);
      console.log(`${DIM}Strategies: ${result.strategiesApplied.join(", ")}${RESET}`);
      if (showDiff) {
        console.log(`\n${BOLD}Diff:${RESET}`);
        console.log(getDiff(report));
      }
      if (verbose) {
        console.log(`\n${BOLD}Steps:${RESET}`);
        console.log(getStepDiffs(report));
        console.log(`\n${BOLD}Confidence:${RESET} ${getConfidence(report)}`);
      }
      console.log(`\n${BOLD}Result:${RESET}`);
      console.log(result.text);
      return 0;
    }

    console.error(`${RED}✗ Could not repair${RESET}`);
    if (result.parseError) {
      console.error(`${DIM}${result.parseError}${RESET}`);
    }
    return 1;
  }

  const result = guard.repair(text);

  if (outputFormat === "json") {
    console.log(JSON.stringify(result, null, 2));
    return result.repaired ? 0 : 1;
  }

  if (result.repaired) {
    console.log(`${GREEN}✓ Repaired${RESET}`);
    console.log(`${DIM}Strategies: ${result.strategiesApplied.join(", ")}${RESET}`);
    console.log(result.text);
    return 0;
  }

  console.error(`${RED}✗ Could not repair${RESET}`);
  if (result.parseError) {
    console.error(`${DIM}${result.parseError}${RESET}`);
  }
  return 1;
}

export async function cmdRetryPrompt(args: string[], flags: Record<string, string | boolean>): Promise<number> {
  const { OutputGuard } = await import("./guard.js");

  const inputArg = args[0];
  const schemaPath = (flags.s ?? flags.schema) as string | undefined;
  const inputFormat = (flags["input-format"] as string) ?? "json";
  const includeMessageHistory = flags["no-message-history"] !== true;

  if (!inputArg) {
    console.error(`${RED}Error: missing <input> argument${RESET}`);
    return 2;
  }
  if (!schemaPath) {
    console.error(`${RED}Error: missing --schema / -s argument${RESET}`);
    return 2;
  }

  const text = readInput(inputArg);
  const schema = JSON.parse(readFileSync(resolve(schemaPath as string), "utf-8"));
  const guard = new OutputGuard({ format: inputFormat });
  const result = guard.validate(text, schema);

  if (result.valid) {
    console.log(`${GREEN}✓ Already valid — no retry prompt needed${RESET}`);
    return 0;
  }

  const prompt = guard.retryPrompt(text, schema, result.errors, {
    format: inputFormat,
    includeMessageHistory,
  });
  console.log(prompt);
  return 0;
}

export async function cmdBatch(args: string[], flags: Record<string, string | boolean>): Promise<number> {
  const { validateBatch } = await import("./batch.js");

  const inputArg = args[0];
  const schemaPath = (flags.s ?? flags.schema) as string | undefined;
  const doRepair = flags.repair === true;
  const outputFormat = (flags.format as string) ?? "text";
  const inputFormat = (flags["input-format"] as string) ?? "json";

  if (!inputArg) {
    console.error(`${RED}Error: missing <input> argument${RESET}`);
    return 2;
  }
  if (!schemaPath) {
    console.error(`${RED}Error: missing --schema / -s argument${RESET}`);
    return 2;
  }

  const parsed = JSON.parse(readInput(inputArg));
  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== "string")) {
    console.error(`${RED}Error: batch input must be a JSON array of strings${RESET}`);
    return 2;
  }

  const schema = JSON.parse(readFileSync(resolve(schemaPath), "utf-8"));
  const batch = validateBatch(parsed, schema, { repair: doRepair, format: inputFormat });

  if (outputFormat === "json") {
    console.log(JSON.stringify(batch, null, 2));
    return batch.summary.invalid === 0 ? 0 : 1;
  }

  const summary = batch.summary;
  if (summary.invalid === 0) {
    console.log(`${GREEN}✓ ${summary.valid}/${summary.total} valid${RESET}`);
  } else {
    console.log(`${YELLOW}! ${summary.valid}/${summary.total} valid, ${summary.invalid} invalid${RESET}`);
  }
  if (summary.repaired > 0) {
    console.log(`${DIM}Repaired: ${summary.repaired}${RESET}`);
  }
  if (Object.keys(summary.strategyCounts).length > 0) {
    console.log(`${DIM}Strategies: ${JSON.stringify(summary.strategyCounts)}${RESET}`);
  }

  return summary.invalid === 0 ? 0 : 1;
}

export async function cmdStrategies(): Promise<number> {
  const { ALL_STRATEGIES } = await import("./strategies/index.js");

  console.log(`${BOLD}Available repair strategies:${RESET}\n`);

  const nameWidth = Math.max(...ALL_STRATEGIES.map(s => s.name.length), 4) + 2;
  console.log(`${"".padEnd(nameWidth)}${""}`);
  console.log(`${BOLD}${"Name".padEnd(nameWidth)}Description${RESET}`);
  console.log(`${"─".repeat(nameWidth)}${ "─".repeat(50)}`);

  for (const strategy of ALL_STRATEGIES) {
    console.log(`${YELLOW}${strategy.name.padEnd(nameWidth)}${RESET}${strategy.description}`);
  }

  console.log(`\n${DIM}${ALL_STRATEGIES.length} strategies available${RESET}`);
  return 0;
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h")) {
    printHelp();
    process.exit(rawArgs.length === 0 ? 2 : 0);
  }

  const { command, args, flags } = parseArgs(rawArgs);
  let exitCode: number;

  switch (command) {
    case "validate":
      exitCode = await cmdValidate(args, flags);
      break;
    case "repair":
      exitCode = await cmdRepair(args, flags);
      break;
    case "batch":
      exitCode = await cmdBatch(args, flags);
      break;
    case "retry-prompt":
      exitCode = await cmdRetryPrompt(args, flags);
      break;
    case "strategies":
      exitCode = await cmdStrategies();
      break;
    case "version":
      console.log(getVersion());
      exitCode = 0;
      break;
    default:
      console.error(`${RED}Unknown command: ${command}${RESET}`);
      printHelp();
      exitCode = 2;
      break;
  }

  process.exit(exitCode);
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  main().catch((err: unknown) => {
    console.error(`${RED}${(err as Error).message}${RESET}`);
    process.exit(1);
  });
}
