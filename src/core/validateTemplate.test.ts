import { templateLimits } from "./limits";
import { parseBinaryTemplate } from "./parseTemplate";
import { validateTemplate } from "./validateTemplate";

function issueCodes(template: unknown): string[] {
  return validateTemplate(template).map((issue) => issue.code);
}

describe("validateTemplate", () => {
  it.each(["uint8", "uint16", "uint32", "int8", "int16", "int32"])(
    "requires a value for %s",
    (type) => {
      expect(
        issueCodes({ formatVersion: "0.1", name: "test", defaultEndian: "big", fields: [{ name: "n", type }] })
      ).toContain("field.value.required");
    }
  );

  it("requires an explicit string value but allows an empty string", () => {
    const base = { formatVersion: "0.1", name: "test", defaultEncoding: "utf-8" };
    expect(issueCodes({ ...base, fields: [{ name: "text", type: "string", length: 4 }] })).toContain(
      "field.value.required"
    );
    expect(
      issueCodes({ ...base, fields: [{ name: "text", type: "string", length: 4, value: "" }] })
    ).not.toContain("field.value.required");
  });

  it("requires bytes value or fill", () => {
    expect(
      issueCodes({ formatVersion: "0.1", name: "test", fields: [{ name: "data", type: "bytes", length: 2 }] })
    ).toContain("field.value.required");
  });

  it("reports duplicate field names as warnings", () => {
    const issues = validateTemplate({
      formatVersion: "0.1",
      name: "test",
      fields: [
        { name: "same", type: "uint8", value: 1 },
        { name: "same", type: "uint8", value: 2 }
      ]
    });
    expect(issues.filter((issue) => issue.code === "field.name.duplicate")).toHaveLength(2);
    expect(issues.find((issue) => issue.code === "field.name.duplicate")?.level).toBe("warning");
  });

  it("reports a missing length once", () => {
    const issues = validateTemplate({
      formatVersion: "0.1",
      name: "test",
      defaultEncoding: "utf-8",
      fields: [{ name: "text", type: "string", value: "A" }]
    });
    expect(issues.filter((issue) => issue.code === "field.length.required")).toHaveLength(1);
  });

  it("rejects oversized fields and total output", () => {
    expect(
      issueCodes({
        formatVersion: "0.1",
        name: "test",
        fields: [{ name: "data", type: "padding", length: templateLimits.maxFieldBytes + 1 }]
      })
    ).toContain("field.length.tooLarge");

    expect(
      issueCodes({
        formatVersion: "0.1",
        name: "test",
        fields: Array.from({ length: 5 }, (_, index) => ({
          name: `data${index}`,
          type: "padding",
          length: templateLimits.maxFieldBytes
        }))
      })
    ).toContain("template.totalSize.tooLarge");
  });

  it("preserves and reports unknown properties", () => {
    const parsed = parseBinaryTemplate({
      formatVersion: "0.1",
      name: "test",
      vendorOption: true,
      fields: [{ name: "value", type: "uint8", value: 1, customField: "kept" }]
    });
    expect((parsed.template as unknown as Record<string, unknown>).vendorOption).toBe(true);
    expect((parsed.template.fields[0] as unknown as Record<string, unknown>).customField).toBe("kept");
    expect(parsed.issues.map((issue) => issue.code)).toEqual([
      "template.property.unknown",
      "field.property.unknown"
    ]);
  });

  it("warns about known properties that do not apply to the field type", () => {
    const issues = validateTemplate({
      formatVersion: "0.1",
      name: "test",
      fields: [{ name: "value", type: "uint8", value: 1, fill: "FF" }]
    });
    const warning = issues.find((issue) => issue.code === "field.property.inapplicable");
    expect(warning?.level).toBe("warning");
    expect(warning?.messageParams).toEqual({ property: "fill", type: "uint8" });
  });

  it.each(["0.0.0.0", "127.0.0.1", "192.168.0.10", "255.255.255.255"])(
    "accepts IPv4 %s",
    (value) => {
      expect(
        issueCodes({ formatVersion: "0.1", name: "test", fields: [{ name: "ip", type: "ipv4", value }] })
      ).not.toContain("ipv4.invalid");
    }
  );

  it.each(["-1.0.0.0", "256.0.0.1", "1.2.3", "a.b.c.d"])("rejects IPv4 %s", (value) => {
    expect(
      issueCodes({ formatVersion: "0.1", name: "test", fields: [{ name: "ip", type: "ipv4", value }] })
    ).toContain("ipv4.invalid");
  });
});
