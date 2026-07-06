# Spec to BIN

仕様書から、テストBINを作る。

Spec to BIN は、通信電文、組込み設定データ、EEPROMデータ、初期設定BIN、テストペイロードを、構造化されたJSONテンプレートから作成するためのブラウザアプリです。

一般的なHex Editorではありません。バイナリ構造を定義し、GUIで値を確認・編集し、エラーを検証し、Hexをプレビューして、最終的に `.bin` を保存することを目的にしています。

## プライバシー

- ブラウザ内で処理します。
- JSONテンプレート、生成BIN、入力値、仕様情報をアップロードしません。
- テレメトリはありません。
- 初期版ではAI API連携を内蔵しません。
- オフラインZIP配布を予定しています。

## v0.1 の機能

- JSONバイナリテンプレートの読込・保存
- GUIでの値編集
- Offsetとbyteサイズの表示
- 値のバリデーション
- 期待Offsetと計算Offsetの照合
- 生成Hexのプレビュー
- `.bin` 保存
- 日本語/英語UI
- システム/ライト/ダークテーマ
- PWA対応の土台

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

## テスト

```bash
npm run test:run
```

## ドキュメント

- [Template format](./docs/template-format.md)
- [AI prompt example](./prompts/spec-to-bin-json.md)
