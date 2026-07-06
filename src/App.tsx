import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  Clipboard,
  Download,
  FileInput,
  Save,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import sampleTemplate from "../examples/communication-packet.json";
import { aiPrompt } from "./aiPrompt";
import { buildBinary, formatHex, toHexRows, toOffset, type FieldDefinition } from "./core";
import { detectInitialLocale, saveLocale, translate, type Locale } from "./i18n";
import { applyTheme, detectInitialTheme, saveTheme, type ThemeMode } from "./theme";
import { appVersion } from "./version";

type ToastState = { kind: "success" | "error" | "info"; message: string } | null;

const issueKeyPrefix = "issue.";

export function App() {
  const [templateInput, setTemplateInput] = useState<unknown>(sampleTemplate);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(sampleTemplate, null, 2));
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const [theme, setTheme] = useState<ThemeMode>(() => detectInitialTheme());
  const [toast, setToast] = useState<ToastState>(null);
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

  const hasErrors = result.issues.some((issue) => issue.level === "error");
  const selectedLayout = result.layouts.find((layout) => layout.index === selectedFieldIndex);
  const selectedRange = selectedLayout
    ? { start: selectedLayout.offset, end: selectedLayout.offset + selectedLayout.size }
    : null;
  const hexRows = useMemo(() => toHexRows(result.bytes), [result.bytes]);

  function showToast(kind: NonNullable<ToastState>["kind"], message: string) {
    setToast({ kind, message });
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
    const trimmed = value.trim();
    updateField(index, {
      [key]: trimmed === "" ? undefined : Number(trimmed)
    });
  }

  function loadSample() {
    setTemplateInput(sampleTemplate);
    setSelectedFieldIndex(0);
    showToast("success", t("toast.jsonLoaded"));
  }

  function applyJsonText() {
    try {
      const next = JSON.parse(jsonText) as unknown;
      setTemplateInput(next);
      setSelectedFieldIndex(0);
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
        setTemplateInput(next);
        setSelectedFieldIndex(0);
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
          <label className="select-label">
            <span className="sr-only">Theme</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}>
              <option value="system">{t("theme.system")}</option>
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
          </label>
        </div>
      </header>

      <section className="toolbar" aria-label="Primary actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => onJsonFileSelected(event.target.files?.[0])}
        />
        <button type="button" className="button primary" onClick={() => fileInputRef.current?.click()}>
          <FileInput size={16} />
          {t("toolbar.loadJson")}
        </button>
        <button type="button" className="button" onClick={saveJson}>
          <Save size={16} />
          {t("toolbar.saveJson")}
        </button>
        <button type="button" className="button strong" onClick={saveBin}>
          <Download size={16} />
          {t("toolbar.saveBin")}
        </button>
        <button type="button" className="button" onClick={loadSample}>
          {t("toolbar.loadSample")}
        </button>
        <button type="button" className="button" onClick={() => copyText(aiPrompt)}>
          <Clipboard size={16} />
          {t("toolbar.copyPrompt")}
        </button>
        <button type="button" className="button" onClick={() => showToast("info", t("toast.validationComplete"))}>
          <CheckCircle2 size={16} />
          {t("toolbar.validate")}
        </button>
        <button type="button" className="button" onClick={() => setJsonOpen((open) => !open)}>
          <Braces size={16} />
          {t("toolbar.jsonPanel")}
        </button>
        <div className="privacy-note">
          <ShieldCheck size={15} />
          {t("toolbar.privacy")}
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
            <div className="size-pill">
              {t("panel.totalSize")}: <strong>{result.bytes.length}</strong> bytes
            </div>
          </div>

          <div className="table-wrap">
            <table className="field-table">
              <thead>
                <tr>
                  <th>{t("table.offset")}</th>
                  <th>{t("table.name")}</th>
                  <th>{t("table.type")}</th>
                  <th>{t("table.size")}</th>
                  <th>{t("table.value")}</th>
                  <th>{t("table.status")}</th>
                  <th>{t("table.note")}</th>
                </tr>
              </thead>
              <tbody>
                {result.layouts.map((layout) => {
                  const issues = fieldIssues.get(layout.index) ?? [];
                  const status = getFieldStatus(issues);
                  return (
                    <tr
                      key={`${layout.index}-${layout.field.name}`}
                      className={layout.index === selectedFieldIndex ? "selected" : ""}
                      onClick={() => setSelectedFieldIndex(layout.index)}
                    >
                      <td className="mono subtle">{toOffset(layout.offset)}</td>
                      <td className="field-name">{layout.field.name}</td>
                      <td>
                        <span className="type-token">{layout.field.type}</span>
                      </td>
                      <td className="mono">{layout.size}</td>
                      <td>
                        {layout.field.type === "padding" ? (
                          <span className="subtle">fill {layout.field.fill ?? "00"}</span>
                        ) : (
                          <input
                            className="value-input"
                            value={String(layout.field.value ?? "")}
                            disabled={layout.field.fixed}
                            onChange={(event) => updateField(layout.index, { value: event.target.value })}
                            onClick={(event) => event.stopPropagation()}
                          />
                        )}
                      </td>
                      <td>
                        <StatusBadge status={status} label={t(`status.${status}`)} />
                      </td>
                      <td className="note-cell">{layout.field.note ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="side-panel">
          <section className="preview-panel">
            <div className="panel-heading">
              <h2>{t("panel.preview")}</h2>
              {selectedLayout ? (
                <span>
                  {t("panel.selectedField")}: {selectedLayout.field.name}
                </span>
              ) : null}
            </div>
            {hasErrors ? (
              <div className="empty-state">
                <XCircle size={18} />
                {t("panel.previewBlocked")}
              </div>
            ) : (
              <div className="hex-view" aria-label="Hex preview">
                {hexRows.map((row) => (
                  <div className="hex-row" key={row.offset}>
                    <span className="hex-offset">{toOffset(row.offset)}</span>
                    <span className="hex-bytes">
                      {row.bytes.map((byte) => (
                        <span
                          key={byte.index}
                          className={
                            selectedRange && byte.index >= selectedRange.start && byte.index < selectedRange.end
                              ? "hex-byte selected-byte"
                              : "hex-byte"
                          }
                        >
                          {byte.text}
                        </span>
                      ))}
                    </span>
                    <span className="hex-ascii">{row.ascii}</span>
                  </div>
                ))}
              </div>
            )}
            {!hasErrors ? <div className="hex-flat">{formatHex(result.bytes)}</div> : null}
          </section>

          <section className="details-panel">
            <div className="panel-heading">
              <h2>{t("panel.details")}</h2>
              {selectedLayout ? <span>{selectedLayout.field.name}</span> : null}
            </div>
            {selectedLayout ? (
              <div className="details-grid">
                <label>
                  <span>{t("details.offset")}</span>
                  <input
                    className="detail-input"
                    inputMode="numeric"
                    value={selectedLayout.field.offset ?? ""}
                    placeholder={String(selectedLayout.offset)}
                    onChange={(event) =>
                      updateFieldNumber(selectedLayout.index, "offset", event.target.value)
                    }
                  />
                </label>

                {["string", "bytes", "padding"].includes(selectedLayout.field.type) ? (
                  <label>
                    <span>{t("details.length")}</span>
                    <input
                      className="detail-input"
                      inputMode="numeric"
                      value={selectedLayout.field.length ?? ""}
                      onChange={(event) =>
                        updateFieldNumber(selectedLayout.index, "length", event.target.value)
                      }
                    />
                  </label>
                ) : null}

                {["uint16", "uint32", "int16", "int32"].includes(selectedLayout.field.type) ? (
                  <label>
                    <span>{t("details.endian")}</span>
                    <select
                      className="detail-input"
                      value={selectedLayout.field.endian ?? ""}
                      onChange={(event) =>
                        updateField(selectedLayout.index, {
                          endian: event.target.value === "" ? undefined : event.target.value
                        } as Partial<FieldDefinition>)
                      }
                    >
                      <option value="">{t("details.unset")}</option>
                      <option value="big">big</option>
                      <option value="little">little</option>
                      <option value="unknown">unknown</option>
                    </select>
                  </label>
                ) : null}

                {selectedLayout.field.type === "string" ? (
                  <>
                    <label>
                      <span>{t("details.encoding")}</span>
                      <select
                        className="detail-input"
                        value={selectedLayout.field.encoding ?? ""}
                        onChange={(event) =>
                          updateField(selectedLayout.index, {
                            encoding: event.target.value === "" ? undefined : event.target.value
                          } as Partial<FieldDefinition>)
                        }
                      >
                        <option value="">{t("details.unset")}</option>
                        <option value="ascii">ascii</option>
                        <option value="utf-8">utf-8</option>
                        <option value="shift_jis">shift_jis</option>
                        <option value="unknown">unknown</option>
                      </select>
                    </label>

                    <label>
                      <span>{t("details.padding")}</span>
                      <select
                        className="detail-input"
                        value={selectedLayout.field.padding ?? "zero"}
                        onChange={(event) =>
                          updateField(selectedLayout.index, {
                            padding: event.target.value
                          } as Partial<FieldDefinition>)
                        }
                      >
                        <option value="zero">zero</option>
                        <option value="space">space</option>
                      </select>
                    </label>
                  </>
                ) : null}

                {["bytes", "padding"].includes(selectedLayout.field.type) ? (
                  <label>
                    <span>{t("details.fill")}</span>
                    <input
                      className="detail-input mono"
                      value={selectedLayout.field.fill ?? ""}
                      placeholder="00"
                      onChange={(event) =>
                        updateField(selectedLayout.index, {
                          fill: event.target.value.trim() === "" ? undefined : event.target.value
                        })
                      }
                    />
                  </label>
                ) : null}

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedLayout.field.fixed)}
                    onChange={(event) =>
                      updateField(selectedLayout.index, { fixed: event.target.checked || undefined })
                    }
                  />
                  <span>{t("details.fixed")}</span>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedLayout.field.needsReview)}
                    onChange={(event) =>
                      updateField(selectedLayout.index, {
                        needsReview: event.target.checked || undefined
                      })
                    }
                  />
                  <span>{t("details.needsReview")}</span>
                </label>

                {selectedLayout.field.needsReview ? (
                  <p className="details-hint">{t("details.clearReview")}</p>
                ) : null}

                <label className="details-note">
                  <span>{t("details.note")}</span>
                  <textarea
                    value={selectedLayout.field.note ?? ""}
                    onChange={(event) =>
                      updateField(selectedLayout.index, {
                        note: event.target.value === "" ? undefined : event.target.value
                      })
                    }
                  />
                </label>
              </div>
            ) : (
              <div className="empty-state">{t("details.empty")}</div>
            )}
          </section>

          <section className="issues-panel">
            <div className="panel-heading">
              <h2>{t("panel.issues")}</h2>
              <span>{result.issues.length}</span>
            </div>
            {result.issues.length === 0 ? (
              <div className="empty-state positive">
                <CheckCircle2 size={18} />
                {t("panel.noIssues")}
              </div>
            ) : (
              <div className="issue-list">
                {result.issues.map((issue, index) => (
                  <button
                    type="button"
                    className={`issue-item ${issue.level}`}
                    key={`${issue.code}-${index}`}
                    onClick={() => {
                      if (issue.fieldIndex !== undefined) {
                        setSelectedFieldIndex(issue.fieldIndex);
                      }
                    }}
                  >
                    {issue.level === "error" ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                    <span>
                      <strong>{issue.fieldName ?? "template"}</strong>
                      {translateIssue(locale, issue.code, issue.messageParams)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>

      {jsonOpen ? (
        <section className="json-panel" aria-label="JSON definition">
          <div className="panel-heading">
            <h2>{t("panel.json")}</h2>
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

      {toast ? <div className={`toast ${toast.kind}`}>{toast.message}</div> : null}
    </div>
  );
}

function StatusBadge({ status, label }: { status: "ok" | "warning" | "error"; label: string }) {
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

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "spec-to-bin";
}
