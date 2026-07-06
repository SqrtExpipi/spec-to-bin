import { encodeString, padFixedStringBytes } from "./encodeString";
import { calculateFieldLayout } from "./layout";
import { parseFillByte, parseHexBytes, parseIntegerValue } from "./parse";
import { validateTemplate } from "./validateTemplate";
import { integerTypes, type BinaryTemplate, type FieldDefinition, type BuildResult } from "./types";

export function buildBinary(template: BinaryTemplate): BuildResult {
  const layouts = calculateFieldLayout(template);
  const issues = validateTemplate(template);
  const hasError = issues.some((issue) => issue.level === "error");

  if (hasError) {
    return {
      bytes: new Uint8Array(),
      layouts,
      issues
    };
  }

  const totalSize = layouts.reduce((sum, layout) => sum + layout.size, 0);
  const bytes = new Uint8Array(totalSize);

  for (const layout of layouts) {
    const fieldBytes = buildFieldBytes(layout.field, template);
    bytes.set(fieldBytes, layout.offset);
  }

  return { bytes, layouts, issues };
}

function buildFieldBytes(field: FieldDefinition, template: BinaryTemplate): Uint8Array {
  if (field.type in integerTypes) {
    return buildIntegerBytes(field, template);
  }

  if (field.type === "string") {
    const encoding = field.encoding ?? template.defaultEncoding ?? "utf-8";
    const raw = encodeString(String(field.value ?? ""), encoding);
    return padFixedStringBytes(raw, field.length ?? raw.length, field.padding ?? "zero");
  }

  if (field.type === "ipv4") {
    return new Uint8Array(String(field.value ?? "0.0.0.0").split(".").map((part) => Number(part)));
  }

  if (field.type === "bytes") {
    if (field.value !== undefined && field.value !== "") {
      const parsed = parseHexBytes(field.value);
      return parsed.ok ? parsed.bytes : new Uint8Array();
    }

    const fill = parseFillByte(field.fill);
    const output = new Uint8Array(field.length ?? 0);
    output.fill(fill.ok ? fill.value : 0x00);
    return output;
  }

  if (field.type === "padding") {
    const fill = parseFillByte(field.fill);
    const output = new Uint8Array(field.length ?? 0);
    output.fill(fill.ok ? fill.value : 0x00);
    return output;
  }

  return new Uint8Array();
}

function buildIntegerBytes(field: FieldDefinition, template: BinaryTemplate): Uint8Array {
  const info = integerTypes[field.type as keyof typeof integerTypes];
  const parsed = parseIntegerValue(field.value ?? 0);
  const value = parsed.ok ? parsed.value : 0;
  const output = new Uint8Array(info.size);
  const view = new DataView(output.buffer);
  const littleEndian = (field.endian ?? template.defaultEndian) === "little";

  if (field.type === "uint8") view.setUint8(0, value);
  if (field.type === "int8") view.setInt8(0, value);
  if (field.type === "uint16") view.setUint16(0, value, littleEndian);
  if (field.type === "int16") view.setInt16(0, value, littleEndian);
  if (field.type === "uint32") view.setUint32(0, value, littleEndian);
  if (field.type === "int32") view.setInt32(0, value, littleEndian);

  return output;
}
