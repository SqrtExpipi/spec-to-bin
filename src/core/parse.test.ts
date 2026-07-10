import { parseBigIntegerValue, parseHexBytes, parseIntegerValue } from "./parse";

describe("parseIntegerValue", () => {
  it.each([
    ["15", 15],
    ["0x000F", 15],
    ["F", 15],
    ["000F", 15],
    ["-F", -15],
    ["1_000", 1000]
  ])("parses %s", (input, expected) => {
    expect(parseIntegerValue(input)).toEqual({ ok: true, value: expected });
  });

  it.each(["", "0x", "G1", "1.5", null, undefined])("rejects %s", (input) => {
    expect(parseIntegerValue(input).ok).toBe(false);
  });
});

describe("parseBigIntegerValue", () => {
  it.each([
    ["18446744073709551615", 18446744073709551615n],
    ["0xFFFFFFFFFFFFFFFF", 0xffffffffffffffffn],
    ["FFFFFFFFFFFFFFFF", 0xffffffffffffffffn],
    ["-9223372036854775808", -9223372036854775808n],
    ["-0x8000000000000000", -0x8000000000000000n],
    ["1_000_000_000_000", 1000000000000n]
  ])("parses %s without precision loss", (input, expected) => {
    expect(parseBigIntegerValue(input)).toEqual({ ok: true, value: expected });
  });

  it.each([1, Number.MAX_SAFE_INTEGER, "", "0x", "G1", "1.5", null, undefined])(
    "rejects %s",
    (input) => {
      expect(parseBigIntegerValue(input).ok).toBe(false);
    }
  );
});

describe("parseHexBytes", () => {
  it.each([
    ["DE AD BE EF", [0xde, 0xad, 0xbe, 0xef]],
    ["DE-AD_BE,EF", [0xde, 0xad, 0xbe, 0xef]],
    ["0xDE, 0xAD, 0xBE, 0xEF", [0xde, 0xad, 0xbe, 0xef]],
    ["{ 0x00, 0x01 }", [0x00, 0x01]]
  ])("parses %s", (input, expected) => {
    const result = parseHexBytes(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.from(result.bytes)).toEqual(expected);
    }
  });

  it.each(["0", "GG", "0xGG", "0x001", "0xDE, value"])('rejects "%s"', (input) => {
    expect(parseHexBytes(input).ok).toBe(false);
  });
});
