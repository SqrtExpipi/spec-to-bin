import { strToU8, zip } from "fflate";
import type { FieldLayout } from "./core";

export type DifferenceKind = "fixed" | "reserved" | "field" | "outside";

export interface BinaryDifference {
  offset: number;
  expected?: number;
  actual?: number;
  fieldName?: string;
  fieldOffset?: number;
  kind: DifferenceKind;
}

export interface BinaryComparison {
  matches: boolean;
  expectedSize: number;
  actualSize: number;
  matchingBytes: number;
  mismatchBytes: number;
  firstMismatchOffset?: number;
  expectedSha256: string;
  actualSha256: string;
  differences: BinaryDifference[];
  differencesTruncated: boolean;
}

export interface ArtifactManifest {
  toolVersion: string;
  templateName: string;
  generatedSize: number;
  templateSha256: string;
  binarySha256: string;
  generatedAt: string;
}

export async function compareBinary(
  expected: Uint8Array,
  actual: Uint8Array,
  layouts: FieldLayout[],
  maxDifferences = 256
): Promise<BinaryComparison> {
  const comparedLength = Math.max(expected.length, actual.length);
  const sharedLength = Math.min(expected.length, actual.length);
  let matchingBytes = 0;
  let mismatchBytes = 0;
  let firstMismatchOffset: number | undefined;
  const differences: BinaryDifference[] = [];

  for (let offset = 0; offset < comparedLength; offset += 1) {
    const expectedByte = offset < expected.length ? expected[offset] : undefined;
    const actualByte = offset < actual.length ? actual[offset] : undefined;
    if (offset < sharedLength && expectedByte === actualByte) {
      matchingBytes += 1;
      continue;
    }

    mismatchBytes += 1;
    firstMismatchOffset ??= offset;
    if (differences.length < maxDifferences) {
      differences.push(createDifference(offset, expectedByte, actualByte, layouts));
    }
  }

  const [expectedSha256, actualSha256] = await Promise.all([
    sha256Hex(expected),
    sha256Hex(actual)
  ]);
  return {
    matches: mismatchBytes === 0,
    expectedSize: expected.length,
    actualSize: actual.length,
    matchingBytes,
    mismatchBytes,
    firstMismatchOffset,
    expectedSha256,
    actualSha256,
    differences,
    differencesTruncated: mismatchBytes > differences.length
  };
}

export async function createTestDataPackage({
  binary,
  generatedAt = new Date(),
  templateJson,
  templateName,
  toolVersion
}: {
  binary: Uint8Array;
  generatedAt?: Date;
  templateJson: string;
  templateName: string;
  toolVersion: string;
}): Promise<{ bytes: Uint8Array; manifest: ArtifactManifest }> {
  const templateBytes = strToU8(`${templateJson.trimEnd()}\n`);
  const [templateSha256, binarySha256] = await Promise.all([
    sha256Hex(templateBytes),
    sha256Hex(binary)
  ]);
  const manifest: ArtifactManifest = {
    toolVersion,
    templateName,
    generatedSize: binary.length,
    templateSha256,
    binarySha256,
    generatedAt: generatedAt.toISOString()
  };
  const readme = [
    "Spec to BIN test data package",
    "",
    "template.json: Binary structure and values used for generation.",
    "generated.bin: Generated binary data.",
    "manifest.json: Tool version, generation time, sizes, and SHA-256 hashes.",
    "",
    "template.json: 生成に使用したバイナリ構造と値です。",
    "generated.bin: 生成したバイナリデータです。",
    "manifest.json: ツール版、生成日時、サイズ、SHA-256を記録します。",
    ""
  ].join("\n");

  const bytes = await zipFiles({
    "template.json": templateBytes,
    "generated.bin": binary,
    "manifest.json": strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
    "README.txt": strToU8(readme)
  });
  return { bytes, manifest };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const source = new Uint8Array(bytes.byteLength);
  source.set(bytes);
  const hash = await crypto.subtle.digest("SHA-256", source.buffer);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}

function createDifference(
  offset: number,
  expected: number | undefined,
  actual: number | undefined,
  layouts: FieldLayout[]
): BinaryDifference {
  const layout = findLayout(offset, layouts);
  if (!layout) {
    return { offset, expected, actual, kind: "outside" };
  }
  return {
    offset,
    expected,
    actual,
    fieldName: layout.field.name,
    fieldOffset: offset - layout.offset,
    kind:
      layout.field.type === "padding"
        ? "reserved"
        : layout.field.fixed
          ? "fixed"
          : "field"
  };
}

function findLayout(offset: number, layouts: FieldLayout[]): FieldLayout | undefined {
  let low = 0;
  let high = layouts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const layout = layouts[middle];
    if (offset < layout.offset) {
      high = middle - 1;
    } else if (offset >= layout.offset + layout.size) {
      low = middle + 1;
    } else {
      return layout;
    }
  }
  return undefined;
}

function zipFiles(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}
