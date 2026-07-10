# Spec to BIN JSON prompt

Read the following specification and create JSON that follows the Spec to BIN `binary-template` format.

Constraints:

- Output JSON only.
- Keep `fields` in the same order as the specification.
- If the specification has an Offset column, set `offset` as a decimal byte offset.
- Do not guess unknown byte lengths. Add `"needsReview": true`.
- If endian is unknown, set `"endian": "unknown"`.
- Put fixed values in `"value"` and set `"fixed": true`.
- Use `{ "type": "bytes", "fill": "00" }` for reserved areas.
- If string encoding is unknown, set `"encoding": "unknown"`.
- Use byte length, not character count, for fixed-length strings.
- Always write `uint64` and `int64` values as decimal or hexadecimal JSON strings, never JSON numbers.
- `needsReview: true`, `endian: "unknown"`, and `encoding: "unknown"` block BIN export until a human fixes them.
- Use one of these field types: `uint8`, `uint16`, `uint32`, `uint64`, `int8`, `int16`, `int32`, `int64`, `bytes`, `string`, `ipv4`, `padding`.

Template:

```json
{
  "formatVersion": "0.1",
  "name": "sample_packet",
  "defaultEndian": "unknown",
  "defaultEncoding": "unknown",
  "fields": []
}
```
