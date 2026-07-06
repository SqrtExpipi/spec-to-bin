import communicationPacket from "../../examples/communication-packet.json";
import fixedLengthString from "../../examples/fixed-length-string-shift-jis.json";
import { buildBinary } from "./buildBinary";
import { formatHex } from "./formatHex";
import { validateTemplate } from "./validateTemplate";
import type { BinaryTemplate } from "./types";

describe("buildBinary", () => {
  it("builds the communication packet sample", () => {
    const result = buildBinary(communicationPacket as BinaryTemplate);

    expect(result.issues).toEqual([]);
    expect(formatHex(result.bytes)).toBe(
      [
        "00",
        "0F",
        "00",
        "63",
        "00",
        "00",
        "00",
        "00",
        "C0",
        "A8",
        "00",
        "0A",
        "8D",
        "CC",
        "73",
        "69",
        "6B",
        "69",
        "6B",
        "61",
        "6E",
        "31",
        "00",
        "00",
        "00",
        "00",
        "00",
        "00",
        "00",
        "00",
        "00",
        "00",
        "00",
        "00"
      ].join(" ")
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
});
