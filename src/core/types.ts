export type Endian = "big" | "little" | "unknown";
export type EncodingName = "ascii" | "utf-8" | "shift_jis" | "unknown";
export type PaddingMode = "zero" | "space";

export type FieldType =
  | "uint8"
  | "uint16"
  | "uint32"
  | "int8"
  | "int16"
  | "int32"
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
  layouts: FieldLayout[];
  issues: ValidationIssue[];
}

export interface IntegerTypeInfo {
  size: 1 | 2 | 4;
  min: number;
  max: number;
  signed: boolean;
}

export const integerTypes: Record<
  Extract<FieldType, "uint8" | "uint16" | "uint32" | "int8" | "int16" | "int32">,
  IntegerTypeInfo
> = {
  uint8: { size: 1, min: 0, max: 0xff, signed: false },
  uint16: { size: 2, min: 0, max: 0xffff, signed: false },
  uint32: { size: 4, min: 0, max: 0xffffffff, signed: false },
  int8: { size: 1, min: -0x80, max: 0x7f, signed: true },
  int16: { size: 2, min: -0x8000, max: 0x7fff, signed: true },
  int32: { size: 4, min: -0x80000000, max: 0x7fffffff, signed: true }
};

export const supportedEncodings: EncodingName[] = ["ascii", "utf-8", "shift_jis"];
