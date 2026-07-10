import { encodeString } from "./encodeString";
import { calculateFieldLayout } from "./layout";
import { templateLimits } from "./limits";
import { parseBinaryTemplate } from "./parseTemplate";
import { parseBigIntegerValue, parseFillByte, parseHexBytes, parseIntegerValue } from "./parse";
import {
  bigIntegerTypes,
  integerTypes,
  isBigIntegerType,
  isIntegerType,
  numberIntegerTypes,
  supportedEncodings,
  type BinaryTemplate,
  type FieldDefinition,
  type FieldType,
  type ValidationIssue
} from "./types";

export const fieldTypes: FieldType[] = [
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

export function validateTemplate(templateInput: unknown): ValidationIssue[] {
  const parsed = parseBinaryTemplate(templateInput);
  return [...parsed.issues, ...validateParsedTemplate(parsed.template)];
}

export function validateParsedTemplate(template: BinaryTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!template.formatVersion) {
    issues.push(issue("error", "template.formatVersion.required"));
  } else if (template.formatVersion !== "0.1") {
    issues.push(issue("error", "template.formatVersion.unsupported", undefined, undefined, {
      version: template.formatVersion
    }));
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

  if (template.fields.length > templateLimits.maxFields) {
    issues.push(
      issue("error", "template.fields.tooMany", undefined, undefined, {
        actual: template.fields.length,
        max: templateLimits.maxFields
      })
    );
  }

  const layouts = calculateFieldLayout(template);
  const fieldNameCounts = new Map<string, number>();
  for (const field of template.fields) {
    if (field.name) {
      fieldNameCounts.set(field.name, (fieldNameCounts.get(field.name) ?? 0) + 1);
    }
  }

  template.fields.forEach((field, index) => {
    if (!field.name) {
      issues.push(issue("error", "field.name.required", index, field));
    } else if ((fieldNameCounts.get(field.name) ?? 0) > 1) {
      issues.push(issue("warning", "field.name.duplicate", index, field, { name: field.name }));
    }

    if (!field.type || !fieldTypes.includes(field.type)) {
      issues.push(issue("error", "field.type.invalid", index, field, { type: String(field.type) }));
      return;
    }

    if (field.needsReview) {
      issues.push(issue("error", "review.required", index, field));
    }

    validateApplicableProperties(issues, field, index);

    if (isIntegerType(field.type)) {
      const info = integerTypes[field.type];
      if (field.value === undefined || field.value === "") {
        issues.push(issue("error", "field.value.required", index, field));
      } else if (isBigIntegerType(field.type)) {
        if (typeof field.value !== "string") {
          issues.push(issue("error", "number.stringRequired64", index, field));
        } else {
          const parsed = parseBigIntegerValue(field.value);
          const range = bigIntegerTypes[field.type];

          if (!parsed.ok) {
            issues.push(issue("error", "number.invalid", index, field));
          } else if (parsed.value < range.min || parsed.value > range.max) {
            issues.push(
              issue("error", "number.outOfRange", index, field, {
                min: range.min.toString(),
                max: range.max.toString(),
                value: parsed.value.toString()
              })
            );
          }
        }
      } else {
        const parsed = parseIntegerValue(field.value);
        const range = numberIntegerTypes[field.type];

        if (!parsed.ok) {
          issues.push(issue("error", "number.invalid", index, field));
        } else if (parsed.value < range.min || parsed.value > range.max) {
          issues.push(
            issue("error", "number.outOfRange", index, field, {
              min: range.min,
              max: range.max,
              value: parsed.value
            })
          );
        }
      }

      if (info.size > 1) {
        const endian = field.endian ?? template.defaultEndian;
        if (!endian || endian === "unknown") {
          issues.push(issue("error", "endian.unknown", index, field));
        }
      }
    }

    if (field.type === "string") {
      validateLengthField(issues, field, index);
      if (field.value === undefined) {
        issues.push(issue("error", "field.value.required", index, field));
      }
      const encoding = field.encoding ?? template.defaultEncoding;

      if (!encoding || encoding === "unknown") {
        issues.push(issue("error", "encoding.unknown", index, field));
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

      if ((field.value === undefined || field.value === "") && field.fill === undefined) {
        issues.push(issue("error", "field.value.required", index, field));
      }

      if (field.value !== undefined && field.value !== "" && field.fill !== undefined) {
        issues.push(issue("error", "bytes.ambiguousSource", index, field));
      }

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
        issues.push(issue("error", "reserved.unexpectedValue", index, field));
      }
      if (field.fill !== undefined && !parseFillByte(field.fill).ok) {
        issues.push(issue("error", "bytes.invalidFill", index, field));
      }
    }

    if (field.type === "ipv4" && !isValidIpv4(String(field.value ?? ""))) {
      issues.push(issue("error", "ipv4.invalid", index, field));
    }

    if (field.offset !== undefined) {
      if (!Number.isInteger(field.offset) || field.offset < 0) {
        issues.push(issue("error", "field.offset.invalid", index, field));
      } else {
        const layout = layouts[index];
        if (layout && field.offset !== layout.offset) {
          issues.push(
            issue("error", "field.offsetMismatch", index, field, {
              actual: layout.offset,
              expected: field.offset
            })
          );
        }
      }
    }

  });

  const totalSize = layouts.reduce((sum, layout) => sum + layout.size, 0);
  if (!Number.isSafeInteger(totalSize) || totalSize > templateLimits.maxTotalBytes) {
    issues.push(
      issue("error", "template.totalSize.tooLarge", undefined, undefined, {
        actual: totalSize,
        max: templateLimits.maxTotalBytes
      })
    );
  }

  return issues;
}

function validateApplicableProperties(
  issues: ValidationIssue[],
  field: FieldDefinition,
  index: number
): void {
  const applicable = new Set<keyof FieldDefinition>();
  if (
    field.type === "uint16" ||
    field.type === "uint32" ||
    field.type === "uint64" ||
    field.type === "int16" ||
    field.type === "int32" ||
    field.type === "int64"
  ) {
    applicable.add("endian");
  }
  if (field.type === "bytes" || field.type === "string" || field.type === "padding") {
    applicable.add("length");
  }
  if (field.type === "bytes" || field.type === "padding") {
    applicable.add("fill");
  }
  if (field.type === "string") {
    applicable.add("encoding");
    applicable.add("padding");
  }

  const conditionalProperties: (keyof FieldDefinition)[] = [
    "length",
    "endian",
    "encoding",
    "padding",
    "fill"
  ];
  for (const property of conditionalProperties) {
    if (field[property] !== undefined && !applicable.has(property)) {
      issues.push(
        issue("warning", "field.property.inapplicable", index, field, {
          property,
          type: field.type
        })
      );
    }
  }
}

function validateLengthField(issues: ValidationIssue[], field: FieldDefinition, index: number): void {
  if (typeof field.length !== "number" || !Number.isInteger(field.length) || field.length <= 0) {
    issues.push(issue("error", "field.length.required", index, field));
  } else if (field.length > templateLimits.maxFieldBytes) {
    issues.push(
      issue("error", "field.length.tooLarge", index, field, {
        actual: field.length,
        max: templateLimits.maxFieldBytes
      })
    );
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
