import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { templateLimits } from "./core";

describe("App editor workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("spec-to-bin.locale", "ja");
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

  it("marks edits as unsaved and can undo them", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nameInput = screen.getByLabelText("テンプレート名");
    await user.type(nameInput, "X");
    expect(screen.getByText("未保存")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(nameInput).toHaveValue("sample_packet");
    expect(screen.queryByText("未保存")).not.toBeInTheDocument();
  });

  it("accepts bare hexadecimal values containing A-F", () => {
    const { container } = render(<App />);
    const valueInput = container.querySelector<HTMLInputElement>(".value-input");
    expect(valueInput).not.toBeNull();
    fireEvent.change(valueInput as HTMLInputElement, { target: { value: "F" } });
    expect(valueInput).toHaveValue("F");
    expect(screen.queryByText("値は整数である必要があります。")).not.toBeInTheDocument();
  });

  it("offers 64-bit integer types and shows their fixed size", () => {
    localStorage.setItem("spec-to-bin.locale", "en");
    const { container } = render(<App />);
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
    expect(JSON.parse(jsonText).fields[1].value).toBe("1");
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
    expect(container.querySelector(".size-pill")).toHaveTextContent("34 bytes");
    expect(screen.getByRole("button", { name: "BINファイルを保存" })).toBeDisabled();
  });

  it("removes properties that do not apply after a type change", () => {
    const { container } = render(<App />);
    const typeSelects = container.querySelectorAll<HTMLSelectElement>(".type-select");
    fireEvent.change(typeSelects[3], { target: { value: "uint8" } });
    fireEvent.click(screen.getByRole("button", { name: "JSONを直接編集" }));

    const jsonText = container.querySelector<HTMLTextAreaElement>(".json-panel textarea")?.value ?? "";
    const json = JSON.parse(jsonText);
    expect(json.fields[3].type).toBe("uint8");
    expect(json.fields[3]).not.toHaveProperty("length");
    expect(json.fields[3]).not.toHaveProperty("fill");
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
    render(<App />);
    expect(screen.getByText("9 / 20 bytes")).toBeInTheDocument();
  });
});
