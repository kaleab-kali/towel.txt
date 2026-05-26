import { describe, expect, it } from "vitest";

import { renderPrintPageStyles } from "../src/render/print-options.js";

describe("renderPrintPageStyles", () => {
  it("renders print page size and margin declarations", () => {
    expect(renderPrintPageStyles({ margin: "0.75in", pageSize: "letter" })).toBe(`@media print {
  @page {
    size: letter;
    margin: 0.75in;
  }
}`);
  });

  it("returns an empty string when no print options are provided", () => {
    expect(renderPrintPageStyles({})).toBe("");
  });

  it("rejects unsafe CSS option values", () => {
    expect(() => renderPrintPageStyles({ margin: "1in; body { display: none }" })).toThrow(
      "Invalid print margin"
    );
  });
});
