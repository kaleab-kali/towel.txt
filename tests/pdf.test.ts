import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { addBaseHref } from "../src/cli/pdf.js";

describe("addBaseHref", () => {
  it("injects a file base URL for browser PDF rendering", () => {
    const basePath = path.resolve("docs");
    const expectedHref = pathToFileURL(`${basePath}${path.sep}`).href;

    expect(addBaseHref("<html><head><title>Doc</title></head></html>", basePath)).toBe(
      `<html><head>\n    <base href="${expectedHref}"><title>Doc</title></head></html>`
    );
  });

  it("keeps HTML unchanged when no base path is available", () => {
    const html = "<html><head><title>Doc</title></head></html>";

    expect(addBaseHref(html, undefined)).toBe(html);
  });
});
