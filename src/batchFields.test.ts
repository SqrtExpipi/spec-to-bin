import { describe, expect, it } from "vitest";
import { generateFixedStringValue, repeatSelectedFields } from "./batchFields";
import { encodeString, type BinaryTemplate, type FieldDefinition } from "./core";

describe("repeatSelectedFields", () => {
  const fields: FieldDefinition[] = [
    { name: "name", type: "uint8", offset: 0, value: 1 },
    { name: "label", type: "string", offset: 1, length: 4, value: "A" },
    { name: "tail", type: "uint16", offset: 5, value: 2 }
  ];

  it("expands the selected block to the requested total with padded names", () => {
    const result = repeatSelectedFields(fields, [0, 1], {
      totalCount: 3,
      nameMode: "appendPadded",
      recalculateOffsets: true
    });

    expect(result.fields.map((field) => field.name)).toEqual([
      "name_01",
      "label_01",
      "name_02",
      "label_02",
      "name_03",
      "label_03",
      "tail"
    ]);
    expect(result.fields.map((field) => field.offset)).toEqual([0, 1, 5, 6, 10, 11, 15]);
  });

  it("increments an existing numeric suffix while preserving its width", () => {
    const result = repeatSelectedFields([{ name: "record_09", type: "uint8" }], [0], {
      totalCount: 3,
      nameMode: "increment",
      recalculateOffsets: false
    });
    expect(result.fields.map((field) => field.name)).toEqual(["record_09", "record_10", "record_11"]);
  });

  it("rejects a non-contiguous record selection", () => {
    expect(() =>
      repeatSelectedFields(fields, [0, 2], {
        totalCount: 2,
        nameMode: "append",
        recalculateOffsets: false
      })
    ).toThrow("contiguous");
  });
});

describe("generateFixedStringValue", () => {
  const template: BinaryTemplate = {
    formatVersion: "0.1",
    name: "test",
    defaultEncoding: "shift_jis",
    fields: []
  };

  it("fills Shift_JIS strings to the exact byte length", () => {
    const field: FieldDefinition = { name: "text", type: "string", length: 7, value: "" };
    const generated = generateFixedStringValue(field, template, {
      mode: "fullWidthMax",
      fullWidthRemainder: "ascii"
    });
    expect(encodeString(generated, "shift_jis")).toHaveLength(7);
    expect(generated).toBe("あああA");
  });

  it("keeps the current value and fills only the remainder", () => {
    const field: FieldDefinition = { name: "text", type: "string", length: 8, value: "ID" };
    expect(generateFixedStringValue(field, template, { mode: "keepAndFill", customFill: "A" })).toBe(
      "IDAAAAAA"
    );
  });

  it("rejects a full-width remainder when exact filling is required", () => {
    const field: FieldDefinition = { name: "text", type: "string", length: 3 };
    expect(() =>
      generateFixedStringValue(field, template, {
        mode: "fullWidthMax",
        fullWidthRemainder: "error"
      })
    ).toThrow();
  });
});
