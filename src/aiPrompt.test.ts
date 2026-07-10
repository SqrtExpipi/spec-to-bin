import { fieldTypes } from "./core";
import { aiPromptFieldTypes, getAiPrompt } from "./aiPrompt";

describe("getAiPrompt", () => {
  it("keeps the prompt field types aligned with the validator", () => {
    expect([...aiPromptFieldTypes]).toEqual(fieldTypes);
  });

  it("provides a complete English template contract", () => {
    const prompt = getAiPrompt("en");
    expect(prompt).toContain("SPECIFICATION START");
    expect(prompt).toContain('"type": "padding"');
    expect(prompt).toContain("top-level properties: formatVersion, name, defaultEndian, defaultEncoding, fields");
    expect(prompt).toContain("does not place a field or create a gap");
    expect(prompt).toContain("uint64 and int64 values must always be JSON strings");
  });

  it("provides the same contract in Japanese", () => {
    const prompt = getAiPrompt("ja");
    expect(prompt).toContain("仕様書ここから");
    expect(prompt).toContain('"type": "padding"');
    expect(prompt).toContain("トップレベルで使用できるプロパティ");
    expect(prompt).toContain("配置位置の指定や隙間の生成は行いません");
    expect(prompt).toContain("uint64とint64は精度を失わないよう必ずJSON文字列");
  });
});
