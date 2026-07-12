import { fieldTypes } from "./core";
import { aiPromptFieldTypes, getAiPrompt } from "./aiPrompt";

describe("getAiPrompt", () => {
  it("keeps the prompt field types aligned with the validator", () => {
    expect([...aiPromptFieldTypes]).toEqual(fieldTypes);
  });

  it("provides a complete English template contract", () => {
    const prompt = getAiPrompt("en");
    expect(prompt).not.toContain("SPECIFICATION START");
    expect(prompt).toContain("attach the specification file");
    expect(prompt).toContain('"type": "padding"');
    expect(prompt).toContain("top-level properties: formatVersion, name, defaultEndian, defaultEncoding, fields");
    expect(prompt).toContain("does not place a field or create a gap");
    expect(prompt).toContain("uint64 and int64 values must always be JSON strings");
    expect(prompt).toContain("does not calculate CRC or checksums automatically");
    expect(prompt).toContain("Do not emit unsupported properties");
    expect(prompt).toContain('Add "needsReview": true');
  });

  it("provides the same contract in Japanese", () => {
    const prompt = getAiPrompt("ja");
    expect(prompt).not.toContain("仕様書ここから");
    expect(prompt).toContain("仕様書ファイルを添付してください");
    expect(prompt).toContain('"type": "padding"');
    expect(prompt).toContain("トップレベルで使用できるプロパティ");
    expect(prompt).toContain("配置位置の指定や隙間の生成は行いません");
    expect(prompt).toContain("uint64とint64は精度を失わないよう必ずJSON文字列");
    expect(prompt).toContain("CRCやチェックサムを自動計算しません");
    expect(prompt).toContain("未対応プロパティを出力しないでください");
  });
});
