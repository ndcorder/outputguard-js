import Ajv from "ajv";
import addFormats from "ajv-formats";
import { FormatParseError, parseDocument } from "./formats.js";
import type { FormatOptions, ValidationError, ValidationResult } from "./types.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function ajvPathToJsonPath(path: string): string {
  // Ajv uses paths like "/items/0/name" — convert to "$.items[0].name"
  if (!path) return "$";
  return "$" + path.replace(/\/(\d+)/g, "[$1]").replace(/\//g, ".");
}

export function validate(
  text: string,
  schema: Record<string, unknown>,
  options: FormatOptions = {},
): ValidationResult {
  const format = options.format ?? "json";
  let data: unknown;
  try {
    data = parseDocument(text, format);
  } catch (e) {
    if (!(e instanceof FormatParseError)) throw e;
    return {
      valid: false,
      data: null,
      errors: [{
        message: (e as Error).message,
        path: "$",
        schemaPath: "",
      }],
      repaired: false,
      strategiesApplied: [],
      originalText: text,
      repairedText: "",
      format,
    };
  }

  const validateFn = ajv.compile(schema);
  const valid = validateFn(data);
  const errors: ValidationError[] = [];

  if (!valid && validateFn.errors) {
    for (const err of validateFn.errors) {
      errors.push({
        message: err.message ?? "Unknown validation error",
        path: ajvPathToJsonPath(err.instancePath),
        schemaPath: err.schemaPath ?? "",
        value: err.data,
      });
    }
  }

  return {
    valid: errors.length === 0,
    data,
    errors,
    repaired: false,
    strategiesApplied: [],
    originalText: text,
    repairedText: "",
    format,
  };
}
