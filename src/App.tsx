import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Braces,
  Clipboard,
  Copy,
  Download,
  FileInput,
  Info,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  X,
  XCircle
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import sampleTemplate from "../examples/communication-packet.json";
import { aiPrompt } from "./aiPrompt";
import {
  buildBinary,
  createCopyFormats,
  toHexRows,
  toOffset,
  type BinaryTemplate,
  type EncodingName,
  type Endian,
  type FieldDefinition,
  type FieldType,
  type PaddingMode
} from "./core";
import { detectInitialLocale, saveLocale, translate, type Locale } from "./i18n";
import { applyTheme, detectInitialTheme, saveTheme, type ThemeMode } from "./theme";
import { appVersion } from "./version";

type ToastState = { kind: "success" | "error" | "info"; message: string } | null;
type ResetMode = "blank" | "sample";

const issueKeyPrefix = "issue.";

const blankTemplate: BinaryTemplate = {
  formatVersion: "0.1",
  name: "new_template",
  defaultEndian: "big",
  defaultEncoding: "utf-8",
  fields: []
};

const fieldTypeOptions: FieldType[] = [
  "uint8",
  "uint16",
  "uint32",
  "int8",
  "int16",
  "int32",
  "bytes",
  "string",
  "ipv4",
  "padding"
];
const endianOptions: Endian[] = ["big", "little", "unknown"];
const encodingOptions: EncodingName[] = ["ascii", "utf-8", "shift_jis", "unknown"];
const paddingOptions: PaddingMode[] = ["zero", "space"];

