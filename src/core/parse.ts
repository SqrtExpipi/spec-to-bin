export function parseIntegerValue(value: unknown): { ok: true; value: number } | { ok: false } {
  if (typeof value === "number") {
    return Number.isInteger(value) ? { ok: true, value } : { ok: false };
  }

  if (typeof value !== "string") {
    return { ok: false };
  }

  const text = value.trim().replaceAll("_", "");
  if (!text) {
    return { ok: false };
  }

  const sign = text.startsWith("-") ? -1 : 1;
  const unsigned = text.replace(/^[+-]/, "");
  const radix = /^0x[0-9a-f]+$/i.test(unsigned) ? 16 : 10;
  const body = radix === 16 ? unsigned.slice(2) : unsigned;

  if (radix === 10 && !/^[0-9]+$/.test(body)) {
    return { ok: false };
  }

  const parsed = Number.parseInt(body, radix) * sign;
  return Number.isSafeInteger(parsed) ? { ok: true, value: parsed } : { ok: false };
}

export function parseHexBytes(value: unknown): { ok: true; bytes: Uint8Array } | { ok: false } {
  if (value instanceof Uint8Array) {
    return { ok: true, bytes: value };
  }

  if (typeof value !== "string") {
    return { ok: false };
  }

  const compact = value.replace(/[\s,_-]/g, "");
  if (compact.length === 0) {
    return { ok: true, bytes: new Uint8Array() };
  }

  if (compact.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(compact)) {
    return { ok: false };
  }

  const bytes = new Uint8Array(compact.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(compact.slice(i * 2, i * 2 + 2), 16);
  }

  return { ok: true, bytes };
}

export function parseFillByte(fill: string | undefined): { ok: true; value: number } | { ok: false } {
  if (fill === undefined || fill === "") {
    return { ok: true, value: 0x00 };
  }

  const parsed = parseHexBytes(fill);
  if (!parsed.ok || parsed.bytes.length !== 1) {
    return { ok: false };
  }

  return { ok: true, value: parsed.bytes[0] };
}
