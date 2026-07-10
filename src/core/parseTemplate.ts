import {
  supportedEncodings,
  supportedEndians,
  supportedPaddings,
  type BinaryTemplate,
  type EncodingName,
  type Endian,
  type FieldDefinition,
  type FieldType,
  type PaddingMode,
  type ValidationIssue
} from "./types";
import { templateLimits } from "./limits";

const topLevelProperties = new Set([
  "formatVersion",
  "name",
  "defaultEndian",
  "defaultEncoding",
  "fields"
]);

const fieldProperties = new Set([
  "name",
  "type",
  "value",
  "offset",
  "length",
  "endian",
  "encoding",
  "padding",
  "fill",
  "fixed",
  "needsReview",
  "note"
]);

const supportedFieldTypes: FieldType[] = [
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

export interface ParseTemplateResult {
  template: BinaryTemplate;
  issues: ValidationIssue[];
}

export function parseBinaryTemplate(input: unknown): ParseTemplateResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      template: emptyTemplate(),
      issues: [templateIssue("error", "template.invalid")]
    };
  }

  const template: BinaryTemplate = {
    ...unknownProperties(input, topLevelProperties),
    formatVersion: stringValue(input.formatVersion) ?? "",
    name: stringValue(input.name) ?? "",
    fields: []
  };

  for (const property of Object.keys(input)) {
    if (!topLevelProperties.has(property)) {
      issues.push(templateIssue("warning", "template.property.unknown", { property }));
    }
  }

  const defaultEndian = normalizeEndian(input.defaultEndian);
  if (defaultEndian.ok) {
    template.defaultEndian = defaultEndian.value;
  } else if (input.defaultEndian !== undefined) {
    issues.push(templateIssue("error", "endian.invalid", { endian: String(input.defaultEndian) }));
  }

  const defaultEncoding = normalizeEncoding(input.defaultEncoding);
  if (defaultEncoding.ok) {
    template.defaultEncoding = defaultEncoding.value;
  } else if (input.defaultEncoding !== undefined) {
    issues.push(
      templateIssue("error", "encoding.unsupported", { encoding: String(input.defaultEncoding) })
    );
  }

  if (!Array.isArray(input.fields)) {
    issues.push(templateIssue("error", "template.fields.required"));
    return { template, issues };
  }

  if (input.fields.length > templateLimits.maxFields) {
    issues.push(
      templateIssue("error", "template.fields.tooMany", {
        actual: input.fields.length,
        max: templateLimits.maxFields
      })
    );
  }

  template.fields = input.fields
    .slice(0, templateLimits.maxFields)
    .map((rawField, index) => parseField(rawField, index, issues));
  return { template, issues };
}

function parseField(rawField: unknown, index: number, issues: ValidationIssue[]): FieldDefinition {
  if (!isRecord(rawField)) {
    issues.push(fieldIssue("error", "field.invalid", index));
    return {
      name: `field_${index + 1}`,
      type: "bytes",
      length: 0
    };
  }

  const fieldType = normalizeFieldType(rawField.type);
  if (!fieldType.ok) {
    issues.push(
      fieldIssue("error", "field.type.invalid", index, stringValue(rawField.name), {
        type: String(rawField.type)
      })
    );
  }

  const field: FieldDefinition = {
    ...unknownProperties(rawField, fieldProperties),
    name: stringValue(rawField.name) ?? "",
    type: fieldType.ok ? fieldType.value : "bytes"
  };

  for (const property of Object.keys(rawField)) {
    if (!fieldProperties.has(property)) {
      issues.push(
        fieldIssue("warning", "field.property.unknown", index, field.name, { property })
      );
    }
  }

  const value = primitiveValue(rawField.value);
  if (value !== undefined) {
    field.value = value;
  } else if (rawField.value !== undefined) {
    issues.push(fieldIssue("error", "field.value.invalid", index, field.name));
  }

  const offset = integerValue(rawField.offset);
  if (offset.ok) {
    field.offset = offset.value;
  } else if (rawField.offset !== undefined) {
    issues.push(fieldIssue("error", "field.offset.invalid", index, field.name));
  }

  const length = integerValue(rawField.length);
  if (length.ok) {
    field.length = length.value;
  } else if (rawField.length !== undefined) {
    issues.push(fieldIssue("error", "field.length.invalid", index, field.name));
  }

  const endian = normalizeEndian(rawField.endian);
  if (endian.ok) {
    field.endian = endian.value;
  } else if (rawField.endian !== undefined) {
    issues.push(
      fieldIssue("error", "endian.invalid", index, field.name, { endian: String(rawField.endian) })
    );
  }

  const encoding = normalizeEncoding(rawField.encoding);
  if (encoding.ok) {
    field.encoding = encoding.value;
  } else if (rawField.encoding !== undefined) {
    issues.push(
      fieldIssue("error", "encoding.unsupported", index, field.name, {
        encoding: String(rawField.encoding)
      })
    );
  }

  const padding = normalizePadding(rawField.padding);
  if (padding.ok) {
    field.padding = padding.value;
  } else if (rawField.padding !== undefined) {
    issues.push(
      fieldIssue("error", "padding.invalid", index, field.name, {
        padding: String(rawField.padding)
      })
    );
  }

  const fill = stringValue(rawField.fill);
  if (fill !== undefined) {
    field.fill = fill;
  } else if (rawField.fill !== undefined) {
    issues.push(fieldIssue("error", "bytes.invalidFill", index, field.name));
  }

  const fixed = booleanValue(rawField.fixed);
  if (fixed !== undefined) {
    field.fixed = fixed;
  }

  const needsReview = booleanValue(rawField.needsReview);
  if (needsReview !== undefined) {
    field.needsReview = needsReview;
  }

  const note = stringValue(rawField.note);
  if (note !== undefined) {
    field.note = note;
  }

  return field;
}

