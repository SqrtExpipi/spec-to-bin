export type Locale = "en" | "ja";

export type MessageKey =
  | "app.title"
  | "app.tagline"
  | "toolbar.loadJson"
  | "toolbar.saveJson"
  | "toolbar.saveBin"
  | "toolbar.loadSample"
  | "toolbar.copyPrompt"
  | "toolbar.validate"
  | "toolbar.jsonPanel"
  | "toolbar.privacy"
  | "theme.system"
  | "theme.light"
  | "theme.dark"
  | "locale.en"
  | "locale.ja"
  | "table.offset"
  | "table.name"
  | "table.type"
  | "table.size"
  | "table.value"
  | "table.status"
  | "table.note"
  | "status.ok"
  | "status.error"
  | "status.warning"
  | "panel.preview"
  | "panel.issues"
  | "panel.json"
  | "panel.noIssues"
  | "panel.previewBlocked"
  | "panel.totalSize"
  | "panel.selectedField"
  | "json.apply"
  | "json.copy"
  | "json.invalid"
  | "toast.copied"
  | "toast.copyFailed"
  | "toast.jsonLoaded"
  | "toast.jsonSaved"
  | "toast.binSaved"
  | "toast.invalidJson"
  | "toast.validationComplete"
  | "error.binBlocked"
  | "issue.template.invalid"
  | "issue.template.formatVersion.required"
  | "issue.template.name.required"
  | "issue.template.fields.required"
  | "issue.template.fields.empty"
  | "issue.field.name.required"
  | "issue.field.type.invalid"
  | "issue.field.length.required"
  | "issue.number.invalid"
  | "issue.number.outOfRange"
  | "issue.string.tooLong"
  | "issue.string.encodeFailed"
  | "issue.endian.unknown"
  | "issue.encoding.unknown"
  | "issue.encoding.unsupported"
  | "issue.bytes.lengthMismatch"
  | "issue.bytes.invalidHex"
  | "issue.bytes.invalidFill"
  | "issue.ipv4.invalid"
  | "issue.review.required"
  | "issue.reserved.unexpectedValue";

