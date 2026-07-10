# Spec to BIN JSON prompt

Use the text below as a prompt, replace the placeholder between the specification markers, and review the generated JSON in Spec to BIN before exporting a binary.

```text
Read the specification between the markers below and create a Spec to BIN binary-template JSON document.

Output rules:
- Output one JSON object only. Do not use Markdown fences or add explanations.
- Set "formatVersion" to "0.1" and provide a short, generic "name".
- Keep "fields" in the same order as the specification.
- Use only these field types: uint8, uint16, uint32, uint64, int8, int16, int32, int64, bytes, string, ipv4, padding.
- Use only these top-level properties: formatVersion, name, defaultEndian, defaultEncoding, fields.
- Use only these field properties: name, type, value, offset, length, endian, encoding, padding, fill, fixed, needsReview, note.
- Set defaultEndian or defaultEncoding only when the specification defines a common default. Otherwise, set endian or encoding on each relevant field.
- An "offset" is an expected byte offset used for validation. It does not place a field or create a gap. Add a padding field for every explicit gap.
- If a fixed value is specified, put it in "value" and set "fixed": true.

Type rules:
- uint8/16/32/64 and int8/16/32/64 require "value". Multi-byte integers require "endian": "big" or "little", either on the field or through "defaultEndian".
- Integer values may be decimal numbers or strings such as "0x1234". uint64 and int64 values must always be JSON strings to avoid precision loss.
- bytes requires a positive byte "length" and exactly one source: hexadecimal "value" or one-byte hexadecimal "fill". Example value: "DE AD BE EF". Example fill: "00".
- string requires a positive byte "length", "value", "encoding" (ascii, utf-8, or shift_jis), and "padding" (zero or space). Length is measured after encoding, in bytes rather than characters.
- ipv4 requires a dotted decimal string "value" and is always 4 bytes.
- padding represents a reserved or unused area. It requires a positive byte "length", may have a one-byte hexadecimal "fill", and must not have "value".

Unknown or ambiguous information:
- Do not silently guess a byte length, endian, encoding, signedness, or fill value.
- Add "needsReview": true and a concise "note" describing exactly what is unclear.
- Use "endian": "unknown" or "encoding": "unknown" when those values are not specified.
- If a reserved area's fill is not specified, use "fill": "00", add "needsReview": true, and explain the assumption in "note".
- If the field type itself cannot be determined, use bytes, add "needsReview": true, and omit an unknown length rather than inventing one.
- needsReview, unknown endian, unknown encoding, missing required properties, range errors, and offset mismatches block BIN export for human review.

Valid example:
{
  "formatVersion": "0.1",
  "name": "basic_fields",
  "defaultEndian": "big",
  "defaultEncoding": "utf-8",
  "fields": [
    {
      "name": "unsignedValue",
      "type": "uint16",
      "offset": 0,
      "value": "0x1234"
    },
    {
      "name": "label",
      "type": "string",
      "offset": 2,
      "length": 8,
      "encoding": "utf-8",
      "padding": "zero",
      "value": "SAMPLE"
    },
    {
      "name": "reserved",
      "type": "padding",
      "offset": 10,
      "length": 2,
      "fill": "00"
    }
  ]
}

--- SPECIFICATION START ---
Paste the specification here.
--- SPECIFICATION END ---
```