function emptyTemplate(): BinaryTemplate {
  return {
    formatVersion: "",
    name: "",
    fields: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function primitiveValue(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function unknownProperties(
  value: Record<string, unknown>,
  knownProperties: Set<string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([property]) => !knownProperties.has(property))
  );
}

function integerValue(value: unknown): { ok: true; value: number } | { ok: false } {
  if (typeof value === "number" && Number.isInteger(value)) {
    return { ok: true, value };
  }

  if (typeof value === "string" && /^[+-]?\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? { ok: true, value: parsed } : { ok: false };
  }

  return { ok: false };
}

function normalizeFieldType(value: unknown): { ok: true; value: FieldType } | { ok: false } {
  if (typeof value !== "string") {
    return { ok: false };
  }

  const normalized = value.toLowerCase();
  return supportedFieldTypes.includes(normalized as FieldType)
    ? { ok: true, value: normalized as FieldType }
    : { ok: false };
}

function normalizeEndian(value: unknown): { ok: true; value: Endian } | { ok: false } {
  if (value === undefined) {
    return { ok: false };
  }

  if (typeof value !== "string") {
    return { ok: false };
  }

  const normalized = value.toLowerCase();
  return supportedEndians.includes(normalized as Endian)
    ? { ok: true, value: normalized as Endian }
    : { ok: false };
}

function normalizeEncoding(value: unknown): { ok: true; value: EncodingName } | { ok: false } {
  if (value === undefined) {
    return { ok: false };
  }

  if (typeof value !== "string") {
    return { ok: false };
  }

  const normalized = value.toLowerCase().replace("-", "_");
  const aliases: Record<string, EncodingName> = {
    ascii: "ascii",
    utf8: "utf-8",
    utf_8: "utf-8",
    "utf-8": "utf-8",
    shift_jis: "shift_jis",
    shiftjis: "shift_jis",
    sjis: "shift_jis",
    unknown: "unknown"
  };

  const encoding = aliases[normalized];
  return encoding && supportedEncodings.includes(encoding)
    ? { ok: true, value: encoding }
    : { ok: false };
}

function normalizePadding(value: unknown): { ok: true; value: PaddingMode } | { ok: false } {
  if (value === undefined) {
    return { ok: false };
  }

  if (typeof value !== "string") {
    return { ok: false };
  }

  const normalized = value.toLowerCase();
  return supportedPaddings.includes(normalized as PaddingMode)
    ? { ok: true, value: normalized as PaddingMode }
    : { ok: false };
}

function templateIssue(
  level: ValidationIssue["level"],
  code: string,
  messageParams?: ValidationIssue["messageParams"]
): ValidationIssue {
  return { level, code, messageParams };
}

function fieldIssue(
  level: ValidationIssue["level"],
  code: string,
  fieldIndex: number,
  fieldName?: string,
  messageParams?: ValidationIssue["messageParams"]
): ValidationIssue {
  return {
    level,
    code,
    fieldIndex,
    fieldName,
    messageParams
  };
}
