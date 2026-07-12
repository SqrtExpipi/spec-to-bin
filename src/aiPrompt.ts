import type { Locale } from "./i18n";

export const aiPromptFieldTypes = [
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "int8",
  "int16",
  "int32",
  "int64",
  "bytes",
  "string",
  "ipv4",
  "padding"
] as const;

const englishPrompt = `Read the specification supplied after this prompt or as an attachment and create a Spec to BIN binary-template JSON document.

Output rules:
- Output one JSON object only. Do not use Markdown fences or add explanations.
- Set "formatVersion" to "0.1" and provide a short, generic "name".
- Keep "fields" in the same order as the specification.
- Use only these field types: ${aiPromptFieldTypes.join(", ")}.
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

CRC and checksum fields:
- Spec to BIN v0.1 does not calculate CRC or checksums automatically. Do not emit unsupported properties such as calculation, formula, expression, or checksum.
- Represent the output area as an existing unsigned integer type when its width and byte order are clear; otherwise use bytes with the specified length.
- CRC and checksum values remain manually editable ordinary values. If the specification provides a concrete value, set it in "value" and add a "note" that it is not recalculated automatically.
- If no concrete value is provided, do not invent one. Add "needsReview": true and a "note" that the value must be calculated externally and entered by a human. Omit the unknown value so BIN export remains blocked.

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

Provide the specification after this prompt or attach the specification file.`;

const japanesePrompt = `このプロンプトに続けて貼り付けられた、または添付された仕様書を読み取り、Spec to BINのbinary-template形式でJSONを作成してください。

出力規則:
- JSONオブジェクトを1つだけ出力してください。Markdownのコードフェンスや説明文は付けないでください。
- "formatVersion"は"0.1"とし、"name"には短く一般的な名前を設定してください。
- "fields"は仕様書に記載された順番を維持してください。
- typeは次のいずれかだけを使用してください: ${aiPromptFieldTypes.join(", ")}。
- トップレベルで使用できるプロパティは次のとおりです: formatVersion, name, defaultEndian, defaultEncoding, fields。
- 各フィールドで使用できるプロパティは次のとおりです: name, type, value, offset, length, endian, encoding, padding, fill, fixed, needsReview, note。
- 仕様書に共通の既定値が明記されている場合だけdefaultEndianまたはdefaultEncodingを設定してください。それ以外は、必要なフィールドごとにendianまたはencodingを設定してください。
- "offset"は仕様書上の期待byte位置を検証するための値です。配置位置の指定や隙間の生成は行いません。明示的な隙間にはpaddingフィールドを追加してください。
- 固定値が指定されている場合は"value"に設定し、"fixed": trueを付けてください。

型ごとの規則:
- uint8/16/32/64、int8/16/32/64には"value"が必要です。複数byte整数にはフィールドまたは"defaultEndian"で"big"か"little"を指定してください。
- 整数値には10進数、または"0x1234"のような文字列を使用できます。uint64とint64は精度を失わないよう必ずJSON文字列にしてください。
- bytesには正のbyte数"length"と、16進数の"value"または1 byteの16進数"fill"のどちらか一方だけが必要です。value例: "DE AD BE EF"、fill例: "00"。
- stringには正のbyte数"length"、"value"、"encoding"（ascii、utf-8、shift_jis）、"padding"（zero、space）が必要です。lengthは文字数ではなくエンコード後のbyte数です。
- ipv4にはドット区切り10進表記の"value"が必要で、常に4 byteです。
- paddingは予約領域または未使用領域を表します。正のbyte数"length"が必要で、1 byteの16進数"fill"を指定できます。"value"は設定しません。

CRC・チェックサム項目の規則:
- Spec to BIN v0.1はCRCやチェックサムを自動計算しません。calculation、formula、expression、checksumなどの未対応プロパティを出力しないでください。
- bit幅とbyte orderが明確なら既存の符号なし整数型、明確でなければ仕様書に記載されたlengthのbytesとして出力領域を表現してください。
- CRC・チェックサムの値は通常のvalueとして人間が手入力します。仕様書に具体値がある場合は"value"へ設定し、自動再計算されないことを"note"へ記載してください。
- 具体値がない場合は推測しないでください。"needsReview": trueを付け、外部で計算して人間が入力する必要があることを"note"へ記載し、不明なvalueは省略してBIN保存を停止させてください。

不明・曖昧な情報の扱い:
- byte数、Endian、文字コード、符号有無、fillを根拠なく断定しないでください。
- "needsReview": trueを付け、何が不明なのかを短い"note"に具体的に記載してください。
- Endianが不明なら"endian": "unknown"、文字コードが不明なら"encoding": "unknown"としてください。
- 予約領域のfillが不明な場合は"fill": "00"としたうえで"needsReview": trueを付け、その仮定を"note"に記載してください。
- type自体を判断できない場合はbytesとし、"needsReview": trueを付け、不明なlengthは推測せず省略してください。
- needsReview、unknownのEndian/Encoding、必須項目不足、範囲外、Offset不一致は、人間が確認するまでBIN保存を停止します。

正しい出力例:
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

このプロンプトに続けて仕様書本文を貼り付けるか、仕様書ファイルを添付してください。`;

export function getAiPrompt(locale: Locale): string {
  return locale === "ja" ? japanesePrompt : englishPrompt;
}
