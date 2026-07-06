import Encoding from "encoding-japanese";
import type { EncodingName, PaddingMode } from "./types";

export function encodeString(value: string, encoding: EncodingName): Uint8Array {
  if (encoding === "unknown") {
    throw new Error("Unknown encoding cannot be encoded.");
  }

  if (encoding === "ascii") {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      if (code > 0x7f) {
        throw new Error("Non-ASCII character found.");
      }
      bytes[i] = code;
    }
    return bytes;
  }

  if (encoding === "utf-8") {
    return new TextEncoder().encode(value);
  }

  const unicodeCodes = Encoding.stringToCode(value);
  const converted = Encoding.convert(unicodeCodes, {
    from: "UNICODE",
    to: "SJIS",
    type: "array"
  });

  return new Uint8Array(converted as number[]);
}

export function padFixedStringBytes(
  bytes: Uint8Array,
  length: number,
  padding: PaddingMode = "zero"
): Uint8Array {
  const fill = padding === "space" ? 0x20 : 0x00;
  const output = new Uint8Array(length);
  output.fill(fill);
  output.set(bytes);
  return output;
}
