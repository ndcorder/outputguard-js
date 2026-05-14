import type { ValidationError } from "../src/types.js";
import { retryPrompt } from "../src/retry.js";

describe("TestRetryPrompt", () => {
  it("contains errors", () => {
    const errors: ValidationError[] = [
      {
        message: "expected number",
        path: "$.price",
        schemaPath: "properties.price.type",
      },
    ];
    const prompt = retryPrompt(
      '{"price": "free"}',
      { type: "object", properties: { price: { type: "number" } } },
      errors,
    );
    expect(prompt).toContain("$.price");
    expect(prompt).toContain("expected number");
  });

  it("contains schema summary", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "integer" } },
      required: ["name", "age"],
    };
    const errors: ValidationError[] = [
      { message: "missing", path: "$", schemaPath: "required" },
    ];
    const prompt = retryPrompt("{}", schema, errors);
    expect(prompt).toContain("name");
    expect(prompt).toContain("age");
  });

  it("long output truncated", () => {
    const longText = '{"x": "' + "a".repeat(1000) + '"}';
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt(longText, { type: "object" }, errors);
    expect(prompt).toContain("...");
    expect(prompt.length).toBeLessThan(longText.length + 500);
  });

  it("describes nested object properties in schema", () => {
    const schema = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
      required: ["user"],
    };
    const errors: ValidationError[] = [
      { message: "missing", path: "$", schemaPath: "required" },
    ];
    const prompt = retryPrompt("{}", schema, errors);
    expect(prompt).toContain("user");
    expect(prompt).toContain("name");
    expect(prompt).toContain("Contains properties");
  });

  it("describes nested array items in schema", () => {
    const schema = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
            },
          },
        },
      },
    };
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt("{}", schema, errors);
    expect(prompt).toContain("id");
  });

  it("can omit message history", () => {
    const errors: ValidationError[] = [
      { message: "err", path: "$", schemaPath: "" },
    ];
    const prompt = retryPrompt(
      '{"secret": "do not repeat"}',
      { type: "object" },
      errors,
      { includeMessageHistory: false },
    );

    expect(prompt).not.toContain("Original output:");
    expect(prompt).not.toContain("do not repeat");
    expect(prompt).toContain("err");
  });
});
