import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { extractImageReferences } from "../parser/images.js";

export interface CopyImageAssetsOptions {
  inputPath: string;
  markdown: string;
  outputPath: string;
}

export interface ImageAssetCopyResult {
  error?: string;
  reason?: string;
  source: string;
  status: "copied" | "missing" | "skipped";
}

export async function copyLocalImageAssets(
  options: CopyImageAssetsOptions
): Promise<ImageAssetCopyResult[]> {
  const inputDirectory = path.dirname(options.inputPath);
  const outputDirectory = path.dirname(options.outputPath);
  const imageReferences = extractImageReferences(options.markdown);

  return Promise.all(
    imageReferences.map(async (reference) => {
      if (reference.status === "skipped") {
        return {
          reason: reference.reason,
          source: reference.source,
          status: "skipped"
        };
      }

      const { source } = reference;
      const sourcePath = path.resolve(inputDirectory, source);
      const targetPath = path.resolve(outputDirectory, source);

      if (sourcePath === targetPath) {
        return { reason: "already in output directory", source, status: "skipped" };
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
