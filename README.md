# Spec to BIN

Build test binaries from specs.

Spec to BIN is a browser-based tool for creating communication packets, embedded settings, EEPROM images, initialization BIN files, and test payloads from structured JSON templates.

It is not a general-purpose hex editor. The goal is to reduce manual hex editing by letting you define binary structure, edit values in a GUI, validate errors, preview bytes, and export `.bin` files.

## Privacy

- Runs locally in your browser.
- No upload of JSON templates, generated BIN files, field values, or specification-derived data.
- No telemetry.
- No built-in AI API integration.
- Offline ZIP distribution is planned.

## Features in v0.1

- Load and save JSON binary templates
- Edit field values in a GUI
- Show offsets and byte sizes
- Validate field values
- Validate expected offsets against calculated offsets
- Preview generated hex bytes
- Save `.bin`
- English and Japanese UI
- System, light, and dark themes
- PWA-ready foundation

## Supported field types

- `uint8`
- `uint16`
- `uint32`
- `int8`
- `int16`
- `int32`
- `bytes`
- `string`
- `ipv4`
- `padding`

## Quick start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test:run
```

## Sample JSON

```json
{
  "formatVersion": "0.1",
  "name": "sample_packet",
  "defaultEndian": "big",
  "defaultEncoding": "shift_jis",
  "fields": [
    {
      "name": "messageId",
      "type": "uint16",
      "offset": 0,
      "value": "0x000F"
    },
    {
      "name": "callSign",
      "type": "string",
      "offset": 2,
      "length": 20,
      "encoding": "shift_jis",
      "padding": "zero",
      "value": "sikikan1"
    }
  ]
}
```

More examples are available in [`examples`](./examples).

## Documentation

- [Template format](./docs/template-format.md)
- [AI prompt example](./prompts/spec-to-bin-json.md)
- [Japanese README](./README.ja.md)

## Deferred features

These are intentionally outside the first version:

- Built-in AI API integration
- TCP/UDP send
- Existing BIN reverse parsing
- CRC/checksum
- repeat structures
- lengthOf/countOf/offsetOf auto fields
- batch generation
- CLI
- desktop executable

## License

MIT
