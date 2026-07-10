import type { TextPreviewEncoding } from "./types";

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
  decodedText: string;
}

export function toHexRows(
  bytes: Uint8Array,
  width = 16,
  textEncoding: TextPreviewEncoding = "ascii"
): HexRow[] {
  const rows: HexRow[] = [];
  const decodedRows = decodeTextRows(bytes, width, textEncoding);

  for (let offset = 0; offset < bytes.length; offset += width) {
    const chunk = bytes.slice(offset, offset + width);
    rows.push({
      offset,
      bytes: Array.from(chunk).map((value, index) => ({
        index: offset + index,
        text: toHexByte(value)
      })),
      decodedText: decodedRows[offset / width] ?? ""
    });
  }

  return rows;
}

function decodeTextRows(
  bytes: Uint8Array,
  width: number,
  encoding: TextPreviewEncoding
): string[] {
  if (encoding === "ascii") {
    const rows: string[] = [];
    for (let offset = 0; offset < bytes.length; offset += width) {
      rows.push(
        Array.from(bytes.slice(offset, offset + width))
          .map((value) => (value >= 0x20 && value <= 0x7e ? String.fromCharCode(value) : "."))
          .join("")
      );
    }
    return rows;
  }

  const decoder = new TextDecoder(encoding);
  const rows: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += width) {
    const end = Math.min(offset + width, bytes.length);
    const decoded = decoder.decode(bytes.subarray(offset, end), { stream: end < bytes.length });
    rows.push(sanitizeDecodedText(decoded));
  }

  return rows;
}

function sanitizeDecodedText(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint === 0xfffd || codePoint < 0x20 || codePoint === 0x7f ? "." : character;
  }).join("");
}
