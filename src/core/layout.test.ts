import { calculateFieldLayout } from "./layout";
import type { BinaryTemplate } from "./types";

describe("calculateFieldLayout", () => {
  it("calculates offsets from field sizes", () => {
    const template: BinaryTemplate = {
      formatVersion: "0.1",
      name: "layout",
      fields: [
        { name: "a", type: "uint8", value: 1 },
        { name: "b", type: "uint16", value: 2, endian: "big" },
        { name: "c", type: "ipv4", value: "127.0.0.1" },
        { name: "d", type: "padding", length: 3 }
      ]
    };

    expect(calculateFieldLayout(template).map(({ offset, size }) => ({ offset, size }))).toEqual([
      { offset: 0, size: 1 },
      { offset: 1, size: 2 },
      { offset: 3, size: 4 },
      { offset: 7, size: 3 }
    ]);
  });

  it("uses eight bytes for 64-bit integers", () => {
    const template: BinaryTemplate = {
      formatVersion: "0.1",
      name: "64-bit layout",
      defaultEndian: "big",
      fields: [
        { name: "unsigned", type: "uint64", value: "0" },
        { name: "signed", type: "int64", value: "-1" }
      ]
    };

    expect(calculateFieldLayout(template).map(({ offset, size }) => ({ offset, size }))).toEqual([
      { offset: 0, size: 8 },
      { offset: 8, size: 8 }
    ]);
  });
});
