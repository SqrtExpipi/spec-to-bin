import { encodeString, padFixedStringBytes } from "./encodeString";

describe("encodeString", () => {
  it("encodes ASCII", () => {
    expect(Array.from(encodeString("ABC", "ascii"))).toEqual([0x41, 0x42, 0x43]);
  });

  it("rejects non-ASCII characters", () => {
    expect(() => encodeString("通信", "ascii")).toThrow();
  });

  it("encodes UTF-8 Japanese text", () => {
    expect(Array.from(encodeString("通信", "utf-8"))).toEqual([0xe9, 0x80, 0x9a, 0xe4, 0xbf, 0xa1]);
  });

  it("encodes Shift_JIS Japanese text", () => {
    expect(Array.from(encodeString("通信", "shift_jis"))).toEqual([0x92, 0xca, 0x90, 0x4d]);
  });

  it("rejects characters that Shift_JIS replaces", () => {
    expect(() => encodeString("😀", "shift_jis")).toThrow();
  });
});

describe("padFixedStringBytes", () => {
  it("pads with zero", () => {
    expect(Array.from(padFixedStringBytes(new Uint8Array([0x41]), 3, "zero"))).toEqual([0x41, 0, 0]);
  });

  it("pads with spaces", () => {
    expect(Array.from(padFixedStringBytes(new Uint8Array([0x41]), 3, "space"))).toEqual([
      0x41,
      0x20,
      0x20
    ]);
  });
});

