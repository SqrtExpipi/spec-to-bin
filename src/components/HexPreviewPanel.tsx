import { ChevronDown, ChevronUp, Clipboard, XCircle } from "lucide-react";
import { toOffset, type FieldLayout, type HexRow } from "../core";
import type { Translator } from "../uiTypes";

export function HexPreviewPanel({
  copyDisabled,
  copyDisabledReason,
  expanded,
  hasErrors,
  hexRows,
  onOpenCopy,
  onToggleExpanded,
  previewNotice,
  selectedLayout,
  selectedRange,
  t
}: {
  copyDisabled: boolean;
  copyDisabledReason?: string;
  expanded: boolean;
  hasErrors: boolean;
  hexRows: HexRow[];
  onOpenCopy: () => void;
  onToggleExpanded: () => void;
  previewNotice?: string;
  selectedLayout: FieldLayout | undefined;
  selectedRange: { start: number; end: number } | null;
  t: Translator;
}) {
  const visibleRows = expanded ? hexRows : hexRows.slice(0, 2);

  return (
    <section className={expanded ? "preview-panel expanded" : "preview-panel compact-preview"}>
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
          <button type="button" className="button compact" onClick={onToggleExpanded}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? t("preview.collapse") : t("preview.expand")}
          </button>
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
              <span>ASCII</span>
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
                  <span className="hex-ascii">{row.ascii}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
