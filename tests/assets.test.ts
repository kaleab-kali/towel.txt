import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { copyLocalImageAssets } from "../src/cli/assets.js";

let temporaryDirectory: string;

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "towel-txt-assets-"));
});

afterEach(async () => {
  await rm(temporaryDirectory, { force: true, recursive: true });
});

describe("copyLocalImageAssets", () => {
  it("copies Markdown image paths that use Windows separators", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const imagePath = path.join(temporaryDirectory, "images", "diagram.png");
    const outputPath = path.join(temporaryDirectory, "dist", "brief.html");

    await mkdir(path.dirname(imagePath), { recursive: true });
    await writeFile(imagePath, "image-bytes", "utf8");

    const results = await copyLocalImageAssets({
      assetDirectory: "assets",
      inputPath,
      markdown: "![Diagram](images\\diagram.png)",
      outputPath
    });

    expect(results).toEqual([
      {
        source: "images\\diagram.png",
        status: "copied",
        targetSource: "assets/images/diagram.png"
      }
    ]);
    expect(
      await readFile(
        path.join(temporaryDirectory, "dist", "assets", "images", "diagram.png"),
        "utf8"
      )
    ).toBe("image-bytes");
  });
});
