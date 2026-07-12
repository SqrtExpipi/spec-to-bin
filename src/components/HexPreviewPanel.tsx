import { ChevronDown, ChevronUp, Clipboard, XCircle } from "lucide-react";
import { toOffset, type FieldLayout, type HexRow, type TextPreviewEncoding } from "../core";
import type { Translator } from "../uiTypes";

export function HexPreviewPanel({
  copyDisabled,
  copyDisabledReason,
  expanded,
  hasErrors,
  hexRows,
  onOpenCopy,
  onTextEncodingChange,
  onToggleExpanded,
  previewNotice,
  selectedLayout,
  selectedRange,
  t,
  textEncoding
}: {
  copyDisabled: boolean;
  copyDisabledReason?: string;
  expanded: boolean;
  hasErrors: boolean;
  hexRows: HexRow[];
  onOpenCopy: () => void;
  onTextEncodingChange: (encoding: TextPreviewEncoding) => void;
  onToggleExpanded: () => void;
  previewNotice?: string;
  selectedLayout: FieldLayout | undefined;
  selectedRange: { start: number; end: number } | null;
  t: Translator;
  textEncoding: TextPreviewEncoding;
}) {
  const canExpand = hexRows.length > 2;
  const isExpanded = canExpand && expanded;
  const visibleRows = isExpanded ? hexRows : hexRows.slice(0, 2);

  return (
    <section className={isExpanded ? "preview-panel expanded" : "preview-panel compact-preview"}>
      <div className="panel-heading preview-heading">
        <div>
          <h2>{t("panel.preview")}</h2>
          {selectedLayout ? (
            <span>
              {t("panel.selectedField")}: {selectedLayout.field.name}
            </span>
          ) : null}
        </div>
        <div className="preview-actions">
          <button
            type="button"
            className="button compact"
            disabled={copyDisabled}
            title={copyDisabledReason}
            onClick={onOpenCopy}
          >
            <Clipboard size={14} />
            {t("copy.open")}
          </button>
          {canExpand ? (
            <button type="button" className="button compact" onClick={onToggleExpanded}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isExpanded ? t("preview.collapse") : t("preview.expand")}
            </button>
          ) : null}
        </div>
      </div>
      {hasErrors ? (
        <div className="empty-state compact">
          <XCircle size={18} />
          {t("panel.previewBlocked")}
        </div>
      ) : (
        <>
          {previewNotice ? <div className="preview-notice">{previewNotice}</div> : null}
          <div className="hex-dump" aria-label="Hex preview">
            <div className="hex-dump-row hex-dump-header">
              <span>Offset</span>
              {Array.from({ length: 16 }, (_, column) => (
                <span key={column}>{column.toString(16).toUpperCase().padStart(2, "0")}</span>
              ))}
              <label className="text-preview-header" title={t("preview.textHelp")}>
                <span>{t("preview.text")}</span>
                <select
                  aria-label={t("preview.textEncoding")}
                  value={textEncoding}
                  onChange={(event) =>
                    onTextEncodingChange(event.target.value as TextPreviewEncoding)
                  }
                >
                  <option value="ascii">ASCII</option>
                  <option value="utf-8">UTF-8</option>
                  <option value="shift_jis">Shift_JIS</option>
                </select>
              </label>
            </div>
            {hexRows.length === 0 ? (
              <div className="empty-state compact">{t("panel.emptyPreview")}</div>
            ) : (
              visibleRows.map((row) => (
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
                  <span className="hex-text">{row.decodedText}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
