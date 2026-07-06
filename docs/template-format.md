# Binary template format

`binary-template` is the JSON format used by Spec to BIN. It is not JSON Schema itself.

## Top-level object

```json
{
  "formatVersion": "0.1",
  "name": "sample_packet",
  "defaultEndian": "big",
  "defaultEncoding": "shift_jis",
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
| `value` | Field value. Decimal numbers and hex strings such as `"0x000F"` are supported for numeric fields. |
| `length` | Fixed byte length for `bytes`, `string`, and `padding`. |
| `endian` | Field-level endian override. |
| `encoding` | Field-level string encoding override. |
| `padding` | String padding mode: `zero` or `space`. |
| `fill` | Fill byte for `bytes` and `padding`, for example `"00"` or `"FF"`. |
| `fixed` | Marks a fixed value in the UI. |
| `needsReview` | Marks AI-generated uncertain fields for human review. |
| `note` | Human-readable note. |

## Field types

| Type | Size | Notes |
| --- | --- | --- |
| `uint8` | 1 | Unsigned integer, 0 to 255. |
| `uint16` | 2 | Unsigned integer, endian-aware. |
| `uint32` | 4 | Unsigned integer, endian-aware. |
| `int8` | 1 | Signed integer, -128 to 127. |
| `int16` | 2 | Signed integer, endian-aware. |
| `int32` | 4 | Signed integer, endian-aware. |
| `bytes` | `length` | Explicit hex bytes or fill bytes. |
| `string` | `length` | Encoded by `encoding`, then padded. |
| `ipv4` | 4 | Dotted IPv4 address. |
| `padding` | `length` | Reserved area filled by `fill`. |

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

## Validation policy

Errors block `.bin` export. Warnings are visible but do not block export.

Examples of errors:

- Number out of range
- Invalid IPv4 address
- Fixed-length string byte overflow
- Invalid hex bytes
- Byte length mismatch

Examples of warnings:

- `needsReview: true`
- Unknown endian
- Unknown encoding
