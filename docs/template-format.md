# Binary template format

`binary-template` is the JSON format used by Spec to BIN. It is not JSON Schema itself. A machine-readable schema is available at [`binary-template.schema.json`](./binary-template.schema.json).

## Top-level object

```json
{
  "formatVersion": "0.1",
  "name": "sample_packet",
  "defaultEndian": "big",
  "defaultEncoding": "utf-8",
  "fields": []
}
```

## Top-level properties

| Property | Required | Description |
| --- | --- | --- |
| `formatVersion` | yes | Template format version. Initial version is `"0.1"`. |
| `name` | yes | Template name. Used as the default output file name. |
| `defaultEndian` | no | Default numeric endian. `big`, `little`, or `unknown`. |
| `defaultEncoding` | no | Default string encoding. `ascii`, `utf-8`, `shift_jis`, or `unknown`. |
| `fields` | yes | Field definitions in output order. |

## Field properties

| Property | Description |
| --- | --- |
| `name` | Field name shown in the GUI. |
| `type` | Field type. |
| `value` | Field value. See the numeric and byte input rules below. |
| `offset` | Optional expected byte offset from the specification. It is used for validation, not automatic placement. |
| `length` | Fixed byte length for `bytes`, `string`, and `padding`. |
| `endian` | Field-level endian override. |
| `encoding` | Field-level string encoding override. |
| `padding` | String padding mode: `zero` or `space`. |
| `fill` | Fill byte for `bytes` and `padding`, for example `"00"` or `"FF"`. |
| `fixed` | Makes the value read-only in the GUI. It is not a security boundary; JSON remains the source of truth. |
| `needsReview` | Marks AI-generated uncertain fields for human review. |
| `note` | Human-readable note. |

Unknown top-level and field properties are preserved when the template is edited and saved, but are reported as warnings. This lets future or vendor-specific metadata survive a v0.1 round trip without silently being treated as supported behavior.

## Field types

| Type | Size | Notes |
| --- | --- | --- |
| `uint8` | 1 | Unsigned integer, 0 to 255. |
| `uint16` | 2 | Unsigned integer, endian-aware. |
| `uint32` | 4 | Unsigned integer, endian-aware. |
| `uint64` | 8 | Unsigned integer, endian-aware. Value must be a JSON string. |
| `int8` | 1 | Signed integer, -128 to 127. |
| `int16` | 2 | Signed integer, endian-aware. |
| `int32` | 4 | Signed integer, endian-aware. |
| `int64` | 8 | Signed integer, endian-aware. Value must be a JSON string. |
| `bytes` | `length` | Explicit hex bytes or fill bytes. |
| `string` | `length` | Encoded by `encoding`, then padded. |
| `ipv4` | 4 | Dotted IPv4 address. |
| `padding` | `length` | Reserved area filled by `fill`. |

## Required values

- Integer fields require `value`.
- `ipv4` requires a valid dotted IPv4 value.
- `string` requires `length`, a resolvable encoding, and `value`. An empty string is valid.
- `bytes` requires `length` and exactly one source: `value` or `fill`.
- `padding` requires `length`; omitted `fill` means `00`.

## Numeric input

Numeric fields accept:

- Decimal: `15`, `-10`
- Prefix hexadecimal: `0x000F`, `-0x10`
- Bare hexadecimal containing A-F: `F`, `7FFF`, `-A`

Digits-only values such as `10` and `0010` are decimal. Use `0x0010` when hexadecimal 0x10 is intended.

For `uint64` and `int64`, `value` must always be a JSON string so the value survives JSON parsing without precision loss. The GUI and generator use `BigInt` internally.

```json
{ "name": "counter", "type": "uint64", "value": "18446744073709551615" }
{ "name": "delta", "type": "int64", "value": "-0x8000000000000000" }
```

The supported ranges are:

- `uint64`: `0` to `18446744073709551615`
- `int64`: `-9223372036854775808` to `9223372036854775807`

JSON number values are rejected for these two types, even when the particular value is small enough to be represented exactly. This keeps one unambiguous template contract.

## Byte input

`bytes.value` accepts compact or separated hex, such as:

```text
DEADBEEF
DE AD BE EF
DE, AD, BE, EF
0xDE, 0xAD, 0xBE, 0xEF
{ 0xDE, 0xAD, 0xBE, 0xEF }
```

The decoded byte count must exactly match `length`. When `fill` is used instead, it must contain exactly one byte such as `00` or `FF`.

## Fixed-length strings

String length is measured in bytes after encoding, not by character count.

```json
{
  "name": "displayName",
  "type": "string",
  "length": 20,
  "encoding": "shift_jis",
  "padding": "zero",
  "value": "通信"
}
```

The Shift_JIS bytes for `"通信"` are:

```text
92 CA 90 4D
```

The remaining bytes are padded with `00`.

## Offset validation

Fields are generated in `fields` order. `offset` is an optional expected offset from the source specification.

If `offset` does not match the calculated offset, Spec to BIN reports an error and blocks `.bin` export.

This is intentional. It helps catch missing padding or omitted fields in AI-generated JSON instead of silently moving later fields.

## Validation policy

Errors block `.bin` export. Warnings are visible but do not block export.

Examples of errors:

- Number out of range
- Unknown endian on endian-aware numeric fields
- Unknown encoding on string fields
- `needsReview: true`
- Expected offset mismatch
- Invalid IPv4 address
- Fixed-length string byte overflow
- Invalid hex bytes
- Byte length mismatch

Examples of warnings:

- Empty fields list
- Duplicate field names
- Unknown properties preserved from JSON
- Known properties that do not apply to the selected field type

## Resource limits

To keep malformed or AI-generated input from exhausting browser memory, v0.1 applies these limits:

| Resource | Limit |
| --- | --- |
| JSON file/editor input | 5 MiB |
| Number of fields | 5,000 |
| One `bytes`, `string`, or `padding` field | 16 MiB |
| Total generated binary | 64 MiB |

For rendering safety, the Hex preview shows at most the first 8 KiB and text copy formats are available up to 64 KiB. These display limits do not reduce the 64 MiB `.bin` save limit.
