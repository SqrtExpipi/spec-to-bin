import { createCopyFormats, format0xList } from "./exportFormats";

describe("exportFormats", () => {
  const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01]);

  it("formats a reusable 0x list", () => {
    expect(format0xList(bytes)).toBe("0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01");
  });

  it("creates common paste-friendly formats", () => {
    const formats = createCopyFormats(bytes);

    expect(formats.map((format) => format.id)).toEqual([
      "hex-list",
      "c-array",
      "csharp-byte-array",
      "python-bytes",
      "hex"
    ]);
    expect(formats[1].value).toBe("uint8_t data[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01 };");
    expect(formats[2].value).toBe("byte[] data = { 0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01 };");
    expect(formats[3].value).toBe("data = bytes([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01])");
    expect(formats[4].value).toBe("DE AD BE EF 00 01");
  });
});
