import { encodeString } from "./encodeString";
import { calculateFieldLayout, getFieldSize } from "./layout";
import { parseFillByte, parseHexBytes, parseIntegerValue } from "./parse";
import {
  integerTypes,
  supportedEncodings,
  type BinaryTemplate,
  type FieldDefinition,
  type FieldType,
  type ValidationIssue
} from "./types";

const fieldTypes: FieldType[] = [
  "uint8",
  "uint16",
  "uint32",
  "int8",
  "int16",
  "int32",
  "bytes",
  "string",
  "ipv4",
  "padding"
];

function issue(
  level: ValidationIssue["level"],
  code: string,
  fieldIndex?: number,
  field?: FieldDefinition,
  messageParams?: ValidationIssue["messageParams"]
): ValidationIssue {
  return {
    level,
    code,
    fieldIndex,
    fieldName: field?.name,
    messageParams
  };
}

export function validateTemplate(template: BinaryTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!template || typeof template !== "object") {
    return [issue("error", "template.invalid")];
  }

  if (!template.formatVersion) {
    issues.push(issue("error", "template.formatVersion.required"));
  }

  if (!template.name) {
    issues.push(issue("error", "template.name.required"));
  }

  if (!Array.isArray(template.fields)) {
    issues.push(issue("error", "template.fields.required"));
    return issues;
  }

  if (template.fields.length === 0) {
    issues.push(issue("warning", "template.fields.empty"));
  }

  template.fields.forEach((field, index) => {
    if (!field.name) {
      issues.push(issue("error", "field.name.required", index, field));
    }

    if (!field.type || !fieldTypes.includes(field.type)) {
      issues.push(issue("error", "field.type.invalid", index, field, { type: String(field.type) }));
      return;
    }

    if (field.needsReview) {
      issues.push(issue("warning", "review.required", index, field));
    }

    if (field.type in integerTypes) {
      const info = integerTypes[field.type as keyof typeof integerTypes];
      const parsed = parseIntegerValue(field.value ?? 0);

      if (!parsed.ok) {
        issues.push(issue("error", "number.invalid", index, field));
      } else if (parsed.value < info.min || parsed.value > info.max) {
        issues.push(
          issue("error", "number.outOfRange", index, field, {
            min: info.min,
            max: info.max,
            value: parsed.value
          })
        );
      }

      if (info.size > 1) {
        const endian = field.endian ?? template.defaultEndian;
        if (!endian || endian === "unknown") {
          issues.push(issue("warning", "endian.unknown", index, field));
        }
      }
    }

    if (field.type === "string") {
      validateLengthField(issues, field, index);
      const encoding = field.encoding ?? template.defaultEncoding ?? "utf-8";

      if (encoding === "unknown") {
        issues.push(issue("warning", "encoding.unknown", index, field));
      } else if (!supportedEncodings.includes(encoding)) {
        issues.push(issue("error", "encoding.unsupported", index, field, { encoding }));
      } else if (typeof field.length === "number" && field.length > 0) {
        try {
          const bytes = encodeString(String(field.value ?? ""), encoding);
          if (bytes.length > field.length) {
            issues.push(
              issue("error", "string.tooLong", index, field, {
                used: bytes.length,
                max: field.length
              })
            );
          }
        } catch {
          issues.push(issue("error", "string.encodeFailed", index, field, { encoding }));
        }
      }
    }

    if (field.type === "bytes") {
      validateLengthField(issues, field, index);

      if (field.value !== undefined && field.value !== "") {
        const parsed = parseHexBytes(field.value);
        if (!parsed.ok) {
          issues.push(issue("error", "bytes.invalidHex", index, field));
        } else if (typeof field.length === "number" && parsed.bytes.length !== field.length) {
          issues.push(
            issue("error", "bytes.lengthMismatch", index, field, {
              actual: parsed.bytes.length,
              expected: field.length
            })
          );
        }
      }

      if (field.fill !== undefined && !parseFillByte(field.fill).ok) {
        issues.push(issue("error", "bytes.invalidFill", index, field));
      }
    }

    if (field.type === "padding") {
      validateLengthField(issues, field, index);
      if (field.value !== undefined && field.value !== "") {
        issues.push(issue("warning", "reserved.unexpectedValue", index, field));
      }
      if (field.fill !== undefined && !parseFillByte(field.fill).ok) {
        issues.push(issue("error", "bytes.invalidFill", index, field));
      }
    }

    if (field.type === "ipv4" && !isValidIpv4(String(field.value ?? ""))) {
      issues.push(issue("error", "ipv4.invalid", index, field));
    }

    if (getFieldSize(field) === 0 && ["string", "bytes", "padding"].includes(field.type)) {
      issues.push(issue("error", "field.length.required", index, field));
    }
  });

  calculateFieldLayout(template);
  return issues;
}

function validateLengthField(issues: ValidationIssue[], field: FieldDefinition, index: number): void {
  if (typeof field.length !== "number" || !Number.isInteger(field.length) || field.length <= 0) {
    issues.push(issue("error", "field.length.required", index, field));
  }
}

export function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}
