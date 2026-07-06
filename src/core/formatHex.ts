export function toHexByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

export function toOffset(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function formatHex(bytes: Uint8Array): string {
  return Array.from(bytes, toHexByte).join(" ");
}

export interface HexRow {
  offset: number;
  bytes: { index: number; text: string }[];
  ascii: string;
}

export function toHexRows(bytes: Uint8Array, width = 16): HexRow[] {
  const rows: HexRow[] = [];

  for (let offset = 0; offset < bytes.length; offset += width) {
    const chunk = bytes.slice(offset, offset + width);
    rows.push({
      offset,
      bytes: Array.from(chunk).map((value, index) => ({
        index: offset + index,
        text: toHexByte(value)
      })),
      ascii: Array.from(chunk)
        .map((value) => (value >= 0x20 && value <= 0x7e ? String.fromCharCode(value) : "."))
        .join("")
    });
  }

  return rows;
}
