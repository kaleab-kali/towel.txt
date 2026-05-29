import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { extractImageReferences } from "../parser/images.js";

export interface CopyImageAssetsOptions {
  assetDirectory?: string;
  inputPath: string;
  markdown: string;
  outputPath: string;
}

export interface ImageAssetCopyResult {
  error?: string;
  reason?: string;
  source: string;
  status: "copied" | "missing" | "skipped";
  targetSource?: string;
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
      const normalizedSource = source.replace(/\\/g, "/");
      const targetSource = getTargetSource(normalizedSource, options.assetDirectory);
      const sourcePath = path.resolve(inputDirectory, normalizedSource);
      const targetPath = path.resolve(outputDirectory, targetSource);

      if (sourcePath === targetPath) {
        return {
          reason: "already in output directory",
          source,
          status: "skipped",
          targetSource
        };
      }

      try {
        await mkdir(path.dirname(targetPath), { recursive: true });
        await copyFile(sourcePath, targetPath);

        return { source, status: "copied", targetSource };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Unable to copy image asset.",
          source,
          status: "missing",
          targetSource
        };
      }
    })
  );
}

function getTargetSource(source: string, assetDirectory: string | undefined): string {
  const normalizedSource = source.replace(/\\/g, "/");

  if (!assetDirectory) {
    return normalizedSource;
  }

  return `${assetDirectory}/${normalizedSource}`;
}
