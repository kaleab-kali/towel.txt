import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { OutputFormat } from "./args.js";
import type { ImageAssetCopyResult } from "./assets.js";

export interface RenderSummary {
  assetDirectory: string | null;
  bytesWritten: number;
  format: OutputFormat;
  images: ImageAssetCopyResult[];
  inputPath: string | null;
  minified: boolean;
  outputPath: string | null;
  stdout: boolean;
  warnings: string[];
}

export async function writeRenderSummary(
  summaryJsonPath: string,
  summary: RenderSummary
): Promise<void> {
  await mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

export function getImageAssetWarnings(imageAssets: ImageAssetCopyResult[]): string[] {
  return imageAssets
    .map((asset) => getImageAssetWarning(asset))
    .filter((warning): warning is string => Boolean(warning));
}

export function getImageAssetWarning(asset: ImageAssetCopyResult): string | undefined {
  if (asset.status === "missing") {
    return `Warning: image asset "${asset.source}" is missing: ${asset.error}`;
  }

  if (asset.status === "skipped" && asset.reason !== "already in output directory") {
    return `Warning: image asset "${asset.source}" was skipped: ${
      asset.reason ?? "unsupported image source"
    }`;
  }

  return undefined;
}
