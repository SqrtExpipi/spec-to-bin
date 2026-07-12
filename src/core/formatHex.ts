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

export interface TextPreviewSegment {
  offset: number;
  size: number;
}

export function toHexRows(
  bytes: Uint8Array,
  width = 16,
  textEncoding: TextPreviewEncoding = "ascii",
  segments: readonly TextPreviewSegment[] = []
): HexRow[] {
  const rows: HexRow[] = [];
  const decodedRows = decodeTextRows(bytes, width, textEncoding, segments);

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
  encoding: TextPreviewEncoding,
  segments: readonly TextPreviewSegment[]
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

  const rows = Array.from({ length: Math.ceil(bytes.length / width) }, () => "");

  for (const segment of normalizeSegments(bytes.length, segments)) {
    const decoder = new TextDecoder(encoding);
    let position = segment.offset;
    const segmentEnd = segment.offset + segment.size;

    while (position < segmentEnd) {
      const rowIndex = Math.floor(position / width);
      const chunkEnd = Math.min(segmentEnd, (rowIndex + 1) * width);
      const decoded = decoder.decode(bytes.subarray(position, chunkEnd), {
        stream: chunkEnd < segmentEnd
      });
      rows[rowIndex] += sanitizeDecodedText(decoded);
      position = chunkEnd;
    }
  }

  return rows;
}

function normalizeSegments(
  byteLength: number,
  segments: readonly TextPreviewSegment[]
): TextPreviewSegment[] {
  if (segments.length === 0) {
    return byteLength === 0 ? [] : [{ offset: 0, size: byteLength }];
  }

  const normalized: TextPreviewSegment[] = [];
  let coveredUntil = 0;

  for (const segment of [...segments].sort((left, right) => left.offset - right.offset)) {
    const requestedStart = Math.min(byteLength, Math.max(0, segment.offset));
    const requestedEnd = Math.min(
      byteLength,
      Math.max(requestedStart, segment.offset + segment.size)
    );
    const start = Math.max(coveredUntil, requestedStart);

    if (start > coveredUntil) {
      normalized.push({ offset: coveredUntil, size: start - coveredUntil });
      coveredUntil = start;
    }
    if (requestedEnd > start) {
      normalized.push({ offset: start, size: requestedEnd - start });
      coveredUntil = requestedEnd;
    }
    if (coveredUntil >= byteLength) {
      break;
    }
  }

  if (coveredUntil < byteLength) {
    normalized.push({ offset: coveredUntil, size: byteLength - coveredUntil });
  }

  return normalized;
}

function sanitizeDecodedText(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint === 0xfffd || codePoint < 0x20 || codePoint === 0x7f ? "." : character;
  }).join("");
}
