import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Braces,
  Clipboard,
  ClipboardPaste,
  Copy,
  Download,
  FileInput,
  Info,
  Monitor,
  Moon,
  PackageCheck,
  Plus,
  RotateCcw,
  Repeat2,
  Redo2,
  Save,
  Sun,
  Trash2,
  Undo2,
  WandSparkles,
  X,
  XCircle
} from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import sampleTemplate from "../examples/basic-fields.json";
import { getAiPrompt } from "./aiPrompt";
import { compareBinary, createTestDataPackage, type BinaryComparison } from "./artifacts";
import { BinaryComparisonDialog } from "./components/BinaryComparisonDialog";
import {
  generateFixedStringValue,
  repeatSelectedFields,
  type FullWidthRemainder,
  type RepeatNameMode,
  type TestValueMode
} from "./batchFields";
import { HexPreviewPanel } from "./components/HexPreviewPanel";
import { SortableFieldRows } from "./components/SortableFieldRows";
import {
  buildBinary,
  createCopyFormats,
  templateLimits,
  toHexRows,
  type BinaryTemplate,
  type EncodingName,
  type Endian,
  type FieldDefinition,
  type FieldType,
  type TextPreviewEncoding,
  type ValidationIssue
} from "./core";
import { encodingOptions, endianOptions, usesEndian, usesLength } from "./fieldEditor";
import { detectInitialLocale, saveLocale, translate, type Locale } from "./i18n";
import { applyTheme, detectInitialTheme, saveTheme, type ThemeMode } from "./theme";
import { appVersion } from "./version";

type ToastState = { kind: "success" | "error" | "info"; message: string } | null;
type ResetMode = "blank" | "sample";
type HistoryEntry = { value: unknown; snapshot: string };
type DraftFieldErrorKind = "offset" | "length";

const issueKeyPrefix = "issue.";
const maxHistoryEntries = 50;
const maxHistorySnapshotChars = 4 * 1024 * 1024;

const blankTemplate: BinaryTemplate = {
  formatVersion: "0.1",
  name: "new_template",
  defaultEndian: "big",
  defaultEncoding: "utf-8",
  fields: []
};

