# Spec to BIN

仕様書から、テストBINを作る。

Spec to BIN は、通信電文、組込み設定データ、EEPROMデータ、初期設定BIN、テストペイロードを、構造化されたJSONテンプレートから作成するためのブラウザアプリです。

一般的なHex Editorではありません。バイナリ構造を定義し、GUIで値を確認・編集し、エラーを検証し、Hexをプレビューして、最終的に `.bin` を保存することを目的にしています。

## プライバシー

- ブラウザ内で処理します。
- JSONテンプレート、生成BIN、入力値、仕様情報をアップロードしません。
- テレメトリはありません。
- 初期版ではAI API連携を内蔵しません。
- リリース版には単一HTMLのオフラインZIPを含めます。

## v0.1 の機能

- JSONバイナリテンプレートの読込・保存
- 表上でName、Type、Size、Format、Value、Note、期待Offsetを編集
- 行の並び替え、追加、複製、削除
- Undo/Redoと未保存警告
- Offsetとbyteサイズの表示
- 問題のある行の直下にバリデーションを表示
- 期待Offsetと計算Offsetの照合
- 表の上で生成Hexをプレビューし、選択項目の範囲を強調
- 生成byte列を `0x` リスト、C配列、C# `byte[]`、Python `bytes`、通常Hexとしてコピー
- `.bin` 保存
- 日本語/英語UI
- システム/ライト/ダークテーマ
- PWA・オフライン対応

## 対応フィールド型

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

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

`dist` はWeb/PWA配信用です。HTTP(S)サーバーで配信してください。`file://` で直接開く用途ではありません。

## オフラインビルド

```bash
npm run build:offline
```

`dist-offline/index.html` はブラウザで直接開けます。JavaScriptとCSSを1ファイルに埋め込んでいます。GitHubのタグ付きリリースでは、この出力をオフラインZIPにします。

## テスト

```bash
npm run test:run
```

## 安全上の上限

- JSONファイル・直接編集: 5 MiB
- 項目数: 5,000
- 1つの可変長項目: 16 MiB
- 生成BIN: 64 MiB
- Hexプレビュー: 先頭8 KiB
- テキストコピー出力: 64 KiB

未知のJSONプロパティは可能な限り保持し、警告として表示します。エラーがある場合はプレビュー、コピー、BIN保存を停止し、警告だけなら生成できます。

## ドキュメント

- [Template format](./docs/template-format.md)
- [JSON Schema](./docs/binary-template.schema.json)
- [AI prompt example](./prompts/spec-to-bin-json.md)
