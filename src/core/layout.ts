import { integerTypes, type BinaryTemplate, type FieldDefinition, type FieldLayout } from "./types";

export function getFieldSize(field: FieldDefinition): number {
  if (field.type in integerTypes) {
    return integerTypes[field.type as keyof typeof integerTypes].size;
  }

  if (field.type === "ipv4") {
    return 4;
  }

  if (field.type === "string" || field.type === "bytes" || field.type === "padding") {
    return typeof field.length === "number" && Number.isFinite(field.length) && field.length > 0
      ? Math.floor(field.length)
      : 0;
  }

  return 0;
}

export function calculateFieldLayout(template: BinaryTemplate): FieldLayout[] {
  let offset = 0;

  return template.fields.map((field, index) => {
    const size = getFieldSize(field);
    const layout = { index, field, offset, size };
    offset += size;
    return layout;
  });
}
