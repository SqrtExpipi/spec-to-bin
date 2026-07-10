import { buildBinary } from "./buildBinary";
import { formatHex } from "./formatHex";
import type { Endian, FieldType } from "./types";

function buildInteger(type: FieldType, value: string | number, endian?: Endian): string {
  const result = buildBinary({
    formatVersion: "0.1",
    name: "integer",
    fields: [{ name: "value", type, value, endian }]
  });
  expect(result.issues).toEqual([]);
  return formatHex(result.bytes);
}

describe("integer encoding", () => {
  it.each([
    ["uint8", 0, "00"],
    ["uint8", 255, "FF"],
    ["int8", -128, "80"],
    ["int8", 127, "7F"]
  ])("encodes %s value %s", (type, value, expected) => {
    expect(buildInteger(type as FieldType, value as number)).toBe(expected);
  });

  it.each([
    ["uint16", "0x1234", "big", "12 34"],
    ["uint16", "0x1234", "little", "34 12"],
    ["int16", -2, "big", "FF FE"],
    ["int16", -2, "little", "FE FF"],
    ["uint32", "0x12345678", "big", "12 34 56 78"],
    ["uint32", "0x12345678", "little", "78 56 34 12"],
    ["int32", -2, "big", "FF FF FF FE"],
    ["int32", -2, "little", "FE FF FF FF"],
    ["uint64", "0x0123456789ABCDEF", "big", "01 23 45 67 89 AB CD EF"],
    ["uint64", "0x0123456789ABCDEF", "little", "EF CD AB 89 67 45 23 01"],
    ["int64", "-2", "big", "FF FF FF FF FF FF FF FE"],
    ["int64", "-2", "little", "FE FF FF FF FF FF FF FF"]
  ])("encodes %s value %s as %s endian", (type, value, endian, expected) => {
    expect(buildInteger(type as FieldType, value as string | number, endian as Endian)).toBe(expected);
  });

  it("accepts a bare hexadecimal value containing A-F", () => {
    expect(buildInteger("uint16", "F", "big")).toBe("00 0F");
  });

  it("encodes the uint64 maximum without precision loss", () => {
    expect(buildInteger("uint64", "18446744073709551615", "big")).toBe(
      "FF FF FF FF FF FF FF FF"
    );
  });

  it("encodes the int64 minimum", () => {
    expect(buildInteger("int64", "-9223372036854775808", "big")).toBe(
      "80 00 00 00 00 00 00 00"
    );
  });
});