export type MessageParams = Record<string, string | number | undefined>;

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en: {
    "app.title": "Spec to BIN",
    "app.tagline": "Build test binaries from specs.",
    "toolbar.loadJson": "Load JSON",
    "toolbar.saveJson": "Save JSON",
    "toolbar.saveBin": "Save BIN",
    "toolbar.loadSample": "Load sample",
    "toolbar.copyPrompt": "Copy AI prompt",
    "toolbar.validate": "Validate",
    "toolbar.jsonPanel": "JSON",
    "toolbar.privacy": "Runs locally. No upload. No telemetry.",
    "theme.system": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "locale.en": "English",
    "locale.ja": "日本語",
    "table.offset": "Offset",
    "table.name": "Name",
    "table.type": "Type",
    "table.size": "Size",
    "table.value": "Value",
    "table.status": "Status",
    "table.note": "Note",
    "status.ok": "OK",
    "status.error": "Error",
    "status.warning": "Warning",
    "panel.preview": "Hex preview",
    "panel.issues": "Validation",
    "panel.json": "JSON definition",
    "panel.noIssues": "No issues.",
    "panel.previewBlocked": "Preview is unavailable until errors are fixed.",
    "panel.totalSize": "Total size",
    "panel.selectedField": "Selected field",
    "json.apply": "Apply JSON",
    "json.copy": "Copy JSON",
    "json.invalid": "The JSON text is invalid.",
    "toast.copied": "Copied.",
    "toast.copyFailed": "Copy failed.",
    "toast.jsonLoaded": "JSON loaded.",
    "toast.jsonSaved": "JSON saved.",
    "toast.binSaved": "BIN saved.",
    "toast.invalidJson": "Invalid JSON.",
    "toast.validationComplete": "Validation complete.",
    "error.binBlocked": "Fix validation errors before saving BIN.",
    "issue.template.invalid": "Template is invalid.",
    "issue.template.formatVersion.required": "formatVersion is required.",
    "issue.template.name.required": "name is required.",
    "issue.template.fields.required": "fields is required.",
    "issue.template.fields.empty": "fields is empty.",
    "issue.field.name.required": "Field name is required.",
    "issue.field.type.invalid": "Field type is invalid: {type}",
    "issue.field.length.required": "length is required and must be greater than 0.",
    "issue.number.invalid": "Value must be an integer.",
    "issue.number.outOfRange": "Value {value} is outside {min} to {max}.",
    "issue.string.tooLong": "String uses {used} bytes, but max is {max}.",
    "issue.string.encodeFailed": "String could not be encoded as {encoding}.",
    "issue.endian.unknown": "Endian is unknown.",
    "issue.encoding.unknown": "Encoding is unknown.",
    "issue.encoding.unsupported": "Encoding is unsupported: {encoding}",
    "issue.bytes.lengthMismatch": "Byte length is {actual}, but expected {expected}.",
    "issue.bytes.invalidHex": "Hex bytes are invalid.",
    "issue.bytes.invalidFill": "Fill must be exactly one hex byte.",
    "issue.ipv4.invalid": "IPv4 address is invalid.",
    "issue.review.required": "This field needs human review.",
    "issue.reserved.unexpectedValue": "Reserved or padding field should not have a value."
  },
  ja: {
    "app.title": "Spec to BIN",
    "app.tagline": "仕様書から、テストBINを作る。",
    "toolbar.loadJson": "JSON読込",
    "toolbar.saveJson": "JSON保存",
    "toolbar.saveBin": "BIN保存",
    "toolbar.loadSample": "サンプル読込",
    "toolbar.copyPrompt": "AIプロンプトコピー",
    "toolbar.validate": "検証",
    "toolbar.jsonPanel": "JSON",
    "toolbar.privacy": "ブラウザ内で処理します。アップロード・テレメトリなし。",
    "theme.system": "システム",
    "theme.light": "ライト",
    "theme.dark": "ダーク",
    "locale.en": "English",
    "locale.ja": "日本語",
    "table.offset": "Offset",
    "table.name": "Name",
    "table.type": "Type",
    "table.size": "Size",
    "table.value": "Value",
    "table.status": "Status",
    "table.note": "Note",
    "status.ok": "OK",
    "status.error": "エラー",
    "status.warning": "警告",
    "panel.preview": "Hexプレビュー",
    "panel.issues": "バリデーション",
    "panel.json": "JSON定義",
    "panel.noIssues": "問題はありません。",
    "panel.previewBlocked": "エラーを修正するまでプレビューできません。",
    "panel.totalSize": "合計サイズ",
    "panel.selectedField": "選択中の項目",
    "json.apply": "JSONを適用",
    "json.copy": "JSONをコピー",
    "json.invalid": "JSONテキストが不正です。",
    "toast.copied": "コピーしました。",
    "toast.copyFailed": "コピーに失敗しました。",
    "toast.jsonLoaded": "JSONを読み込みました。",
    "toast.jsonSaved": "JSONを保存しました。",
    "toast.binSaved": "BINを保存しました。",
    "toast.invalidJson": "JSONが不正です。",
    "toast.validationComplete": "検証しました。",
    "error.binBlocked": "BIN保存前にエラーを修正してください。",
    "issue.template.invalid": "テンプレートが不正です。",
    "issue.template.formatVersion.required": "formatVersion は必須です。",
    "issue.template.name.required": "name は必須です。",
    "issue.template.fields.required": "fields は必須です。",
    "issue.template.fields.empty": "fields が空です。",
    "issue.field.name.required": "項目名は必須です。",
    "issue.field.type.invalid": "項目typeが不正です: {type}",
    "issue.field.length.required": "length は必須で、1以上である必要があります。",
    "issue.number.invalid": "値は整数である必要があります。",
    "issue.number.outOfRange": "値 {value} は {min} から {max} の範囲外です。",
    "issue.string.tooLong": "文字列は {used} byte 使用していますが、最大は {max} byteです。",
    "issue.string.encodeFailed": "文字列を {encoding} としてエンコードできません。",
    "issue.endian.unknown": "エンディアンが unknown です。",
    "issue.encoding.unknown": "文字コードが unknown です。",
    "issue.encoding.unsupported": "未対応の文字コードです: {encoding}",
    "issue.bytes.lengthMismatch": "byte長が {actual} ですが、期待値は {expected} です。",
    "issue.bytes.invalidHex": "Hexバイト列が不正です。",
    "issue.bytes.invalidFill": "fill は1byte分のHexで指定してください。",
    "issue.ipv4.invalid": "IPv4アドレスが不正です。",
    "issue.review.required": "この項目は人間による確認が必要です。",
    "issue.reserved.unexpectedValue": "予約領域またはpadding項目には値を入れないでください。"
  }
};

export function formatMessage(
  locale: Locale,
  key: MessageKey,
  params: MessageParams = {}
): string {
  const template = messages[locale][key] ?? messages.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
}
