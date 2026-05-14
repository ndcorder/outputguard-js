import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";

type CanonicalFormat = "json" | "yaml" | "toml" | "python" | "auto";

export const SUPPORTED_FORMATS = [
  "json",
  "yaml",
  "toml",
  "python",
  "auto",
  "forced-json-off",
] as const;

export const CLI_FORMAT_CHOICES = [
  "json",
  "yaml",
  "yml",
  "toml",
  "python",
  "python-literal",
  "literal",
  "auto",
  "forced-json-off",
] as const;

const FORMAT_ALIASES: Record<string, CanonicalFormat> = {
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  python: "python",
  py: "python",
  "python-literal": "python",
  literal: "python",
  auto: "auto",
  "forced-json-off": "auto",
  forced_json_off: "auto",
};

export class FormatParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormatParseError";
  }
}

export function normalizeFormat(format = "json"): CanonicalFormat {
  const normalized = FORMAT_ALIASES[format.trim().toLowerCase()];
  if (!normalized) {
    throw new Error(
      `Unsupported format: ${format}. Supported formats: ${CLI_FORMAT_CHOICES.join(", ")}`,
    );
  }
  return normalized;
}

export function formatLabel(format = "json"): string {
  if (format === "forced-json-off") return "forced-JSON-off structured output";
  switch (normalizeFormat(format)) {
    case "json":
      return "JSON";
    case "yaml":
      return "YAML";
    case "toml":
      return "TOML";
    case "python":
      return "Python literal";
    case "auto":
      return "structured output";
  }
}

export function parseDocument(text: string, format = "json"): unknown {
  const normalized = normalizeFormat(format);
  if (normalized === "auto") return parseAuto(text);
  return parseWithFormat(text, normalized);
}

function parseAuto(text: string): unknown {
  const errors: string[] = [];
  for (const format of ["json", "toml", "python", "yaml"] as const) {
    try {
      return parseWithFormat(text, format);
    } catch (error) {
      errors.push(`${format}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new FormatParseError(errors.join("; "));
}

function parseWithFormat(text: string, format: CanonicalFormat): unknown {
  try {
    switch (format) {
      case "json":
        return JSON.parse(text);
      case "yaml":
        return parseYaml(text);
      case "toml":
        return parseToml(text);
      case "python":
        return new PythonLiteralParser(text).parse();
    }
  } catch (error) {
    throw new FormatParseError(error instanceof Error ? error.message : String(error));
  }
}

class PythonLiteralParser {
  private index = 0;

  constructor(private readonly text: string) {}

  parse(): unknown {
    const value = this.parseValue();
    this.skipWhitespace();
    if (!this.isDone()) throw this.error("Unexpected trailing content");
    return value;
  }

  private parseValue(): unknown {
    this.skipWhitespace();
    const char = this.peek();
    if (char === "{") return this.parseDict();
    if (char === "[") return this.parseSequence("]");
    if (char === "(") return this.parseSequence(")");
    if (char === "'" || char === "\"") return this.parseString();
    if (char === "-" || char === "+" || char === "." || /\d/.test(char)) return this.parseNumber();
    return this.parseIdentifier();
  }

  private parseDict(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.expect("{");
    this.skipWhitespace();
    if (this.consume("}")) return result;

    while (true) {
      const key = this.parseValue();
      this.skipWhitespace();
      this.expect(":");
      const value = this.parseValue();
      result[String(key)] = value;
      this.skipWhitespace();
      if (this.consume("}")) return result;
      this.expect(",");
      this.skipWhitespace();
      if (this.consume("}")) return result;
    }
  }

  private parseSequence(close: "]" | ")"): unknown[] {
    const open = close === "]" ? "[" : "(";
    const result: unknown[] = [];
    this.expect(open);
    this.skipWhitespace();
    if (this.consume(close)) return result;

    while (true) {
      result.push(this.parseValue());
      this.skipWhitespace();
      if (this.consume(close)) return result;
      this.expect(",");
      this.skipWhitespace();
      if (this.consume(close)) return result;
    }
  }

  private parseString(): string {
    const quote = this.next();
    let result = "";

    while (!this.isDone()) {
      const char = this.next();
      if (char === quote) return result;
      if (char !== "\\") {
        result += char;
        continue;
      }

      if (this.isDone()) throw this.error("Unterminated escape sequence");
      const escaped = this.next();
      switch (escaped) {
        case "n":
          result += "\n";
          break;
        case "r":
          result += "\r";
          break;
        case "t":
          result += "\t";
          break;
        case "b":
          result += "\b";
          break;
        case "f":
          result += "\f";
          break;
        case "u": {
          const hex = this.text.slice(this.index, this.index + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw this.error("Invalid unicode escape");
          result += String.fromCharCode(Number.parseInt(hex, 16));
          this.index += 4;
          break;
        }
        default:
          result += escaped;
          break;
      }
    }

    throw this.error("Unterminated string literal");
  }

  private parseNumber(): number {
    const rest = this.text.slice(this.index);
    const match = /^[+-]?(?:(?:\d[\d_]*(?:\.\d[\d_]*)?)|(?:\.\d[\d_]*))(?:[eE][+-]?\d[\d_]*)?/
      .exec(rest);
    if (!match) throw this.error("Expected number");
    this.index += match[0].length;
    return Number(match[0].replaceAll("_", ""));
  }

  private parseIdentifier(): unknown {
    const rest = this.text.slice(this.index);
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (!match) throw this.error("Expected value");
    this.index += match[0].length;

    switch (match[0]) {
      case "True":
        return true;
      case "False":
        return false;
      case "None":
        return null;
      default:
        throw this.error(`Unknown identifier: ${match[0]}`);
    }
  }

  private skipWhitespace(): void {
    while (!this.isDone() && /\s/.test(this.peek())) this.index += 1;
  }

  private expect(char: string): void {
    if (!this.consume(char)) throw this.error(`Expected ${char}`);
  }

  private consume(char: string): boolean {
    if (this.peek() !== char) return false;
    this.index += 1;
    return true;
  }

  private next(): string {
    const char = this.peek();
    this.index += 1;
    return char;
  }

  private peek(): string {
    return this.text[this.index] ?? "";
  }

  private isDone(): boolean {
    return this.index >= this.text.length;
  }

  private error(message: string): FormatParseError {
    return new FormatParseError(`${message} at position ${this.index}`);
  }
}
