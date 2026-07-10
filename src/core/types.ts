export type Endian = "big" | "little" | "unknown";
export type EncodingName = "ascii" | "utf-8" | "shift_jis" | "unknown";
export type TextPreviewEncoding = Exclude<EncodingName, "unknown">;
export type PaddingMode = "zero" | "space";

export type FieldType =
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "int8"
  | "int16"
  | "int32"
  | "int64"
  | "bytes"
  | "string"
  | "ipv4"
  | "padding";

export interface BinaryTemplate {
  formatVersion: string;
  name: string;
  defaultEndian?: Endian;
  defaultEncoding?: EncodingName;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  value?: string | number;
  offset?: number;
  length?: number;
  endian?: Endian;
  encoding?: EncodingName;
  padding?: PaddingMode;
  fill?: string;
  fixed?: boolean;
  needsReview?: boolean;
  note?: string;
}

export type IssueLevel = "error" | "warning" | "info";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  fieldIndex?: number;
  fieldName?: string;
  messageParams?: Record<string, string | number>;
}

export interface FieldLayout {
  index: number;
  field: FieldDefinition;
  offset: number;
  size: number;
}

export interface BuildResult {
  bytes: Uint8Array;
  template: BinaryTemplate;
  layouts: FieldLayout[];
  issues: ValidationIssue[];
}

export type NumberIntegerType = Extract<
  FieldType,
  "uint8" | "uint16" | "uint32" | "int8" | "int16" | "int32"
>;
export type BigIntegerType = Extract<FieldType, "uint64" | "int64">;
export type IntegerType = NumberIntegerType | BigIntegerType;

export interface IntegerTypeInfo {
  size: 1 | 2 | 4 | 8;
  signed: boolean;
}

export interface NumberIntegerTypeInfo extends IntegerTypeInfo {
  min: number;
  max: number;
}

export interface BigIntegerTypeInfo extends IntegerTypeInfo {
  min: bigint;
  max: bigint;
}

export const numberIntegerTypes: Record<NumberIntegerType, NumberIntegerTypeInfo> = {
  uint8: { size: 1, min: 0, max: 0xff, signed: false },
  uint16: { size: 2, min: 0, max: 0xffff, signed: false },
  uint32: { size: 4, min: 0, max: 0xffffffff, signed: false },
  int8: { size: 1, min: -0x80, max: 0x7f, signed: true },
  int16: { size: 2, min: -0x8000, max: 0x7fff, signed: true },
  int32: { size: 4, min: -0x80000000, max: 0x7fffffff, signed: true }
};

export const bigIntegerTypes: Record<BigIntegerType, BigIntegerTypeInfo> = {
  uint64: { size: 8, min: 0n, max: 0xffffffffffffffffn, signed: false },
  int64: {
    size: 8,
    min: -0x8000000000000000n,
    max: 0x7fffffffffffffffn,
    signed: true
  }
};

export const integerTypes: Record<IntegerType, IntegerTypeInfo> = {
  ...numberIntegerTypes,
  ...bigIntegerTypes
};

export function isIntegerType(type: FieldType): type is IntegerType {
  return type in integerTypes;
}

export function isBigIntegerType(type: FieldType): type is BigIntegerType {
  return type === "uint64" || type === "int64";
}

export const supportedEncodings: EncodingName[] = ["ascii", "utf-8", "shift_jis", "unknown"];
export const supportedEndians: Endian[] = ["big", "little", "unknown"];
export const supportedPaddings: PaddingMode[] = ["zero", "space"];
