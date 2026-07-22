import { formatHex, toHexByte } from "./formatHex";

export type CopyFormatId = "hex-list" | "c-array" | "csharp-byte-array" | "python-bytes" | "hex";

export interface CopyFormat {
  id: CopyFormatId;
  label: string;
  value: string;
}

export function createCopyFormats(bytes: Uint8Array, variableName = "data"): CopyFormat[] {
  const list = format0xList(bytes);

  return [
    {
      id: "hex-list",
      label: "0x list",
      value: list
    },
    {
      id: "hex",
      label: "Hex",
      value: formatHex(bytes)
    },
    {
      id: "c-array",
      label: "C array",
      value: `uint8_t ${variableName}[] = { ${list} };`
    },
    {
      id: "python-bytes",
      label: "Python bytes",
      value: `${variableName} = bytes([${list}])`
    },
    {
      id: "csharp-byte-array",
      label: "C# byte[]",
      value: `byte[] ${variableName} = { ${list} };`
    }
  ];
}

export function format0xList(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => `0x${toHexByte(value)}`).join(", ");
}
