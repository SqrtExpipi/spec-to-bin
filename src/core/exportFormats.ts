import { formatHex, toHexByte } from "./formatHex";

export type CopyFormatId = "hex-list" | "c-array" | "csharp-byte-array" | "python-bytes" | "hex";

export interface CopyFormat {
  id: CopyFormatId;
  label: string;
  language?: string;
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
      language: "c",
      value: `uint8_t ${variableName}[] = { ${list} };`
    },
    {
      id: "python-bytes",
      label: "Python bytes",
      language: "python",
      value: `${variableName} = bytes([${list}])`
    },
    {
      id: "csharp-byte-array",
      label: "C# byte[]",
      language: "csharp",
      value: `byte[] ${variableName} = { ${list} };`
    }
  ];
}

export function format0xList(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => `0x${toHexByte(value)}`).join(", ");
}
