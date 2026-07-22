import { CheckCircle2, X, XCircle } from "lucide-react";
import { toHexByte, toOffset } from "../core";
import type { BinaryComparison, BinaryDifference } from "../artifacts";
import type { Translator } from "../uiTypes";

export function BinaryComparisonDialog({
  comparison,
  onClose,
  t
}: {
  comparison: BinaryComparison;
  onClose: () => void;
  t: Translator;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-dialog comparison-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2 id="comparison-dialog-title">{t("compare.title")}</h2>
            <p className={comparison.matches ? "comparison-status success" : "comparison-status error"}>
              {comparison.matches ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {comparison.matches ? t("compare.match") : t("compare.mismatch")}
            </p>
          </div>
          <button type="button" className="icon-button" aria-label={t("copy.close")} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="comparison-content">
          <div className="comparison-summary">
            <Summary label={t("compare.expectedSize")} value={`${comparison.expectedSize} bytes`} />
            <Summary label={t("compare.actualSize")} value={`${comparison.actualSize} bytes`} />
            <Summary label={t("compare.matchingBytes")} value={comparison.matchingBytes} />
            <Summary label={t("compare.mismatchBytes")} value={comparison.mismatchBytes} />
            <Summary
              label={t("compare.firstMismatch")}
              value={
                comparison.firstMismatchOffset === undefined
                  ? "-"
                  : toOffset(comparison.firstMismatchOffset)
              }
            />
          </div>

          <div className="hash-list">
            <HashRow label={t("compare.expectedSha")} value={comparison.expectedSha256} />
            <HashRow label={t("compare.actualSha")} value={comparison.actualSha256} />
          </div>

          {comparison.differences.length > 0 ? (
            <div className="difference-wrap">
              <table className="difference-table">
                <thead>
                  <tr>
                    <th>{t("compare.offset")}</th>
                    <th>{t("compare.field")}</th>
                    <th>{t("compare.fieldOffset")}</th>
                    <th>{t("compare.expected")}</th>
                    <th>{t("compare.actual")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.differences.map((difference) => (
                    <DifferenceRow difference={difference} key={difference.offset} t={t} />
                  ))}
                </tbody>
              </table>
              {comparison.differencesTruncated ? (
                <p className="difference-notice">
                  {t("compare.truncated", { count: comparison.differences.length })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function DifferenceRow({
  difference,
  t
}: {
  difference: BinaryDifference;
  t: Translator;
}) {
  return (
    <tr className={difference.kind === "fixed" || difference.kind === "reserved" ? "important" : ""}>
      <td className="mono">{toOffset(difference.offset)}</td>
      <td>
        {difference.fieldName ?? t("compare.outside")}
        {difference.kind === "fixed" || difference.kind === "reserved" ? (
          <span className={`difference-kind ${difference.kind}`}>{t(`compare.kind.${difference.kind}`)}</span>
        ) : null}
      </td>
      <td className="mono">
        {difference.fieldOffset === undefined ? "-" : toOffset(difference.fieldOffset)}
      </td>
      <td className="mono">{formatByte(difference.expected)}</td>
      <td className="mono">{formatByte(difference.actual)}</td>
    </tr>
  );
}

function formatByte(value: number | undefined): string {
  return value === undefined ? "--" : toHexByte(value);
}
