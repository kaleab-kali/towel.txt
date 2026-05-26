import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { extractLocalImageSources } from "../parser/images.js";

export interface CopyImageAssetsOptions {
  inputPath: string;
  markdown: string;
  outputPath: string;
}

export interface ImageAssetCopyResult {
  error?: string;
  source: string;
  status: "copied" | "missing" | "unchanged";
}

export async function copyLocalImageAssets(
  options: CopyImageAssetsOptions
): Promise<ImageAssetCopyResult[]> {
  const inputDirectory = path.dirname(options.inputPath);
  const outputDirectory = path.dirname(options.outputPath);
  const imageSources = extractLocalImageSources(options.markdown);

  return Promise.all(
    imageSources.map(async (source) => {
      const sourcePath = path.resolve(inputDirectory, source);
      const targetPath = path.resolve(outputDirectory, source);

      if (sourcePath === targetPath) {
        return { source, status: "unchanged" };
      }

      try {
        await mkdir(path.dirname(targetPath), { recursive: true });
        await copyFile(sourcePath, targetPath);

        return { source, status: "copied" };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Unable to copy image asset.",
          source,
          status: "missing"
        };
      }
    })
  );
}
