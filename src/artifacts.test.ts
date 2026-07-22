import { describe, expect, it } from "vitest";
import { compareBinary } from "./artifacts";
import type { FieldLayout } from "./core";

describe("compareBinary", () => {
  const layouts: FieldLayout[] = [
    { index: 0, offset: 0, size: 2, field: { name: "magic", type: "uint16", fixed: true } },
    { index: 1, offset: 2, size: 2, field: { name: "reserved", type: "padding", length: 2 } }
  ];

  it("reports mismatches with field-relative locations and special field kinds", async () => {
    const result = await compareBinary(
      new Uint8Array([0xaa, 0x55, 0x00, 0x00]),
      new Uint8Array([0xab, 0x55, 0x00, 0x82]),
      layouts
    );
    expect(result.matches).toBe(false);
    expect(result.matchingBytes).toBe(2);
    expect(result.mismatchBytes).toBe(2);
    expect(result.firstMismatchOffset).toBe(0);
    expect(result.differences).toMatchObject([
      { offset: 0, fieldName: "magic", fieldOffset: 0, kind: "fixed" },
      { offset: 3, fieldName: "reserved", fieldOffset: 1, kind: "reserved" }
    ]);
  });

  it("counts missing and extra bytes as mismatches", async () => {
    const result = await compareBinary(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]), [], 1);
    expect(result.matchingBytes).toBe(2);
    expect(result.mismatchBytes).toBe(1);
    expect(result.differences[0]).toMatchObject({ offset: 2, expected: undefined, actual: 3 });
  });
});
