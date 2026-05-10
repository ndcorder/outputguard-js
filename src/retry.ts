import { formatLabel } from "./formats.js";
import type { FormatOptions, ValidationError } from "./types.js";

function describeSchema(schema: Record<string, unknown>, depth = 0, maxDepth = 2): string[] {
  const lines: string[] = [];
  const type = (schema.type as string) ?? "any";
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required ?? []) as string[];
  const indent = "  ".repeat(depth);

  const propEntries = Object.entries(properties);
  if (propEntries.length > 0) {
    const propDescriptions = propEntries.map(([name, propSchema]) => {
      const propType = (propSchema.type as string) ?? "any";
      const reqMarker = required.includes(name) ? " (required)" : "";
      return `${name} (${propType}${reqMarker})`;
    });

    if (depth === 0) {
      lines.unshift(`${indent}- A root ${type} with properties: ${propDescriptions.join(", ")}`);
    } else {
      lines.push(`${indent}- Contains properties: ${propDescriptions.join(", ")}`);
    }

    if (depth < maxDepth) {
      for (const [, propSchema] of propEntries) {
        const propType = (propSchema.type as string) ?? "any";
        if (propType === "object" || propType === "array") {
          const nested = propType === "array"
            ? (propSchema.items as Record<string, unknown>) ?? {}
            : propSchema;
          lines.push(...describeSchema(nested, depth + 1, maxDepth));
        }
      }
    }
  }

  return lines;
}

function truncate(text: string, maxLen = 500): string {
  if (text.length <= maxLen) return text;
  const half = Math.floor(maxLen / 2);
  return text.slice(0, half) + "\n...\n" + text.slice(-half);
}

export function retryPrompt(
  text: string,
  schema: Record<string, unknown>,
  errors: ValidationError[],
  options: FormatOptions = {},
): string {
  const label = formatLabel(options.format ?? "json");
  const parts: string[] = [
    `The ${label} output you provided does not match the required schema. ` +
    `Please fix the following errors and return ONLY valid ${label} with ` +
    "no additional text or markdown formatting:",
    "",
    "Errors found:",
  ];

  errors.forEach((err, i) => {
    parts.push(`${i + 1}. At ${err.path}: ${err.message}`);
  });

  const schemaSummary = describeSchema(schema);
  if (schemaSummary.length > 0) {
    parts.push("", "The expected schema requires:");
    parts.push(...schemaSummary);
  }

  parts.push("", "Original output:", truncate(text), "", `Return ONLY the corrected ${label}.`);

  return parts.join("\n");
}
