import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Copy, GripVertical, Lock, Plus, Trash2, Unlock, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  toOffset,
  type BinaryTemplate,
  type EncodingName,
  type Endian,
  type FieldDefinition,
  type FieldLayout,
  type FieldType,
  type PaddingMode,
  type ValidationIssue
} from "../core";
import {
  encodingOptions,
  endianOptions,
  fieldTypeOptions,
  getFieldByteUsage,
  paddingOptions,
  usesEndian,
  usesLength
} from "../fieldEditor";
import { translate, type Locale } from "../i18n";
import type { Translator } from "../uiTypes";

export function SortableFieldRows({
  addFieldAt,
  clearNeedsReview,
  deleteField,
  duplicateField,
  id,
  issues,
  layout,
  locale,
  selected,
  setSelectedFieldIndex,
  setDraftFieldError,
  status,
  t,
  template,
  updateField,
  updateFieldNumber,
  updateFieldType
}: {
  addFieldAt: (insertIndex: number) => void;
  clearNeedsReview: (index: number) => void;
  deleteField: (index: number) => void;
  duplicateField: (index: number) => void;
  id: string;
  issues: ValidationIssue[];
  layout: FieldLayout;
  locale: Locale;
  selected: boolean;
  setSelectedFieldIndex: (index: number) => void;
  setDraftFieldError: (
    fieldId: string,
    kind: "offset" | "length",
    code: string | undefined
  ) => void;
  status: "ok" | "warning" | "error";
  t: Translator;
  template: BinaryTemplate;
  updateField: (index: number, patch: Partial<FieldDefinition>) => void;
  updateFieldNumber: (index: number, key: "offset" | "length", value: string) => boolean;
  updateFieldType: (index: number, type: FieldType) => void;
}) {
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const byteUsage = getFieldByteUsage(layout.field, template);

  return (
    <tbody
      className={isDragging ? "field-row-group dragging" : "field-row-group"}
      ref={setNodeRef}
      style={style}
    >
      <tr className={selected ? "selected" : ""} onClick={() => setSelectedFieldIndex(layout.index)}>
        <td className="drag-cell">
          <button
            type="button"
            className="drag-handle"
            title={t("row.drag")}
            aria-label={t("row.drag")}
            ref={setActivatorNodeRef}
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={15} />
          </button>
        </td>
        <td>
          <IntegerFieldInput
            className="table-input mono offset-cell"
            displayValue={layout.field.offset === undefined ? "" : toOffset(layout.field.offset)}
            invalidMessage={t("issue.field.offset.invalid")}
            placeholder={toOffset(layout.offset)}
            title={t("help.offset")}
            onCommit={(value) => updateFieldNumber(layout.index, "offset", value)}
            onValidityChange={(invalid) =>
              setDraftFieldError(id, "offset", invalid ? "field.offset.invalid" : undefined)
            }
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
            onChange={(event) => updateFieldType(layout.index, event.target.value as FieldType)}
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
            <IntegerFieldInput
              className="table-input mono size-cell"
              displayValue={String(layout.field.length ?? "")}
              invalidMessage={t("issue.field.length.invalid")}
              onCommit={(value) => updateFieldNumber(layout.index, "length", value)}
              onValidityChange={(invalid) =>
                setDraftFieldError(id, "length", invalid ? "field.length.invalid" : undefined)
              }
            />
          ) : (
            <input className="table-input mono size-cell" value={layout.size} disabled title={t("help.fixedSize")} />
          )}
        </td>
        <td>
          {usesEndian(layout.field.type) ? (
            <select
              className="table-input"
              value={layout.field.endian ?? "__default"}
              onChange={(event) =>
                updateField(layout.index, {
                  endian: event.target.value === "__default" ? undefined : (event.target.value as Endian)
                })
              }
              onClick={(event) => event.stopPropagation()}
            >
              <option value="__default">
                {t("format.defaultEndian", {
                  value: template.defaultEndian ?? "unknown"
                })}
              </option>
              {endianOptions.map((endian) => (
                <option value={endian} key={endian}>
                  {endian === "unknown" ? t("format.unknownEndian") : t("format.endian", { value: endian })}
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
                    event.target.value === "__default" ? undefined : (event.target.value as EncodingName)
                })
              }
              onClick={(event) => event.stopPropagation()}
            >
              <option value="__default">
                {t("format.defaultEncoding", {
                  value: template.defaultEncoding ?? "unknown"
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
              onChange={(event) => updateField(layout.index, { padding: event.target.value as PaddingMode })}
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
            <div className="value-editor">
              <div className="value-input-row">
                <input
                  className="table-input value-input"
                  value={String(layout.field.value ?? "")}
                  disabled={layout.field.fixed}
                  onChange={(event) => updateField(layout.index, { value: event.target.value })}
                  onClick={(event) => event.stopPropagation()}
                />
                <button
                  type="button"
                  className={layout.field.fixed ? "icon-button fixed-toggle active" : "icon-button fixed-toggle"}
                  title={layout.field.fixed ? t("field.unlock") : t("field.lock")}
                  aria-label={layout.field.fixed ? t("field.unlock") : t("field.lock")}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateField(layout.index, { fixed: !layout.field.fixed });
                  }}
                >
                  {layout.field.fixed ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              </div>
              {byteUsage ? (
                <span className="byte-usage">
                  {t("field.byteUsage", { used: byteUsage.used, max: byteUsage.max })}
                </span>
              ) : null}
            </div>
          )}
        </td>
        <td>
          <StatusBadge
            status={status}
            label={issues.length === 0 ? t("status.ok") : t(`status.${status}`, { count: issues.length })}
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
          <td colSpan={11}>
            <div className="field-issues">
              {issues.map((issue, index) => (
                <div className={`field-issue ${issue.level}`} key={`${issue.code}-${index}`}>
                  {issue.level === "error" ? <XCircle size={15} /> : <AlertTriangle size={15} />}
                  <span>{translateIssue(locale, issue.code, issue.messageParams)}</span>
                </div>
              ))}
              {layout.field.needsReview ? (
                <button type="button" className="button compact" onClick={() => clearNeedsReview(layout.index)}>
                  {t("details.clearReview")}
                </button>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}

function IntegerFieldInput({
  className,
  displayValue,
  invalidMessage,
  onCommit,
  onValidityChange,
  placeholder,
  title
}: {
  className: string;
  displayValue: string;
  invalidMessage: string;
  onCommit: (value: string) => boolean;
  onValidityChange: (invalid: boolean) => void;
  placeholder?: string;
  title?: string;
}) {
  const [draft, setDraft] = useState(displayValue);
  const [invalid, setInvalid] = useState(false);
  const skipCommit = useRef(false);
  const focused = useRef(false);
  const focusStartValue = useRef(displayValue);

  useEffect(() => {
    if (!focused.current) {
      setDraft(displayValue);
    }
  }, [displayValue]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      skipCommit.current = true;
      setDraft(focusStartValue.current);
      setInvalid(false);
      onValidityChange(false);
      onCommit(focusStartValue.current);
      event.currentTarget.blur();
    }
  }

  return (
    <input
      className={className}
      value={draft}
      aria-invalid={invalid}
      placeholder={placeholder}
      title={invalid ? invalidMessage : title}
      onFocus={() => {
        focused.current = true;
        focusStartValue.current = displayValue;
      }}
      onChange={(event) => {
        const value = event.target.value;
        const accepted = onCommit(value);
        setDraft(value);
        setInvalid(!accepted);
        onValidityChange(!accepted);
      }}
      onBlur={() => {
        focused.current = false;
        if (skipCommit.current) {
          skipCommit.current = false;
          return;
        }
        const accepted = onCommit(draft);
        setInvalid(!accepted);
        onValidityChange(!accepted);
        if (accepted) {
          setDraft(displayValue);
          focusStartValue.current = displayValue;
        }
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
    />
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

function translateIssue(
  locale: Locale,
  code: string,
  params: Record<string, string | number | undefined> = {}
): string {
  return translate(locale, `issue.${code}` as Parameters<typeof translate>[1], params);
}
