# Spec to BIN JSON生成プロンプト

以下のテキストをプロンプトとして使用し、その後へ仕様書本文を貼り付けるか、仕様書ファイルを添付してください。生成されたJSONは、BIN保存前にSpec to BIN上で確認してください。

```text
このプロンプトに続けて貼り付けられた、または添付された仕様書を読み取り、Spec to BINのbinary-template形式でJSONを作成してください。

出力規則:
- JSONオブジェクトを1つだけ出力してください。Markdownのコードフェンスや説明文は付けないでください。
- "formatVersion"は"0.1"とし、"name"には短く一般的な名前を設定してください。
- "fields"は仕様書に記載された順番を維持してください。
- typeは次のいずれかだけを使用してください: uint8, uint16, uint32, uint64, int8, int16, int32, int64, bytes, string, ipv4, padding。
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

このプロンプトに続けて仕様書本文を貼り付けるか、仕様書ファイルを添付してください。
```
