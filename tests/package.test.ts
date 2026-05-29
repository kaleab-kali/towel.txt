import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { packageName, packageVersion } from "../src/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("package metadata", () => {
  it("exports the CLI package name", () => {
    expect(packageName).toBe("towel-txt");
  });

  it("keeps public package entry points aligned with the built output", async () => {
    const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

    expect(manifest.version).toBe(packageVersion);
    expect(manifest.main).toBe("./dist/index.js");
    expect(manifest.types).toBe("./dist/index.d.ts");
    expect(manifest.exports["."]).toEqual({
      import: "./dist/index.js",
      types: "./dist/index.d.ts"
    });
    expect(manifest.bin["towel-txt"]).toBe("./dist/cli.js");
  });
});
