import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { compareBinary, createTestDataPackage, sha256Hex } from "./artifacts";
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

describe("test data package", () => {
  it("packages the exact JSON and BIN with verifiable manifest hashes", async () => {
    const templateJson = JSON.stringify({ formatVersion: "0.1", name: "sample", fields: [] }, null, 2);
    const binary = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const result = await createTestDataPackage({
      binary,
      generatedAt: new Date("2026-01-02T03:04:05.000Z"),
      templateJson,
      templateName: "sample",
      toolVersion: "0.1.0"
    });
    const files = unzipSync(result.bytes);
    expect(Object.keys(files).sort()).toEqual([
      "README.txt",
      "generated.bin",
      "manifest.json",
      "template.json"
    ]);
    expect(files["generated.bin"]).toEqual(binary);
    expect(result.manifest.binarySha256).toBe(await sha256Hex(binary));
    expect(result.manifest.templateSha256).toBe(await sha256Hex(files["template.json"]));
    expect(JSON.parse(strFromU8(files["manifest.json"]))).toEqual(result.manifest);
  });
});
