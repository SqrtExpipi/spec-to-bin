import { afterEach, describe, expect, it, vi } from "vitest";
import { readLocalSetting, writeLocalSetting } from "./storage";

describe("local settings", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads and writes settings", () => {
    writeLocalSetting("spec-to-bin.test", "value");
    expect(readLocalSetting("spec-to-bin.test")).toBe("value");
  });

  it("does not throw when browser storage is rejected", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(readLocalSetting("spec-to-bin.test")).toBeUndefined();
    expect(() => writeLocalSetting("spec-to-bin.test", "value")).not.toThrow();
  });
});