export function App() {
  const [templateInput, setTemplateInput] = useState<unknown>(sampleTemplate);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(sampleTemplate, null, 2));
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const [theme, setTheme] = useState<ThemeMode>(() => detectInitialTheme());
  const [toast, setToast] = useState<ToastState>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveLocale(locale);
  }, [locale]);

  useEffect(() => {
    setJsonText(JSON.stringify(templateInput, null, 2));
  }, [templateInput]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onUpdateAvailable = () => {
      showToast("info", t("toast.updateAvailable"));
    };
    window.addEventListener("spec-to-bin:update-available", onUpdateAvailable);
    return () => window.removeEventListener("spec-to-bin:update-available", onUpdateAvailable);
  }, [locale]);

  const result = useMemo(() => buildBinary(templateInput), [templateInput]);
  const template = result.template;
  const fieldIssues = useMemo(() => {
    const map = new Map<number, typeof result.issues>();
    for (const issue of result.issues) {
      if (issue.fieldIndex === undefined) {
        continue;
      }
      map.set(issue.fieldIndex, [...(map.get(issue.fieldIndex) ?? []), issue]);
    }
    return map;
  }, [result.issues]);
  const globalIssues = useMemo(
    () => result.issues.filter((issue) => issue.fieldIndex === undefined),
    [result.issues]
  );

  const hasErrors = result.issues.some((issue) => issue.level === "error");
  const selectedLayout = result.layouts.find((layout) => layout.index === selectedFieldIndex);
  const selectedRange = selectedLayout
    ? { start: selectedLayout.offset, end: selectedLayout.offset + selectedLayout.size }
    : null;
  const hexRows = useMemo(() => toHexRows(result.bytes), [result.bytes]);
  const copyFormats = useMemo(() => createCopyFormats(result.bytes), [result.bytes]);

  useEffect(() => {
    if (hasErrors) {
      setCopyOpen(false);
    }
  }, [hasErrors]);

  function showToast(kind: NonNullable<ToastState>["kind"], message: string) {
    setToast({ kind, message });
  }

  function replaceTemplate(next: unknown) {
    setTemplateInput(next);
    setSelectedFieldIndex(0);
    setCopyOpen(false);
    setResetOpen(false);
  }

  function updateField(index: number, patch: Partial<FieldDefinition>) {
    setTemplateInput({
      ...template,
      fields: template.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    });
  }

  function updateFieldNumber(index: number, key: "offset" | "length", value: string) {
    const parsed = parseIntegerInput(value);
    updateField(index, {
      [key]: parsed
    });
  }

  function updateFieldType(index: number, type: FieldType) {
    const field = template.fields[index];
    const layout = result.layouts.find((item) => item.index === index);
    const patch: Partial<FieldDefinition> = { type };

    if (usesLength(type) && field.length === undefined) {
      patch.length = layout && layout.size > 0 ? layout.size : 1;
    }
    if (usesEndian(type) && field.endian === undefined) {
      patch.endian = template.defaultEndian ?? "big";
    }
    if (type === "string" && field.encoding === undefined) {
      patch.encoding = template.defaultEncoding ?? "utf-8";
    }
    if (type === "string" && field.padding === undefined) {
      patch.padding = "zero";
    }
    if (type === "padding") {
      patch.value = undefined;
    }

    updateField(index, patch);
  }

  function setFields(fields: FieldDefinition[], nextSelectedIndex: number) {
    setTemplateInput({
      ...template,
      fields
    });
    setSelectedFieldIndex(Math.max(0, Math.min(nextSelectedIndex, fields.length - 1)));
  }

  function addFieldAt(insertIndex: number) {
    const nextField: FieldDefinition = {
      name: makeUniqueFieldName(template.fields, "field"),
      type: "uint8",
      value: 0
    };
    const fields = [
      ...template.fields.slice(0, insertIndex),
      nextField,
      ...template.fields.slice(insertIndex)
    ];
    setFields(fields, insertIndex);
  }

  function moveField(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= template.fields.length) {
      return;
    }

    const fields = [...template.fields];
    const [field] = fields.splice(index, 1);
    fields.splice(nextIndex, 0, field);
    setFields(fields, nextIndex);
  }

  function duplicateField(index: number) {
    const source = template.fields[index];
    const copyField: FieldDefinition = {
      ...source,
      name: makeUniqueFieldName(template.fields, `${source.name || "field"}_copy`),
      offset: undefined
    };
    const insertIndex = index + 1;
    const fields = [
      ...template.fields.slice(0, insertIndex),
      copyField,
      ...template.fields.slice(insertIndex)
    ];
    setFields(fields, insertIndex);
  }

  function deleteField(index: number) {
    const fields = template.fields.filter((_, fieldIndex) => fieldIndex !== index);
    setFields(fields, index);
  }

  function clearNeedsReview(index: number) {
    updateField(index, { needsReview: undefined });
  }

  function applyReset(mode: ResetMode) {
    if (mode === "blank") {
      replaceTemplate({ ...blankTemplate, fields: [] });
    } else {
      replaceTemplate(sampleTemplate);
    }
    showToast("success", t("toast.templateReset"));
  }

  function applyJsonText() {
    try {
      const next = JSON.parse(jsonText) as unknown;
      replaceTemplate(next);
      showToast("success", t("toast.jsonLoaded"));
    } catch {
      showToast("error", t("toast.invalidJson"));
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", t("toast.copied"));
    } catch {
      showToast("error", t("toast.copyFailed"));
    }
  }

  function saveJson() {
    downloadBlob(
      new Blob([JSON.stringify(template, null, 2)], { type: "application/json" }),
      `${safeFileName(template.name || "binary-template")}.json`
    );
    showToast("success", t("toast.jsonSaved"));
  }

  function saveBin() {
    if (hasErrors) {
      showToast("error", t("error.binBlocked"));
      return;
    }

    downloadBlob(
      new Blob([bytesToArrayBuffer(result.bytes)], { type: "application/octet-stream" }),
      `${safeFileName(template.name || "output")}.bin`
    );
    showToast("success", t("toast.binSaved"));
  }

  function onJsonFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    file
      .text()
      .then((text) => {
        const next = JSON.parse(text) as unknown;
        replaceTemplate(next);
        showToast("success", t("toast.jsonLoaded"));
      })
      .catch(() => showToast("error", t("toast.invalidJson")));
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <Braces size={22} />
          </div>
          <div>
            <h1>{t("app.title")}</h1>
            <p>{t("app.tagline")}</p>
          </div>
          <span className="version-badge">{t("app.version", { version: appVersion })}</span>
        </div>

        <div className="header-controls">
          <label className="select-label">
            <span className="sr-only">Locale</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="en">{t("locale.en")}</option>
              <option value="ja">{t("locale.ja")}</option>
            </select>
          </label>
          <div className="theme-switcher" role="group" aria-label={t("theme.label")}>
            <ThemeButton
              active={theme === "system"}
              label={t("theme.system")}
              onClick={() => setTheme("system")}
            >
              <Monitor size={16} />
            </ThemeButton>
            <ThemeButton active={theme === "light"} label={t("theme.light")} onClick={() => setTheme("light")}>
              <Sun size={16} />
            </ThemeButton>
            <ThemeButton active={theme === "dark"} label={t("theme.dark")} onClick={() => setTheme("dark")}>
              <Moon size={16} />
            </ThemeButton>
          </div>
        </div>
      </header>

      <section className="toolbar" aria-label="Primary actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            onJsonFileSelected(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <div className="toolbar-actions">
          <button type="button" className="button primary" onClick={() => fileInputRef.current?.click()}>
            <FileInput size={16} />
            {t("toolbar.loadJson")}
          </button>
          <button type="button" className="button" onClick={saveJson}>
            <Save size={16} />
            {t("toolbar.saveJson")}
          </button>
          <button type="button" className="button" onClick={() => setJsonOpen((open) => !open)}>
            <Braces size={16} />
            {t("toolbar.jsonPanel")}
          </button>
          <button type="button" className="button strong" onClick={saveBin}>
            <Download size={16} />
            {t("toolbar.saveBin")}
          </button>
          <button type="button" className="button" onClick={() => copyText(aiPrompt)}>
            <Clipboard size={16} />
            {t("toolbar.copyPrompt")}
          </button>
        </div>
        <div className="toolbar-end">
          <div className="privacy-note">
            <ShieldCheck size={15} />
            {t("toolbar.privacy")}
          </div>
          <button type="button" className="button subtle-button" onClick={() => setResetOpen(true)}>
            <RotateCcw size={16} />
            {t("toolbar.reset")}
          </button>
        </div>
      </section>

      <main className="workspace">
        <section className="field-panel" aria-label="Fields">
          <div className="panel-title-row">
            <div>
              <h2>{template.name}</h2>
              <p>
                formatVersion {template.formatVersion} / endian {template.defaultEndian ?? "big"} /
                encoding {template.defaultEncoding ?? "utf-8"}
              </p>
            </div>
            <div className="panel-actions">
              <div className="size-pill">
                {t("panel.totalSize")}: <strong>{result.bytes.length}</strong> bytes
              </div>
              <button type="button" className="button compact" onClick={() => addFieldAt(0)}>
                <Plus size={15} />
                {t("field.addAtStart")}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="field-table">
              <thead>
                <tr>
                  <th>
                    <HeaderLabel label={t("table.offset")} help={t("help.offset")} />
                  </th>
                  <th>
                    <HeaderLabel label={t("table.name")} help={t("help.name")} />
                  </th>
                  <th>
                    <HeaderLabel label={t("table.type")} help={t("help.type")} />
                  </th>
                  <th>
                    <HeaderLabel label={t("table.size")} help={t("help.size")} />
                  </th>
                  <th>
                    <HeaderLabel label={t("table.format")} help={t("help.format")} />
                  </th>
                  <th>
                    <HeaderLabel label={t("table.fillPadding")} help={t("help.fillPadding")} />
                  </th>
                  <th>
                    <HeaderLabel label={t("table.value")} help={t("help.value")} />
                  </th>
                  <th>
                    <HeaderLabel label={t("table.validation")} help={t("help.validation")} />
                  </th>
                  <th>{t("table.note")}</th>
                  <th className="actions-heading">
                    <HeaderLabel label={t("table.actions")} help={t("help.actions")} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.layouts.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="table-empty">
                        <span>{t("field.empty")}</span>
                        <button type="button" className="button compact primary" onClick={() => addFieldAt(0)}>
                          <Plus size={15} />
                          {t("field.add")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {result.layouts.map((layout) => {
                  const issues = fieldIssues.get(layout.index) ?? [];
                  const status = getFieldStatus(issues);
                  return (
                    <Fragment key={layout.index}>
                      <tr
                        className={layout.index === selectedFieldIndex ? "selected" : ""}
                        onClick={() => setSelectedFieldIndex(layout.index)}
                      >
                        <td>
                          <input
                            className="table-input mono offset-cell"
                            value={layout.field.offset === undefined ? "" : toOffset(layout.field.offset)}
                            placeholder={toOffset(layout.offset)}
                            title={t("help.offset")}
                            onChange={(event) =>
                              updateFieldNumber(layout.index, "offset", event.target.value)
                            }
                            onClick={(event) => event.stopPropagation()}
                          />
                        </td>
                        <td>
                          <input
                            className="table-input field-name"
                            value={layout.field.name}
                            onChange={(event) => updateField(layout.index, { name: event.target.value })}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </td>
                        <td>
                          <select
                            className="table-input type-select"
                            value={layout.field.type}
                            onChange={(event) =>
                              updateFieldType(layout.index, event.target.value as FieldType)
                            }
                            onClick={(event) => event.stopPropagation()}
                          >
                            {fieldTypeOptions.map((type) => (
                              <option value={type} key={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {usesLength(layout.field.type) ? (
                            <input
                              className="table-input mono size-cell"
                              value={layout.field.length ?? ""}
                              onChange={(event) =>
                                updateFieldNumber(layout.index, "length", event.target.value)
                              }
                              onClick={(event) => event.stopPropagation()}
                            />
                          ) : (
                            <input
                              className="table-input mono size-cell"
                              value={layout.size}
                              disabled
                              title={t("help.fixedSize")}
                            />
                          )}
                        </td>
                        <td>
                          {usesEndian(layout.field.type) ? (
                            <select
                              className="table-input"
                              value={layout.field.endian ?? "__default"}
                              onChange={(event) =>
                                updateField(layout.index, {
                                  endian:
                                    event.target.value === "__default"
                                      ? undefined
                                      : (event.target.value as Endian)
                                })
                              }
                              onClick={(event) => event.stopPropagation()}
                            >
                              <option value="__default">
                                {t("format.defaultEndian", {
                                  value: template.defaultEndian ?? "big"
                                })}
                              </option>
                            {endianOptions.map((endian) => (
                              <option value={endian} key={endian}>
                                {endian === "unknown"
                                  ? t("format.unknownEndian")
                                  : t("format.endian", { value: endian })}
                              </option>
                            ))}
                            </select>
                          ) : layout.field.type === "string" ? (
                            <select
                              className="table-input"
                              value={layout.field.encoding ?? "__default"}
                              onChange={(event) =>
                                updateField(layout.index, {
                                  encoding:
                                    event.target.value === "__default"
                                      ? undefined
                                      : (event.target.value as EncodingName)
                                })
                              }
                              onClick={(event) => event.stopPropagation()}
                            >
                              <option value="__default">
                                {t("format.defaultEncoding", {
                                  value: template.defaultEncoding ?? "utf-8"
                                })}
                              </option>
                            {encodingOptions.map((encoding) => (
                              <option value={encoding} key={encoding}>
                                {encoding === "unknown"
                                  ? t("format.unknownEncoding")
                                  : t("format.encoding", { value: encoding })}
                              </option>
                            ))}
                            </select>
                          ) : (
                            <span className="cell-note">{t("format.notUsed")}</span>
                          )}
                        </td>
                        <td>
                          {layout.field.type === "string" ? (
                            <select
                              className="table-input"
                              value={layout.field.padding ?? "zero"}
                              onChange={(event) =>
                                updateField(layout.index, { padding: event.target.value as PaddingMode })
                              }
                              onClick={(event) => event.stopPropagation()}
                            >
                              {paddingOptions.map((padding) => (
                                <option value={padding} key={padding}>
                                  {t(`padding.${padding}`)}
                                </option>
                              ))}
                            </select>
                          ) : layout.field.type === "bytes" || layout.field.type === "padding" ? (
                            <input
                              className="table-input mono fill-cell"
                              value={layout.field.fill ?? ""}
                              placeholder="00"
                              title={t("help.fillPadding")}
                              onChange={(event) =>
                                updateField(layout.index, {
                                  fill: event.target.value.trim() === "" ? undefined : event.target.value
                                })
                              }
                              onClick={(event) => event.stopPropagation()}
                            />
                          ) : (
                            <span className="cell-note">{t("format.notUsed")}</span>
                          )}
                        </td>
                        <td>
                          {layout.field.type === "padding" ? (
                            <span className="cell-note">{t("value.generatedFromFill")}</span>
                          ) : (
                            <input
                              className="table-input value-input"
                              value={String(layout.field.value ?? "")}
                              disabled={layout.field.fixed}
                              onChange={(event) => updateField(layout.index, { value: event.target.value })}
                              onClick={(event) => event.stopPropagation()}
                            />
                          )}
                        </td>
                        <td>
                          <StatusBadge
                            status={status}
                            label={
                              issues.length === 0
                                ? t("status.ok")
                                : t(`status.${status}`, { count: issues.length })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="table-input note-cell"
                            value={layout.field.note ?? ""}
                            onChange={(event) =>
                              updateField(layout.index, {
                                note: event.target.value === "" ? undefined : event.target.value
                              })
                            }
                            onClick={(event) => event.stopPropagation()}
                          />
                        </td>
                        <td className="actions-cell">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-button"
                              title={t("row.moveUp")}
                              aria-label={t("row.moveUp")}
                              disabled={layout.index === 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveField(layout.index, -1);
                              }}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title={t("row.moveDown")}
                              aria-label={t("row.moveDown")}
                              disabled={layout.index === template.fields.length - 1}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveField(layout.index, 1);
                              }}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title={t("row.addBelow")}
                              aria-label={t("row.addBelow")}
                              onClick={(event) => {
                                event.stopPropagation();
                                addFieldAt(layout.index + 1);
                              }}
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title={t("row.duplicate")}
                              aria-label={t("row.duplicate")}
                              onClick={(event) => {
                                event.stopPropagation();
                                duplicateField(layout.index);
                              }}
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-button danger"
                              title={t("row.delete")}
                              aria-label={t("row.delete")}
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteField(layout.index);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {issues.length > 0 ? (
                        <tr className="field-issues-row">
                          <td colSpan={10}>
                            <div className="field-issues">
                              {issues.map((issue, index) => (
                                <div className={`field-issue ${issue.level}`} key={`${issue.code}-${index}`}>
                                  {issue.level === "error" ? (
                                    <XCircle size={15} />
                                  ) : (
                                    <AlertTriangle size={15} />
                                  )}
                                  <span>{translateIssue(locale, issue.code, issue.messageParams)}</span>
                                </div>
                              ))}
                              {layout.field.needsReview ? (
                                <button
                                  type="button"
                                  className="button compact"
                                  onClick={() => clearNeedsReview(layout.index)}
                                >
                                  {t("details.clearReview")}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="preview-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("panel.preview")}</h2>
              {selectedLayout ? (
                <span>
                  {t("panel.selectedField")}: {selectedLayout.field.name}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="button compact"
              disabled={hasErrors}
              onClick={() => setCopyOpen(true)}
            >
              <Clipboard size={14} />
              {t("copy.open")}
            </button>
          </div>
          {hasErrors ? (
            <div className="empty-state">
              <XCircle size={18} />
              {t("panel.previewBlocked")}
            </div>
          ) : (
            <div className="hex-dump" aria-label="Hex preview">
              <div className="hex-dump-row hex-dump-header">
                <span>Offset</span>
                {Array.from({ length: 16 }, (_, column) => (
                  <span key={column}>{column.toString(16).toUpperCase().padStart(2, "0")}</span>
                ))}
                <span>ASCII</span>
              </div>
              {hexRows.length === 0 ? (
                <div className="empty-state compact">{t("panel.emptyPreview")}</div>
              ) : (
                hexRows.map((row) => (
                  <div className="hex-dump-row" key={row.offset}>
                    <span className="hex-offset">{toOffset(row.offset)}</span>
                    {Array.from({ length: 16 }, (_, column) => {
                      const byte = row.bytes[column];
                      return (
                        <span
                          key={column}
                          className={
                            byte &&
                            selectedRange &&
                            byte.index >= selectedRange.start &&
                            byte.index < selectedRange.end
                              ? "hex-byte selected-byte"
                              : "hex-byte"
                          }
                        >
                          {byte?.text ?? ""}
                        </span>
                      );
                    })}
                    <span className="hex-ascii">{row.ascii}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {globalIssues.length > 0 ? (
          <section className="issues-panel">
            <div className="panel-heading">
              <h2>{t("panel.issues")}</h2>
              <span>{globalIssues.length}</span>
            </div>
            <div className="issue-list">
              {globalIssues.map((issue, index) => (
                <div className={`issue-item ${issue.level}`} key={`${issue.code}-${index}`}>
                  {issue.level === "error" ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                  <span>
                    <strong>{issue.fieldName ?? "template"}</strong>
                    {translateIssue(locale, issue.code, issue.messageParams)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {jsonOpen ? (
        <section className="json-panel" aria-label="JSON definition">
          <div className="panel-heading">
            <div>
              <h2>{t("panel.json")}</h2>
              <span>{t("panel.jsonHint")}</span>
            </div>
            <div className="json-actions">
              <button type="button" className="button compact" onClick={() => copyText(jsonText)}>
                {t("json.copy")}
              </button>
              <button type="button" className="button compact primary" onClick={applyJsonText}>
                {t("json.apply")}
              </button>
            </div>
          </div>
          <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} spellCheck={false} />
        </section>
      ) : null}

      {copyOpen && !hasErrors ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCopyOpen(false)}>
          <section
            className="modal-dialog copy-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="copy-dialog-title">{t("copy.title")}</h2>
                <p>{t("copy.ready")}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                title={t("copy.close")}
                aria-label={t("copy.close")}
                onClick={() => setCopyOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="copy-list">
              {copyFormats.map((format) => (
                <div className="copy-row" key={format.id}>
                  <div>
                    <strong>{format.label}</strong>
                    {format.language ? <span>{format.language}</span> : null}
                  </div>
                  <code>{format.value}</code>
                  <button type="button" className="button compact" onClick={() => copyText(format.value)}>
                    {t("copy.copy")}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {resetOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setResetOpen(false)}>
          <section
            className="modal-dialog reset-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="reset-dialog-title">{t("reset.title")}</h2>
                <p>{t("reset.description")}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                title={t("reset.cancel")}
                aria-label={t("reset.cancel")}
                onClick={() => setResetOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="reset-options">
              <button type="button" className="reset-option" onClick={() => applyReset("blank")}>
                <strong>{t("reset.blank")}</strong>
                <span>{t("reset.blankDescription")}</span>
              </button>
              <button type="button" className="reset-option" onClick={() => applyReset("sample")}>
                <strong>{t("reset.sample")}</strong>
                <span>{t("reset.sampleDescription")}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? <div className={`toast ${toast.kind}`}>{toast.message}</div> : null}
    </div>
  );
}

function HeaderLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="th-label">
      {label}
      <span className="info-tip" title={help} aria-label={help}>
        <Info size={13} />
      </span>
    </span>
  );
}

function ThemeButton({
  active,
  children,
  label,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "icon-button theme-button active" : "icon-button theme-button"}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
  label
}: {
  status: "ok" | "warning" | "error";
  label: string;
}) {
  return <span className={`status-badge ${status}`}>{label}</span>;
}

function getFieldStatus(issues: { level: string }[]): "ok" | "warning" | "error" {
  if (issues.some((issue) => issue.level === "error")) {
    return "error";
  }

  if (issues.length > 0) {
    return "warning";
  }

  return "ok";
}

function translateIssue(
  locale: Locale,
  code: string,
  params: Record<string, string | number | undefined> = {}
): string {
  const key = `${issueKeyPrefix}${code}` as Parameters<typeof translate>[1];
  return translate(locale, key, params);
}

function usesEndian(type: FieldType): boolean {
  return type === "uint16" || type === "uint32" || type === "int16" || type === "int32";
}

function usesLength(type: FieldType): boolean {
  return type === "bytes" || type === "string" || type === "padding";
}

function makeUniqueFieldName(fields: FieldDefinition[], base: string): string {
  const existing = new Set(fields.map((field) => field.name));
  if (!existing.has(base)) {
    return base;
  }

  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const candidate = `${base}${suffix}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  return `${base}_${Date.now()}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function parseIntegerInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    return Number.parseInt(trimmed.slice(2), 16);
  }

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return undefined;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "spec-to-bin";
}
