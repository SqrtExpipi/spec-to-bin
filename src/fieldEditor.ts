import {
  encodeString,
  parseHexBytes,
  type BinaryTemplate,
  type EncodingName,
  type Endian,
  type FieldDefinition,
  type FieldType,
  type PaddingMode
} from "./core";

export const fieldTypeOptions: FieldType[] = [
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "int8",
  "int16",
  "int32",
  "int64",
  "bytes",
  "string",
  "ipv4",
  "padding"
];

export const endianOptions: Endian[] = ["big", "little", "unknown"];
export const encodingOptions: EncodingName[] = ["ascii", "utf-8", "shift_jis", "unknown"];
export const paddingOptions: PaddingMode[] = ["zero", "space"];

export function usesEndian(type: FieldType): boolean {
  return (
    type === "uint16" ||
    type === "uint32" ||
    type === "uint64" ||
    type === "int16" ||
    type === "int32" ||
    type === "int64"
  );
}

export function usesLength(type: FieldType): boolean {
  return type === "bytes" || type === "string" || type === "padding";
}

export function getFieldByteUsage(
  field: FieldDefinition,
  template: BinaryTemplate
): { used: number; max: number } | undefined {
  if (typeof field.length !== "number" || field.length <= 0) {
    return undefined;
  }

  if (field.type === "string") {
    try {
      const encoding = field.encoding ?? template.defaultEncoding ?? "unknown";
      if (encoding === "unknown") {
        return undefined;
      }
      return {
        used: encodeString(String(field.value ?? ""), encoding).length,
        max: field.length
      };
    } catch {
      return undefined;
    }
  }

  if (field.type === "bytes" && field.value !== undefined && field.value !== "") {
    const parsed = parseHexBytes(field.value);
    if (parsed.ok) {
      return { used: parsed.bytes.length, max: field.length };
    }
  }

  return undefined;
}