export function App() {
  const [templateInput, setTemplateInputState] = useState<unknown>(blankTemplate);
  const [fieldIds, setFieldIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [draftFieldErrors, setDraftFieldErrors] = useState<Record<string, string>>({});
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeTemplate(blankTemplate));
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(blankTemplate, null, 2));
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const [theme, setTheme] = useState<ThemeMode>(() => detectInitialTheme());
  const [toast, setToast] = useState<ToastState>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [textPreviewEncoding, setTextPreviewEncoding] = useState<TextPreviewEncoding>("ascii");
  const [comparison, setComparison] = useState<BinaryComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const comparisonFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [fieldClipboard, setFieldClipboard] = useState<FieldDefinition[]>([]);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatCount, setRepeatCount] = useState(2);
  const [repeatNameMode, setRepeatNameMode] = useState<RepeatNameMode>("appendPadded");
  const [repeatOffsets, setRepeatOffsets] = useState(true);
  const [testValueOpen, setTestValueOpen] = useState(false);
  const [testValueMode, setTestValueMode] = useState<TestValueMode>("asciiMax");
  const [testValueFill, setTestValueFill] = useState("-");
  const [fullWidthRemainder, setFullWidthRemainder] = useState<FullWidthRemainder>("ascii");
  const [jsonDragActive, setJsonDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonDragDepth = useRef(0);

  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);
  const currentSnapshot = useMemo(() => serializeTemplate(templateInput), [templateInput]);
  const hasDraftErrors = Object.keys(draftFieldErrors).length > 0;
  const isDirty = currentSnapshot !== savedSnapshot || hasDraftErrors;

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
  const totalSize = useMemo(
    () => result.layouts.reduce((sum, layout) => sum + layout.size, 0),
    [result.layouts]
  );
  const fieldIssues = useMemo(() => {
    const map = new Map<number, typeof result.issues>();
    for (const issue of result.issues) {
      if (issue.fieldIndex === undefined) {
        continue;
      }
      map.set(issue.fieldIndex, [...(map.get(issue.fieldIndex) ?? []), issue]);
    }
    for (const [key, code] of Object.entries(draftFieldErrors)) {
      const separatorIndex = key.lastIndexOf("|");
      const fieldId = key.slice(0, separatorIndex);
      const fieldIndex = fieldIds.indexOf(fieldId);
      if (fieldIndex < 0) {
        continue;
      }
      const draftIssue: ValidationIssue = {
        level: "error",
        code,
        fieldIndex,
        fieldName: result.layouts[fieldIndex]?.field.name
      };
      map.set(fieldIndex, [...(map.get(fieldIndex) ?? []), draftIssue]);
    }
    return map;
  }, [draftFieldErrors, fieldIds, result.issues, result.layouts]);
  const globalIssues = useMemo(
    () => result.issues.filter((issue) => issue.fieldIndex === undefined),
    [result.issues]
  );

  const hasErrors = result.issues.some((issue) => issue.level === "error") || hasDraftErrors;
  const selectedLayout = result.layouts.find((layout) => layout.index === selectedFieldIndex);
  const selectedRange = selectedLayout
    ? { start: selectedLayout.offset, end: selectedLayout.offset + selectedLayout.size }
    : null;
  const previewTruncated = result.bytes.length > templateLimits.maxPreviewBytes;
  const previewBytes = useMemo(
    () => result.bytes.subarray(0, templateLimits.maxPreviewBytes),
    [result.bytes]
  );
  const hexRows = useMemo(
    () => toHexRows(previewBytes, 16, textPreviewEncoding, result.layouts),
    [previewBytes, result.layouts, textPreviewEncoding]
  );
  const copyTooLarge = result.bytes.length > templateLimits.maxCopyBytes;
  const copyFormats = useMemo(
    () => (copyOpen && !copyTooLarge ? createCopyFormats(result.bytes) : []),
    [copyOpen, copyTooLarge, result.bytes]
  );
  const sortableFieldIds = useMemo(
    () => result.layouts.map((layout) => fieldIds[layout.index] ?? createFieldId()),
    [fieldIds, result.layouts]
  );
  const selectedFieldIndices = useMemo(
    () =>
      fieldIds
        .map((id, index) => (selectedFieldIds.includes(id) ? index : -1))
        .filter((index) => index >= 0),
    [fieldIds, selectedFieldIds]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    if (hexRows.length <= 2) {
      setPreviewExpanded(false);
    }
  }, [hexRows.length]);

  useEffect(() => {
    if (hasErrors || copyTooLarge) {
      setCopyOpen(false);
    }
  }, [copyTooLarge, hasErrors]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!copyOpen && !resetOpen && !comparison && !repeatOpen && !testValueOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCopyOpen(false);
        setResetOpen(false);
        setComparison(null);
        setRepeatOpen(false);
        setTestValueOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [comparison, copyOpen, repeatOpen, resetOpen, testValueOpen]);

  function showToast(kind: NonNullable<ToastState>["kind"], message: string) {
    setToast({ kind, message });
  }

  function setTemplateInput(next: unknown) {
    if (serializeTemplate(next) === currentSnapshot) {
      return;
    }
    setHistory((items) =>
      limitHistory([...items, { value: templateInput, snapshot: currentSnapshot }], "latest-at-end")
    );
    setFuture([]);
    setTemplateInputState(next);
  }

  function replaceTemplate(next: unknown, markClean = false) {
    setTemplateInput(next);
    setFieldIds(createFieldIds(getTemplateFieldCount(next)));
    setSelectedFieldIndex(0);
    setCopyOpen(false);
    setResetOpen(false);
    setRepeatOpen(false);
    setTestValueOpen(false);
    setSelectedFieldIds([]);
    setDraftFieldErrors({});
    if (markClean) {
      setSavedSnapshot(serializeTemplate(next));
    }
  }

  function undo() {
    const previous = history.at(-1);
    if (previous === undefined) {
      return;
    }
    setHistory((items) => items.slice(0, -1));
    setFuture((items) =>
      limitHistory(
        [{ value: templateInput, snapshot: currentSnapshot }, ...items],
        "latest-at-start"
      )
    );
    setTemplateInputState(previous.value);
    setFieldIds(createFieldIds(getTemplateFieldCount(previous.value)));
    setSelectedFieldIds([]);
    setDraftFieldErrors({});
  }

  function redo() {
    const next = future[0];
    if (next === undefined) {
      return;
    }
    setFuture((items) => items.slice(1));
    setHistory((items) =>
      limitHistory([...items, { value: templateInput, snapshot: currentSnapshot }], "latest-at-end")
    );
    setTemplateInputState(next.value);
    setFieldIds(createFieldIds(getTemplateFieldCount(next.value)));
    setSelectedFieldIds([]);
    setDraftFieldErrors({});
  }

  function updateField(index: number, patch: Partial<FieldDefinition>) {
    setTemplateInput({
      ...template,
      fields: template.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    });
  }

  function updateTemplate(patch: Partial<BinaryTemplate>) {
    setTemplateInput({
      ...template,
      ...patch
    });
  }

  function updateFieldNumber(index: number, key: "offset" | "length", value: string): boolean {
    const parsed = parseIntegerInput(value);
    if (value.trim() !== "" && parsed === undefined) {
      return false;
    }
    updateField(index, {
      [key]: parsed
    });
    return true;
  }

  function setDraftFieldError(
    fieldId: string,
    kind: DraftFieldErrorKind,
    code: string | undefined
  ) {
    const key = `${fieldId}|${kind}`;
    setDraftFieldErrors((errors) => {
      if (code === undefined) {
        if (!(key in errors)) {
          return errors;
        }
        const next = { ...errors };
        delete next[key];
        return next;
      }
      return errors[key] === code ? errors : { ...errors, [key]: code };
    });
  }

  function updateFieldType(index: number, type: FieldType) {
    const field = template.fields[index];
    const layout = result.layouts.find((item) => item.index === index);
    const patch: Partial<FieldDefinition> = {
      type,
      length: undefined,
      endian: undefined,
      encoding: undefined,
      padding: undefined,
      fill: undefined
    };

    if (usesLength(type)) {
      patch.length = field.length ?? (layout && layout.size > 0 ? layout.size : 1);
    }
    if (usesEndian(type)) {
      patch.endian = field.endian ?? template.defaultEndian ?? "big";
    }
    if ((type === "uint64" || type === "int64") && typeof field.value === "number") {
      // Safe JSON numbers can be migrated without changing their value. Unsafe
      // numbers stay numeric so validation continues to expose the precision risk.
      if (Number.isSafeInteger(field.value)) {
        patch.value = String(field.value);
      }
    }
    if (type === "string") {
      patch.encoding = field.encoding ?? template.defaultEncoding ?? "utf-8";
      patch.padding = field.padding ?? "zero";
    }
    if (type === "bytes" || type === "padding") {
      patch.fill = field.fill;
    }
    if (type === "padding") {
      patch.value = undefined;
    }

    const fieldId = fieldIds[index];
    if (fieldId) {
      setDraftFieldError(fieldId, "length", undefined);
    }
    updateField(index, patch);
  }

  function setFields(
    fields: FieldDefinition[],
    nextSelectedIndex: number,
    nextFieldIds: string[] = fieldIds,
    nextBatchSelection: string[] = selectedFieldIds
  ) {
    setTemplateInput({
      ...template,
      fields
    });
    setFieldIds(nextFieldIds);
    setSelectedFieldIds(nextBatchSelection.filter((id) => nextFieldIds.includes(id)));
    const validIds = new Set(nextFieldIds);
    setDraftFieldErrors((errors) =>
      Object.fromEntries(
        Object.entries(errors).filter(([key]) => validIds.has(key.slice(0, key.lastIndexOf("|"))))
      )
    );
    setSelectedFieldIndex(Math.max(0, Math.min(nextSelectedIndex, fields.length - 1)));
  }

  function addFieldAt(insertIndex: number) {
    const nextField: FieldDefinition = {
      name: makeUniqueFieldName(template.fields, "field"),
      type: "uint8",
      offset: calculatedOffsetAt(insertIndex),
      value: 0
    };
    const fields = [
      ...template.fields.slice(0, insertIndex),
      nextField,
      ...template.fields.slice(insertIndex)
    ];
    const nextIds = [...fieldIds.slice(0, insertIndex), createFieldId(), ...fieldIds.slice(insertIndex)];
    setFields(fields, insertIndex, nextIds);
  }

  function calculatedOffsetAt(index: number): number {
    const layout = result.layouts[index];
    if (layout) {
      return layout.offset;
    }
    return result.layouts.reduce((sum, item) => sum + item.size, 0);
  }

  function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = fieldIds.indexOf(String(active.id));
    const toIndex = fieldIds.indexOf(String(over.id));
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= template.fields.length ||
      toIndex >= template.fields.length
    ) {
      return;
    }

    const fields = arrayMove(template.fields, fromIndex, toIndex);
    const nextIds = arrayMove(fieldIds, fromIndex, toIndex);
    setFields(fields, toIndex, nextIds);
  }

  function duplicateField(index: number) {
    const source = template.fields[index];
    const copyField: FieldDefinition = {
      ...source,
      name: makeUniqueFieldName(template.fields, `${source.name || "field"}_copy`),
      offset: calculatedOffsetAt(index + 1)
    };
    const insertIndex = index + 1;
    const fields = [
      ...template.fields.slice(0, insertIndex),
      copyField,
      ...template.fields.slice(insertIndex)
    ];
    const nextIds = [...fieldIds.slice(0, insertIndex), createFieldId(), ...fieldIds.slice(insertIndex)];
    setFields(fields, insertIndex, nextIds);
  }

  function deleteField(index: number) {
    const fields = template.fields.filter((_, fieldIndex) => fieldIndex !== index);
    const nextIds = fieldIds.filter((_, fieldIndex) => fieldIndex !== index);
    setFields(fields, index, nextIds);
  }

  function clearNeedsReview(index: number) {
    updateField(index, { needsReview: undefined });
  }

  function toggleFieldSelection(id: string) {
    setSelectedFieldIds((ids) =>
      ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id]
    );
  }

  function selectAllFields(checked: boolean) {
    setSelectedFieldIds(checked ? [...fieldIds] : []);
  }

  function copySelectedFields() {
    const copied = selectedFieldIndices.map((index) => ({ ...template.fields[index] }));
    if (copied.length === 0) {
      return;
    }
    setFieldClipboard(copied);
    showToast("success", t("toast.rowsCopied", { count: copied.length }));
  }

  function pasteFields() {
    if (fieldClipboard.length === 0) {
      return;
    }
    const insertIndex = selectedFieldIndices.length > 0 ? Math.max(...selectedFieldIndices) + 1 : template.fields.length;
    const fields = [...template.fields];
    const nextIds = [...fieldIds];
    const insertedIds: string[] = [];
    const existing = [...fields];
    const copies = fieldClipboard.map((field) => {
      const copy = {
        ...field,
        name: makeUniqueFieldName(existing, `${field.name || "field"}_copy`),
        offset: undefined
      };
      existing.push(copy);
      insertedIds.push(createFieldId());
      return copy;
    });
    fields.splice(insertIndex, 0, ...copies);
    nextIds.splice(insertIndex, 0, ...insertedIds);
    setFields(fields, insertIndex, nextIds, insertedIds);
  }

  function duplicateSelectedFields() {
    const copied = selectedFieldIndices.map((index) => ({ ...template.fields[index] }));
    if (copied.length === 0) {
      return;
    }
    const insertIndex = Math.max(...selectedFieldIndices) + 1;
    const existing = [...template.fields];
    const insertedIds: string[] = [];
    const copies = copied.map((field) => {
      const copy = {
        ...field,
        name: makeUniqueFieldName(existing, `${field.name || "field"}_copy`),
        offset: undefined
      };
      existing.push(copy);
      insertedIds.push(createFieldId());
      return copy;
    });
    const fields = [...template.fields];
    const nextIds = [...fieldIds];
    fields.splice(insertIndex, 0, ...copies);
    nextIds.splice(insertIndex, 0, ...insertedIds);
    setFields(fields, insertIndex, nextIds, insertedIds);
  }

  function deleteSelectedFields() {
    const selected = new Set(selectedFieldIds);
    const fields = template.fields.filter((_, index) => !selected.has(fieldIds[index]));
    const nextIds = fieldIds.filter((id) => !selected.has(id));
    setFields(fields, selectedFieldIndices[0] ?? 0, nextIds, []);
  }

  function moveSelectedFields(direction: "up" | "down") {
    const fields = [...template.fields];
    const nextIds = [...fieldIds];
    const selected = new Set(selectedFieldIds);
    if (direction === "up") {
      for (let index = 1; index < nextIds.length; index += 1) {
        if (selected.has(nextIds[index]) && !selected.has(nextIds[index - 1])) {
          [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
          [nextIds[index - 1], nextIds[index]] = [nextIds[index], nextIds[index - 1]];
        }
      }
    } else {
      for (let index = nextIds.length - 2; index >= 0; index -= 1) {
        if (selected.has(nextIds[index]) && !selected.has(nextIds[index + 1])) {
          [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
          [nextIds[index], nextIds[index + 1]] = [nextIds[index + 1], nextIds[index]];
        }
      }
    }
    const activeIndex = nextIds.findIndex((id) => selected.has(id));
    setFields(fields, activeIndex, nextIds, selectedFieldIds);
  }

  function applyRepeat() {
    if (!areContiguous(selectedFieldIndices)) {
      showToast("error", t("error.repeatContiguous"));
      return;
    }
    const repeated = repeatSelectedFields(template.fields, selectedFieldIndices, {
      totalCount: repeatCount,
      nameMode: repeatNameMode,
      recalculateOffsets: repeatOffsets
    });
    if (repeated.fields.length > templateLimits.maxFields) {
      showToast("error", t("error.tooManyRepeatedFields", { max: templateLimits.maxFields }));
      return;
    }
    const nextIds = createFieldIds(repeated.fields.length);
    const nextSelection = repeated.generatedIndices.map((index) => nextIds[index]);
    setFields(repeated.fields, repeated.generatedIndices[0] ?? 0, nextIds, nextSelection);
    setRepeatOpen(false);
    showToast("success", t("toast.rowsRepeated", { count: repeatCount }));
  }

  function applyTestValues() {
    const selected = new Set(selectedFieldIndices);
    let generated = 0;
    let skipped = 0;
    const fields = template.fields.map((field, index) => {
      if (!selected.has(index) || field.type !== "string" || field.fixed) {
        if (selected.has(index)) {
          skipped += 1;
        }
        return field;
      }
      try {
        const nextField = {
          ...field,
          value: generateFixedStringValue(field, template, {
            mode: testValueMode,
            customFill: testValueFill,
            fullWidthRemainder
          })
        };
        generated += 1;
        return nextField;
      } catch {
        skipped += 1;
        return field;
      }
    });
    if (generated === 0) {
      showToast("error", t("error.noTestValueTargets"));
      return;
    }
    setFields(fields, selectedFieldIndices[0] ?? 0);
    setTestValueOpen(false);
    showToast("success", t("toast.testValuesGenerated", { count: generated, skipped }));
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
    if (new TextEncoder().encode(jsonText).length > templateLimits.maxJsonBytes) {
      showToast("error", t("error.jsonTooLarge", { max: formatBytes(templateLimits.maxJsonBytes) }));
      return;
    }
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
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }
      showToast("success", t("toast.copied"));
    } catch {
      try {
        fallbackCopyText(text);
        showToast("success", t("toast.copied"));
      } catch {
        showToast("error", t("toast.copyFailed"));
      }
    }
  }

  function saveJson() {
    downloadBlob(
      new Blob([currentSnapshot], { type: "application/json" }),
      `${safeFileName(template.name || "binary-template")}.json`
    );
    setSavedSnapshot(currentSnapshot);
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

  async function savePackage() {
    if (hasErrors) {
      showToast("error", t("error.binBlocked"));
      return;
    }
    setPackaging(true);
    try {
      const artifact = await createTestDataPackage({
        binary: result.bytes,
        templateJson: currentSnapshot,
        templateName: template.name,
        toolVersion: appVersion
      });
      downloadBlob(
        new Blob([bytesToArrayBuffer(artifact.bytes)], { type: "application/zip" }),
        `${safeFileName(template.name || "test-data")}-package.zip`
      );
      showToast("success", t("toast.packageSaved"));
    } catch {
      showToast("error", t("error.packageFailed"));
    } finally {
      setPackaging(false);
    }
  }

  async function onComparisonFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    if (file.size > templateLimits.maxTotalBytes) {
      showToast("error", t("error.compareTooLarge", { max: formatBytes(templateLimits.maxTotalBytes) }));
      return;
    }
    setComparing(true);
    try {
      const actual = new Uint8Array(await file.arrayBuffer());
      setComparison(await compareBinary(result.bytes, actual, result.layouts));
    } catch {
      showToast("error", t("error.compareFailed"));
    } finally {
      setComparing(false);
    }
  }

  async function loadJsonFile(file: File | undefined, confirmReplacement = false) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      showToast("error", t("error.jsonFileType"));
      return;
    }

    if (file.size > templateLimits.maxJsonBytes) {
      showToast("error", t("error.jsonTooLarge", { max: formatBytes(templateLimits.maxJsonBytes) }));
      return;
    }

    if (confirmReplacement && isDirty && !window.confirm(t("confirm.replaceUnsaved"))) {
      return;
    }

    try {
      const text = await file.text();
      const next = JSON.parse(text) as unknown;
      replaceTemplate(next, true);
      showToast("success", t("toast.jsonLoaded"));
    } catch {
      showToast("error", t("toast.invalidJson"));
    }
  }

  function requestOpenJson() {
    if (isDirty && !window.confirm(t("confirm.replaceUnsaved"))) {
      return;
    }
    fileInputRef.current?.click();
  }

  function handleJsonDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    jsonDragDepth.current += 1;
    setJsonDragActive(true);
  }

  function handleJsonDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleJsonDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (jsonDragDepth.current === 0) {
      return;
    }
    event.preventDefault();
    jsonDragDepth.current = Math.max(0, jsonDragDepth.current - 1);
    if (jsonDragDepth.current === 0) {
      setJsonDragActive(false);
    }
  }

  function handleJsonDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    jsonDragDepth.current = 0;
    setJsonDragActive(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length !== 1) {
      showToast("error", t("error.jsonSingleFile"));
      return;
    }
    void loadJsonFile(files[0], true);
  }

  function loadSampleFromEmptyState() {
    if (isDirty && !window.confirm(t("confirm.discardUnsaved"))) {
      return;
    }
    applyReset("sample");
  }

  return (
    <div
      className="app-shell"
      onDragEnter={handleJsonDragEnter}
      onDragLeave={handleJsonDragLeave}
      onDragOver={handleJsonDragOver}
      onDrop={handleJsonDrop}
    >
      {jsonDragActive ? (
        <div className="json-drop-overlay" role="status" aria-live="polite">
          <div className="json-drop-message">
            <FileInput size={28} />
            <strong>{t("drop.title")}</strong>
            <span>{t("drop.hint")}</span>
          </div>
        </div>
      ) : null}
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
            void loadJsonFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={comparisonFileInputRef}
          type="file"
          accept="application/octet-stream,.bin"
          aria-label={t("compare.fileInput")}
          hidden
          onChange={(event) => {
            void onComparisonFileSelected(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <div className="toolbar-actions">
          <button type="button" className="button primary" disabled={hasErrors} onClick={saveBin}>
            <Download size={16} />
            {t("toolbar.saveBin")}
          </button>
          <button
            type="button"
            className="button compact package-button"
            disabled={hasErrors || packaging}
            title={packaging ? t("package.creating") : t("package.save")}
            aria-label={packaging ? t("package.creating") : t("package.save")}
            onClick={() => void savePackage()}
          >
            <PackageCheck size={16} />
            <span>ZIP</span>
          </button>
          <button type="button" className="button" onClick={requestOpenJson}>
            <FileInput size={16} />
            {t("toolbar.loadJson")}
          </button>
          <button type="button" className="button" onClick={() => setJsonOpen((open) => !open)}>
            <Braces size={16} />
            {t("toolbar.jsonPanel")}
          </button>
          <button type="button" className="button" disabled={hasDraftErrors} onClick={saveJson}>
            <Save size={16} />
            {t("toolbar.saveJson")}
          </button>
          <button type="button" className="button" onClick={() => copyText(getAiPrompt(locale))}>
            <Clipboard size={16} />
            {t("toolbar.copyPrompt")}
          </button>
        </div>
        <div className="toolbar-end">
          <button
            type="button"
            className="icon-button"
            disabled={history.length === 0}
            title={t("toolbar.undo")}
            aria-label={t("toolbar.undo")}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={future.length === 0}
            title={t("toolbar.redo")}
            aria-label={t("toolbar.redo")}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
          <button type="button" className="button subtle-button" onClick={() => setResetOpen(true)}>
            <RotateCcw size={16} />
            {t("toolbar.reset")}
          </button>
        </div>
      </section>

      <main className="workspace">
        <HexPreviewPanel
          copyDisabled={hasErrors || copyTooLarge}
          copyDisabledReason={
            copyTooLarge
              ? t("copy.tooLarge", { max: formatBytes(templateLimits.maxCopyBytes) })
              : undefined
          }
          expanded={previewExpanded}
          hasErrors={hasErrors}
          hexRows={hexRows}
          onOpenCopy={() => setCopyOpen(true)}
          onOpenCompare={() => comparisonFileInputRef.current?.click()}
          onTextEncodingChange={setTextPreviewEncoding}
          onToggleExpanded={() => setPreviewExpanded((expanded) => !expanded)}
          previewNotice={
            previewTruncated
              ? t("preview.truncated", {
                  shown: formatBytes(templateLimits.maxPreviewBytes),
                  total: formatBytes(result.bytes.length)
                })
              : undefined
          }
          selectedLayout={selectedLayout}
          selectedRange={selectedRange}
          t={t}
          textEncoding={textPreviewEncoding}
        />

        <section className="field-panel" aria-label="Fields">
          <div className="panel-title-row">
            <div className="template-meta">
              <label>
                <span>{t("template.name")}</span>
                <input
                  className="template-meta-input"
                  value={template.name}
                  onChange={(event) => updateTemplate({ name: event.target.value })}
                />
              </label>
              <label>
                <span>Endian</span>
                <select
                  className="template-meta-select"
                  value={template.defaultEndian ?? "unknown"}
                  onChange={(event) => updateTemplate({ defaultEndian: event.target.value as Endian })}
                >
                  {endianOptions.map((endian) => (
                    <option value={endian} key={endian}>
                      {endian}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Encoding</span>
                <select
                  className="template-meta-select"
                  value={template.defaultEncoding ?? "unknown"}
                  onChange={(event) =>
                    updateTemplate({ defaultEncoding: event.target.value as EncodingName })
                  }
                >
                  {encodingOptions.map((encoding) => (
                    <option value={encoding} key={encoding}>
                      {encoding}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>formatVersion</span>
                <input
                  className="template-meta-input format-version-input mono"
                  value={template.formatVersion}
                  onChange={(event) => updateTemplate({ formatVersion: event.target.value })}
                />
              </label>
              {isDirty ? <span className="dirty-badge">{t("status.unsaved")}</span> : null}
            </div>
            <div className="panel-actions">
              <div className="size-pill">
                {t("panel.totalSize")}: <strong>{totalSize}</strong> bytes
              </div>
              <button type="button" className="button compact" onClick={() => addFieldAt(0)}>
                <Plus size={15} />
                {t("field.addAtStart")}
              </button>
            </div>
          </div>

          {selectedFieldIds.length > 0 ? (
            <div className="selection-toolbar" aria-label={t("batch.toolbarLabel")}>
              <strong>{t("batch.selected", { count: selectedFieldIds.length })}</strong>
              <div className="selection-actions">
                <button type="button" className="button compact" onClick={duplicateSelectedFields}>
                  <Copy size={14} />
                  {t("batch.duplicate")}
                </button>
                <button type="button" className="button compact" onClick={copySelectedFields}>
                  <Clipboard size={14} />
                  {t("batch.copy")}
                </button>
                <button
                  type="button"
                  className="button compact"
                  disabled={fieldClipboard.length === 0}
                  onClick={pasteFields}
                >
                  <ClipboardPaste size={14} />
                  {t("batch.paste")}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t("batch.moveUp")}
                  aria-label={t("batch.moveUp")}
                  onClick={() => moveSelectedFields("up")}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t("batch.moveDown")}
                  aria-label={t("batch.moveDown")}
                  onClick={() => moveSelectedFields("down")}
                >
                  <ArrowDown size={15} />
                </button>
                <button type="button" className="button compact" onClick={() => setRepeatOpen(true)}>
                  <Repeat2 size={14} />
                  {t("batch.repeat")}
                </button>
                <button type="button" className="button compact" onClick={() => setTestValueOpen(true)}>
                  <WandSparkles size={14} />
                  {t("batch.generate")}
                </button>
                <button type="button" className="button compact danger-button" onClick={deleteSelectedFields}>
                  <Trash2 size={14} />
                  {t("batch.delete")}
                </button>
              </div>
            </div>
          ) : null}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
            <div className="table-wrap">
              <table className="field-table">
              <thead>
                <tr>
                  <th className="drag-heading">
                    <input
                      type="checkbox"
                      aria-label={t("batch.selectAll")}
                      checked={fieldIds.length > 0 && selectedFieldIds.length === fieldIds.length}
                      onChange={(event) => selectAllFields(event.target.checked)}
                    />
                  </th>
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
              {result.layouts.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={11}>
                      <div className="table-empty">
                        <div className="empty-state-copy">
                          <strong>{t("onboarding.title")}</strong>
                          <span>{t("onboarding.hint")}</span>
                        </div>
                        <div className="empty-state-actions">
                          <button type="button" className="button compact primary" onClick={requestOpenJson}>
                            <FileInput size={15} />
                            {t("toolbar.loadJson")}
                          </button>
                          <button type="button" className="button compact" onClick={() => copyText(getAiPrompt(locale))}>
                            <Clipboard size={15} />
                            {t("toolbar.copyPrompt")}
                          </button>
                          <button type="button" className="button compact" onClick={loadSampleFromEmptyState}>
                            <Braces size={15} />
                            {t("onboarding.sample")}
                          </button>
                          <button type="button" className="button compact" onClick={() => addFieldAt(0)}>
                            <Plus size={15} />
                            {t("onboarding.blank")}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <SortableContext items={sortableFieldIds} strategy={verticalListSortingStrategy}>
                  {result.layouts.map((layout) => {
                    const issues = fieldIssues.get(layout.index) ?? [];
                    const status = getFieldStatus(issues);
                    return (
                      <SortableFieldRows
                        addFieldAt={addFieldAt}
                        clearNeedsReview={clearNeedsReview}
                        deleteField={deleteField}
                        duplicateField={duplicateField}
                        id={sortableFieldIds[layout.index]}
                        issues={issues}
                        key={sortableFieldIds[layout.index]}
                        layout={layout}
                        locale={locale}
                        batchSelected={selectedFieldIds.includes(sortableFieldIds[layout.index])}
                        toggleBatchSelection={toggleFieldSelection}
                        selected={layout.index === selectedFieldIndex}
                        setSelectedFieldIndex={setSelectedFieldIndex}
                        setDraftFieldError={setDraftFieldError}
                        status={status}
                        t={t}
                        template={template}
                        updateField={updateField}
                        updateFieldNumber={updateFieldNumber}
                        updateFieldType={updateFieldType}
                      />
                    );
                  })}
                </SortableContext>
              )}
              </table>
            </div>
          </DndContext>
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
          <textarea
            aria-label={t("panel.json")}
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck={false}
          />
        </section>
      ) : null}

      {copyOpen && !hasErrors && !copyTooLarge ? (
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

      {comparison ? (
        <BinaryComparisonDialog comparison={comparison} onClose={() => setComparison(null)} t={t} />
      ) : null}

      {comparing ? <div className="busy-overlay" role="status">{t("compare.processing")}</div> : null}

      {repeatOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setRepeatOpen(false)}>
          <section
            className="modal-dialog batch-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="repeat-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="repeat-dialog-title">{t("repeat.title")}</h2>
                <p>{t("repeat.description", { count: selectedFieldIds.length })}</p>
              </div>
              <button type="button" className="icon-button" aria-label={t("copy.close")} onClick={() => setRepeatOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="batch-form">
              <label>
                <span>{t("repeat.totalCount")}</span>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={repeatCount}
                  onChange={(event) => setRepeatCount(Math.max(2, Math.min(100, Number(event.target.value) || 2)))}
                />
              </label>
              <label>
                <span>{t("repeat.nameMode")}</span>
                <select value={repeatNameMode} onChange={(event) => setRepeatNameMode(event.target.value as RepeatNameMode)}>
                  <option value="keep">{t("repeat.name.keep")}</option>
                  <option value="append">{t("repeat.name.append")}</option>
                  <option value="appendPadded">{t("repeat.name.appendPadded")}</option>
                  <option value="increment">{t("repeat.name.increment")}</option>
                </select>
              </label>
              <label className="check-label">
                <input type="checkbox" checked={repeatOffsets} onChange={(event) => setRepeatOffsets(event.target.checked)} />
                <span>{t("repeat.recalculateOffsets")}</span>
              </label>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setRepeatOpen(false)}>{t("reset.cancel")}</button>
                <button type="button" className="button primary" onClick={applyRepeat}>{t("repeat.apply")}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {testValueOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setTestValueOpen(false)}>
          <section
            className="modal-dialog batch-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-value-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="test-value-dialog-title">{t("testValue.title")}</h2>
                <p>{t("testValue.description")}</p>
              </div>
              <button type="button" className="icon-button" aria-label={t("copy.close")} onClick={() => setTestValueOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="batch-form">
              <label>
                <span>{t("testValue.mode")}</span>
                <select value={testValueMode} onChange={(event) => setTestValueMode(event.target.value as TestValueMode)}>
                  <option value="asciiMax">{t("testValue.asciiMax")}</option>
                  <option value="fullWidthMax">{t("testValue.fullWidthMax")}</option>
                  <option value="keepAndFill">{t("testValue.keepAndFill")}</option>
                  <option value="customFill">{t("testValue.customFill")}</option>
                  <option value="alphabet">{t("testValue.alphabet")}</option>
                  <option value="digits">{t("testValue.digits")}</option>
                  <option value="hyphen">{t("testValue.hyphen")}</option>
                  <option value="empty">{t("testValue.empty")}</option>
                  <option value="leaveOneByte">{t("testValue.leaveOneByte")}</option>
                  <option value="overflowOneByte">{t("testValue.overflowOneByte")}</option>
                </select>
              </label>
              {testValueMode === "keepAndFill" || testValueMode === "customFill" ? (
                <label>
                  <span>{t("testValue.fill")}</span>
                  <input value={testValueFill} onChange={(event) => setTestValueFill(event.target.value)} />
                </label>
              ) : null}
              {testValueMode === "fullWidthMax" ? (
                <label>
                  <span>{t("testValue.remainder")}</span>
                  <select value={fullWidthRemainder} onChange={(event) => setFullWidthRemainder(event.target.value as FullWidthRemainder)}>
                    <option value="ascii">{t("testValue.remainder.ascii")}</option>
                    <option value="short">{t("testValue.remainder.short")}</option>
                    <option value="error">{t("testValue.remainder.error")}</option>
                  </select>
                </label>
              ) : null}
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setTestValueOpen(false)}>{t("reset.cancel")}</button>
                <button type="button" className="button primary" onClick={applyTestValues}>{t("testValue.apply")}</button>
              </div>
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
  children: ReactNode;
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

let fieldIdSequence = 0;

function createFieldId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  fieldIdSequence += 1;
  return `field-${Date.now()}-${fieldIdSequence}`;
}

function createFieldIds(count: number): string[] {
  const safeCount = Math.max(0, Math.min(count, templateLimits.maxFields));
  return Array.from({ length: safeCount }, () => createFieldId());
}

function getTemplateFieldCount(value: unknown): number {
  if (typeof value !== "object" || value === null || !("fields" in value)) {
    return 0;
  }
  const fields = (value as { fields?: unknown }).fields;
  return Array.isArray(fields) ? Math.min(fields.length, templateLimits.maxFields) : 0;
}

function serializeTemplate(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return "null";
  }
}

function limitHistory(
  entries: HistoryEntry[],
  order: "latest-at-start" | "latest-at-end"
): HistoryEntry[] {
  const ordered = order === "latest-at-start" ? entries : [...entries].reverse();
  const kept: HistoryEntry[] = [];
  let totalChars = 0;

  for (const entry of ordered) {
    if (
      kept.length >= maxHistoryEntries ||
      (kept.length > 0 && totalChars + entry.snapshot.length > maxHistorySnapshotChars)
    ) {
      break;
    }
    kept.push(entry);
    totalChars += entry.snapshot.length;
  }

  return order === "latest-at-start" ? kept : kept.reverse();
}

function fallbackCopyText(value: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Copy command failed.");
  }
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${Math.round(value / (1024 * 1024))} MiB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KiB`;
  }
  return `${value} bytes`;
}

function hasDraggedFiles(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes("Files");
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

function areContiguous(indices: number[]): boolean {
  return indices.every((index, position) => position === 0 || index === indices[position - 1] + 1);
}
