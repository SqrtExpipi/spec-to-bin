import { encodeString, getFieldSize, type BinaryTemplate, type EncodingName, type FieldDefinition } from "./core";

export type RepeatNameMode = "keep" | "append" | "appendPadded" | "increment";
export type TestValueMode =
  | "asciiMax"
  | "fullWidthMax"
  | "keepAndFill"
  | "customFill"
  | "digits"
  | "empty"
  | "leaveOneByte";
export type FullWidthRemainder = "ascii" | "short" | "error";

export interface RepeatFieldsOptions {
  totalCount: number;
  nameMode: RepeatNameMode;
  recalculateOffsets: boolean;
}

export interface TestValueOptions {
  mode: TestValueMode;
  customFill?: string;
  fullWidthRemainder?: FullWidthRemainder;
}

export function repeatSelectedFields(
  fields: FieldDefinition[],
  selectedIndices: number[],
  options: RepeatFieldsOptions
): { fields: FieldDefinition[]; generatedIndices: number[] } {
  const indices = normalizeIndices(selectedIndices, fields.length);
  if (indices.length === 0 || options.totalCount < 2) {
    return { fields, generatedIndices: indices };
  }

  const selected = indices.map((index) => fields[index]);
  const first = indices[0];
  const last = indices.at(-1) as number;
  if (last - first + 1 !== indices.length) {
    throw new Error("Selected fields must be contiguous.");
  }
  const before = fields.slice(0, first);
  const repeated = Array.from({ length: options.totalCount }, (_, repeatIndex) =>
    selected.map((field) => ({
      ...field,
      name: repeatFieldName(field.name, repeatIndex, options.nameMode)
    }))
  ).flat();

  let nextFields = [...before, ...repeated, ...fields.slice(last + 1)];
  if (options.recalculateOffsets) {
    nextFields = recalculateFieldOffsets(nextFields);
  }
  return {
    fields: nextFields,
    generatedIndices: Array.from({ length: repeated.length }, (_, index) => before.length + index)
  };
}

export function recalculateFieldOffsets(fields: FieldDefinition[]): FieldDefinition[] {
  let offset = 0;
  return fields.map((field) => {
    const next = { ...field, offset };
    offset += getFieldSize(field);
    return next;
  });
}

export function generateFixedStringValue(
  field: FieldDefinition,
  template: BinaryTemplate,
  options: TestValueOptions
): string {
  if (field.type !== "string" || !Number.isInteger(field.length) || (field.length ?? 0) < 0) {
    throw new Error("A fixed-length string field is required.");
  }
  const encoding = field.encoding ?? template.defaultEncoding ?? "unknown";
  if (encoding === "unknown") {
    throw new Error("The string encoding is unknown.");
  }
  const length = field.length as number;

  if (options.mode === "empty") {
    return "";
  }
  const target = options.mode === "leaveOneByte" ? Math.max(0, length - 1) : length;
  const current = String(field.value ?? "");
  const pattern = getTestPattern(options);
  const prefix = options.mode === "keepAndFill" ? current : "";
  return fillEncodedLength(prefix, pattern, target, encoding, options.fullWidthRemainder ?? "ascii");
}

function fillEncodedLength(
  prefix: string,
  pattern: string,
  targetBytes: number,
  encoding: Exclude<EncodingName, "unknown">,
  remainder: FullWidthRemainder
): string {
  let value = prefix;
  let used = encodeString(value, encoding).length;
  if (used > targetBytes) {
    throw new Error("The current value already exceeds the target byte length.");
  }

  const characters = Array.from(pattern);
  if (characters.length === 0) {
    throw new Error("A fill character is required.");
  }
  let patternIndex = 0;
  while (used < targetBytes) {
    const character = characters[patternIndex % characters.length];
    const size = encodeString(character, encoding).length;
    if (size === 0) {
      throw new Error("The fill character does not produce bytes.");
    }
    if (used + size > targetBytes) {
      if (remainder === "ascii") {
        value += "A".repeat(targetBytes - used);
        used = targetBytes;
        break;
      }
      if (remainder === "short") {
        break;
      }
      throw new Error("The selected characters cannot exactly fill this byte length.");
    }
    value += character;
    used += size;
    patternIndex += 1;
  }
  return value;
}

function getTestPattern(options: TestValueOptions): string {
  switch (options.mode) {
    case "fullWidthMax":
      return "あ";
    case "customFill":
    case "keepAndFill":
      return options.customFill ?? "A";
    case "digits":
      return "0123456789";
    case "asciiMax":
    case "leaveOneByte":
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    default:
      return "A";
  }
}

function repeatFieldName(name: string, repeatIndex: number, mode: RepeatNameMode): string {
  if (mode === "keep") {
    return name;
  }
  if (mode === "append") {
    return `${name}_${repeatIndex + 1}`;
  }
  if (mode === "appendPadded") {
    return `${name}_${String(repeatIndex + 1).padStart(2, "0")}`;
  }

  const match = name.match(/^(.*?)(\d+)$/);
  if (!match) {
    return `${name}_${repeatIndex + 1}`;
  }
  const initial = Number.parseInt(match[2], 10);
  return `${match[1]}${String(initial + repeatIndex).padStart(match[2].length, "0")}`;
}

function normalizeIndices(indices: number[], fieldCount: number): number[] {
  return [...new Set(indices)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < fieldCount)
    .sort((left, right) => left - right);
}
