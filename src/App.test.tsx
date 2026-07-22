import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { templateLimits } from "./core";

describe("App editor workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("spec-to-bin.locale", "ja");
  });

  function applyTemplate(container: HTMLElement, template: unknown) {
    fireEvent.click(screen.getByRole("button", { name: "JSONを直接編集" }));
    const textarea = container.querySelector<HTMLTextAreaElement>(".json-panel textarea");
    fireEvent.change(textarea as HTMLTextAreaElement, {
      target: { value: JSON.stringify(template) }
    });
    fireEvent.click(screen.getByRole("button", { name: "JSONを反映" }));
  }

  it("starts with a blank template and keeps samples behind Reset", () => {
    const { container } = render(<App />);

    expect(screen.getByText("仕様書から、テスト用バイナリファイルを作る。")).toBeInTheDocument();
    expect(screen.getByLabelText("テンプレート名")).toHaveValue("new_template");
    expect(container.querySelectorAll(".field-row-group")).toHaveLength(0);
    expect(screen.getByText("まだbyteがありません。項目を追加するとプレビューされます。")).toBeInTheDocument();
    expect(screen.queryByText("ローカル処理。アップロードなし。テレメトリなし。")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "リセット" }));
    fireEvent.click(screen.getByText("サンプルを読み込む").closest("button") as HTMLButtonElement);
    expect(screen.getByLabelText("テンプレート名")).toHaveValue("basic_fields");
  });

  it("places the compact Hex preview before the field table", () => {
    const { container } = render(<App />);
    const preview = container.querySelector(".preview-panel");
    const table = container.querySelector(".field-panel");
    expect(preview).toBeInTheDocument();
    expect(table).toBeInTheDocument();
    expect(
      Boolean(
        preview &&
          table &&
          preview.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it("places BIN save first and gives it the primary action style", () => {
    render(<App />);
    const saveBin = screen.getByRole("button", { name: "BINファイルを保存" });
    const loadJson = screen.getByRole("button", { name: "JSONファイルを開く" });

    expect(saveBin).toHaveClass("primary");
    expect(loadJson).not.toHaveClass("primary");
    expect(
      Boolean(saveBin.compareDocumentPosition(loadJson) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
  });

  it("shows preview expansion only when generated data exceeds two rows", () => {
    const compact = render(<App />);
    applyTemplate(compact.container, {
      formatVersion: "0.1",
      name: "two_rows",
      fields: [{ name: "data", type: "bytes", length: 32, fill: "00" }]
    });
    expect(screen.queryByRole("button", { name: "展開" })).not.toBeInTheDocument();
    compact.unmount();

    const expandable = render(<App />);
    applyTemplate(expandable.container, {
      formatVersion: "0.1",
      name: "three_rows",
      fields: [{ name: "data", type: "bytes", length: 33, fill: "00" }]
    });
    fireEvent.click(screen.getByRole("button", { name: "展開" }));
    expect(screen.getByRole("button", { name: "折りたたむ" })).toBeInTheDocument();
  });

  it("marks edits as unsaved and can undo them", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nameInput = screen.getByLabelText("テンプレート名");
    await user.type(nameInput, "X");
    expect(screen.getByText("未保存")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(nameInput).toHaveValue("new_template");
    expect(screen.queryByText("未保存")).not.toBeInTheDocument();
  });

  it("accepts bare hexadecimal values containing A-F", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "先頭に追加" }));
    const valueInput = container.querySelector<HTMLInputElement>(".value-input");
    expect(valueInput).not.toBeNull();
    fireEvent.change(valueInput as HTMLInputElement, { target: { value: "F" } });
    expect(valueInput).toHaveValue("F");
    expect(screen.queryByText("値は整数である必要があります。")).not.toBeInTheDocument();
  });

  it("offers 64-bit integer types and shows their fixed size", () => {
    localStorage.setItem("spec-to-bin.locale", "en");
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add first row" }));
    fireEvent.click(screen.getByRole("button", { name: "Add row below" }));
    const typeSelects = container.querySelectorAll<HTMLSelectElement>(".type-select");
    const typeSelect = typeSelects[0];
    expect(typeSelect).not.toBeNull();
    expect(Array.from(typeSelect?.options ?? []).map((option) => option.value)).toEqual(
      expect.arrayContaining(["uint64", "int64"])
    );

    fireEvent.change(typeSelect as HTMLSelectElement, { target: { value: "uint64" } });
    const row = typeSelect?.closest("tr");
    expect(row?.querySelector<HTMLInputElement>(".size-cell")).toHaveValue("8");
    expect(row?.querySelectorAll("select")).toHaveLength(2);

    fireEvent.change(typeSelects[1], { target: { value: "uint64" } });
    fireEvent.click(screen.getByRole("button", { name: "Edit JSON" }));
    const jsonText = container.querySelector<HTMLTextAreaElement>(".json-panel textarea")?.value ?? "";
    expect(JSON.parse(jsonText).fields.map((field: { value: unknown }) => field.value)).toEqual([
      "0",
      "0"
    ]);
  });

  it("fills the calculated offset when adding the first row", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("button", { name: "先頭に追加" }));
    const offsetInputs = container.querySelectorAll<HTMLInputElement>(".offset-cell");
    expect(offsetInputs[0]).toHaveValue("0x0000");
  });

  it("keeps offset text stable while editing and formats it on blur", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "先頭に追加" }));
    const offsetInput = container.querySelector<HTMLInputElement>(".offset-cell");
    expect(offsetInput).not.toBeNull();

    await user.clear(offsetInput as HTMLInputElement);
    await user.type(offsetInput as HTMLInputElement, "10");
    expect(offsetInput).toHaveValue("10");

    fireEvent.blur(offsetInput as HTMLInputElement);
    expect(offsetInput).toHaveValue("0x000A");
  });

  it("retains invalid offset text, blocks export, and cancels it with Escape", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "先頭に追加" }));
    const offsetInput = container.querySelector<HTMLInputElement>(".offset-cell");
    expect(offsetInput).not.toBeNull();

    await user.clear(offsetInput as HTMLInputElement);
    await user.type(offsetInput as HTMLInputElement, "invalid");
    expect(offsetInput).toHaveValue("invalid");
    expect(offsetInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("offset は0以上の整数である必要があります。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "BINファイルを保存" })).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(offsetInput).toHaveValue("0x0000");
    expect(screen.getByRole("button", { name: "BINファイルを保存" })).toBeEnabled();
  });

  it("keeps the calculated total visible when validation blocks export", () => {
    const { container } = render(<App />);
    const versionInput = screen.getByLabelText("formatVersion");
    fireEvent.change(versionInput, { target: { value: "0.2" } });

    expect(versionInput).toHaveValue("0.2");
    expect(container.querySelector(".size-pill")).toHaveTextContent("0 bytes");
    expect(screen.getByRole("button", { name: "BINファイルを保存" })).toBeDisabled();
  });

  it("removes properties that do not apply after a type change", () => {
    const { container } = render(<App />);
    applyTemplate(container, {
      formatVersion: "0.1",
      name: "property_cleanup",
      fields: [{ name: "rawBytes", type: "bytes", length: 2, fill: "00" }]
    });
    const typeSelects = container.querySelectorAll<HTMLSelectElement>(".type-select");
    fireEvent.change(typeSelects[0], { target: { value: "uint8" } });

    const jsonText = container.querySelector<HTMLTextAreaElement>(".json-panel textarea")?.value ?? "";
    const json = JSON.parse(jsonText);
    expect(json.fields[0].type).toBe("uint8");
    expect(json.fields[0]).not.toHaveProperty("length");
    expect(json.fields[0]).not.toHaveProperty("fill");
  });

  it("limits preview rendering and copy text for large valid binaries", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "JSONを直接編集" }));
    const textarea = container.querySelector<HTMLTextAreaElement>(".json-panel textarea");
    const length = templateLimits.maxCopyBytes + 1024;
    fireEvent.change(textarea as HTMLTextAreaElement, {
      target: {
        value: JSON.stringify({
          formatVersion: "0.1",
          name: "large",
          fields: [{ name: "data", type: "padding", length }]
        })
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "JSONを反映" }));

    expect(screen.getByText("先頭 8 KiB を表示しています（全体 65 KiB）。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "コピー出力" })).toBeDisabled();
    expect(container.querySelectorAll(".hex-dump-row")).toHaveLength(3);
  });

  it("shows byte usage for fixed-length strings", () => {
    const { container } = render(<App />);
    applyTemplate(container, {
      formatVersion: "0.1",
      name: "fixed_text",
      defaultEncoding: "utf-8",
      fields: [{ name: "text", type: "string", length: 8, padding: "zero", value: "ABC" }]
    });
    expect(screen.getByText("3 / 8 bytes")).toBeInTheDocument();
  });

  it("keeps Shift_JIS text separate from a preceding numeric field", () => {
    const { container } = render(<App />);
    applyTemplate(container, {
      formatVersion: "0.1",
      name: "shift_jis_text",
      defaultEndian: "big",
      defaultEncoding: "shift_jis",
      fields: [
        {
          name: "temperatureCorrection",
          type: "int16",
          value: -125
        },
        {
          name: "shiftJisText",
          type: "string",
          length: 12,
          padding: "space",
          value: "試験機A"
        }
      ]
    });

    fireEvent.change(screen.getByLabelText("プレビュー文字コード"), {
      target: { value: "shift_jis" }
    });
    expect(container.querySelector(".hex-text")).toHaveTextContent("試験機A");
  });

  it("compares an existing BIN with generated bytes and locates the field", async () => {
    const { container } = render(<App />);
    applyTemplate(container, {
      formatVersion: "0.1",
      name: "comparison",
      fields: [{ name: "magic", type: "uint8", value: 1, fixed: true }]
    });
    const file = new File([new Uint8Array([2])], "actual.bin", {
      type: "application/octet-stream"
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new Uint8Array([2]).buffer)
    });

    fireEvent.change(screen.getByLabelText("比較するBINファイル"), {
      target: { files: [file] }
    });

    const dialog = await screen.findByRole("dialog", { name: "BIN比較結果" });
    expect(within(dialog).getByText("不一致があります")).toBeInTheDocument();
    expect(within(dialog).getByText("magic")).toBeInTheDocument();
    expect(within(dialog).getByText("固定値")).toBeInTheDocument();
    expect(within(dialog).getByText("01")).toBeInTheDocument();
    expect(within(dialog).getByText("02")).toBeInTheDocument();
  });
});
