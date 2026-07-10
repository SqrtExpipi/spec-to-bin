import communicationPacket from "../../examples/communication-packet.json";
import fixedLengthString from "../../examples/fixed-length-string-shift-jis.json";
import { buildBinary } from "./buildBinary";
import { formatHex } from "./formatHex";
import { parseBinaryTemplate } from "./parseTemplate";
import { validateTemplate } from "./validateTemplate";
import type { BinaryTemplate } from "./types";

describe("buildBinary", () => {
  it("builds the communication packet sample", () => {
    const result = buildBinary(communicationPacket as BinaryTemplate);

    expect(result.issues).toEqual([]);
    expect(formatHex(result.bytes)).toBe(
      "00 0F 00 01 00 00 00 00 C0 A8 00 0A 1F 90 44 45 56 49 43 45 2D 30 31 00 00 00 00 00 00 00 00 00 00 00"
    );
  });

  it("encodes Shift_JIS fixed-length strings by byte length", () => {
    const result = buildBinary(fixedLengthString as BinaryTemplate);

    expect(result.issues).toEqual([]);
    expect(formatHex(result.bytes.slice(0, 20))).toBe(
      "92 CA 90 4D 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00"
    );
  });

  it("reports numeric range errors", () => {
    const template: BinaryTemplate = {
      formatVersion: "0.1",
      name: "range_error",
      fields: [{ name: "value", type: "uint8", value: 256 }]
    };

    const issues = validateTemplate(template);
    expect(issues.some((issue) => issue.code === "number.outOfRange")).toBe(true);
  });

  it("reports fixed-length string overflow", () => {
    const template: BinaryTemplate = {
      formatVersion: "0.1",
      name: "string_error",
      defaultEncoding: "utf-8",
      fields: [{ name: "text", type: "string", length: 10, value: "あいうえお" }]
    };

    const issues = validateTemplate(template);
    expect(issues.some((issue) => issue.code === "string.tooLong")).toBe(true);
  });

  it("blocks generation when endian is unknown", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "unknown_endian",
      fields: [{ name: "value", type: "uint16", endian: "unknown", value: 1 }]
    });

    expect(result.bytes).toHaveLength(0);
    expect(result.issues.some((issue) => issue.code === "endian.unknown")).toBe(true);
  });

  it("blocks generation when encoding is unknown", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "unknown_encoding",
      fields: [{ name: "text", type: "string", length: 4, encoding: "unknown", value: "AB" }]
    });

    expect(result.bytes).toHaveLength(0);
    expect(result.issues.some((issue) => issue.code === "encoding.unknown")).toBe(true);
  });

  it("blocks generation while needsReview remains", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "needs_review",
      fields: [{ name: "value", type: "uint8", value: 1, needsReview: true }]
    });

    expect(result.bytes).toHaveLength(0);
    expect(result.issues.some((issue) => issue.code === "review.required")).toBe(true);
  });

  it("reports expected offset mismatches", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "offset_mismatch",
      defaultEndian: "big",
      fields: [
        { name: "first", type: "uint16", offset: 0, value: 1 },
        { name: "second", type: "uint16", offset: 4, value: 2 }
      ]
    });

    expect(result.bytes).toHaveLength(0);
    expect(result.issues.some((issue) => issue.code === "field.offsetMismatch")).toBe(true);
  });

  it("does not throw on invalid JSON shape", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "invalid_shape",
      fields: [null, "bad"]
    });

    expect(result.bytes).toHaveLength(0);
    expect(result.issues.filter((issue) => issue.code === "field.invalid")).toHaveLength(2);
  });

  it("normalizes common AI encoding aliases", () => {
    const parsed = parseBinaryTemplate({
      formatVersion: "0.1",
      name: "aliases",
      defaultEncoding: "Shift-JIS",
      fields: [{ name: "text", type: "string", length: "4", value: "通信" }]
    });

    expect(parsed.template.defaultEncoding).toBe("shift_jis");
    expect(parsed.template.fields[0].length).toBe(4);
  });

  it("rejects ambiguous bytes value and fill", () => {
    const issues = validateTemplate({
      formatVersion: "0.1",
      name: "ambiguous_bytes",
      fields: [{ name: "data", type: "bytes", length: 1, value: "00", fill: "FF" }]
    });

    expect(issues.some((issue) => issue.code === "bytes.ambiguousSource")).toBe(true);
  });

  it("generates non-zero reserved-area fill bytes", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "padding_fill",
      fields: [{ name: "reserved", type: "padding", length: 3, fill: "FF" }]
    });

    expect(result.issues).toEqual([]);
    expect(formatHex(result.bytes)).toBe("FF FF FF");
  });

  it("space-pads fixed-length strings", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "space_padding",
      defaultEncoding: "ascii",
      fields: [{ name: "text", type: "string", length: 4, padding: "space", value: "A" }]
    });

    expect(result.issues).toEqual([]);
    expect(formatHex(result.bytes)).toBe("41 20 20 20");
  });

  it("does not block generation for warnings", () => {
    const result = buildBinary({
      formatVersion: "0.1",
      name: "warning_only",
      fields: [
        { name: "same", type: "uint8", value: 1 },
        { name: "same", type: "uint8", value: 2 }
      ]
    });

    expect(result.issues.every((issue) => issue.level === "warning")).toBe(true);
    expect(formatHex(result.bytes)).toBe("01 02");
  });
});
