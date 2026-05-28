import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CliUsageError } from "./args.js";

export interface PdfPrintOptions {
  basePath?: string;
  browserPath?: string;
  html: string;
  outputPath: string;
}

export async function printHtmlToPdf({
  basePath,
  browserPath,
  html,
  outputPath
}: PdfPrintOptions): Promise<void> {
  const browserExecutable = browserPath ?? (await findBrowserExecutable());

  if (!browserExecutable) {
    throw new CliUsageError(
      "No supported browser found. Install Chrome, Edge, or Chromium, or pass --browser <path>."
    );
  }

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "towel-txt-pdf-"));
  const temporaryHtmlPath = path.join(temporaryDirectory, "document.html");

  try {
    await writeFile(temporaryHtmlPath, addBaseHref(html, basePath), "utf8");
    await runBrowserPrint(browserExecutable, temporaryHtmlPath, outputPath);
    await assertPdfWasCreated(outputPath);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

export function addBaseHref(html: string, basePath: string | undefined): string {
  if (!basePath) {
    return html;
  }

  const baseHref = pathToFileURL(`${path.resolve(basePath)}${path.sep}`).href;
  const baseElement = `<base href="${escapeHtmlAttribute(baseHref)}">`;

  return html.replace(/<head>/i, `<head>\n    ${baseElement}`);
}

async function findBrowserExecutable(): Promise<string | undefined> {
  const configuredBrowser = process.env.TOWEL_TXT_BROWSER?.trim();

  if (configuredBrowser) {
    return configuredBrowser;
  }

  for (const candidate of getBrowserCandidates()) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  for (const commandName of getBrowserCommandNames()) {
    const executable = await findOnPath(commandName);

    if (executable) {
      return executable;
    }
  }

  return undefined;
}

function getBrowserCandidates(): string[] {
  if (process.platform === "win32") {
    return [
      getOptionalPath(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      getOptionalPath(
        process.env["ProgramFiles(x86)"],
        "Microsoft",
        "Edge",
        "Application",
        "msedge.exe"
      ),
      getOptionalPath(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),
      getOptionalPath(
        process.env["ProgramFiles(x86)"],
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
      getOptionalPath(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
    ].filter((candidate): candidate is string => Boolean(candidate));
  }

  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    ];
  }

  return [];
}

function getBrowserCommandNames(): string[] {
  if (process.platform === "win32") {
    return ["msedge", "chrome", "chromium"];
  }

  if (process.platform === "darwin") {
    return ["google-chrome", "microsoft-edge", "chromium"];
  }

  return [
    "google-chrome",
    "google-chrome-stable",
    "microsoft-edge",
    "chromium",
    "chromium-browser"
  ];
}

function getOptionalPath(...parts: Array<string | undefined>): string | undefined {
  if (parts.some((part) => !part)) {
    return undefined;
  }

  return path.join(...(parts as string[]));
}

async function findOnPath(commandName: string): Promise<string | undefined> {
  const pathEntries = process.env.PATH?.split(path.delimiter).filter(Boolean) ?? [];
  const executableNames = getExecutableNames(commandName);

  for (const pathEntry of pathEntries) {
    for (const executableName of executableNames) {
      const candidate = path.join(pathEntry, executableName);

      if (await fileExists(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function getExecutableNames(commandName: string): string[] {
  if (process.platform !== "win32" || path.extname(commandName)) {
    return [commandName];
  }

  const pathExtensions = process.env.PATHEXT?.split(";").filter(Boolean) ?? [
    ".COM",
    ".EXE",
    ".BAT",
    ".CMD"
  ];

  return pathExtensions.map((extension) => `${commandName}${extension.toLowerCase()}`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;

    if (code === "ENOENT" || code === "ENOTDIR") {
      return false;
    }

    throw error;
  }
}

async function assertPdfWasCreated(outputPath: string): Promise<void> {
  if (await fileExists(outputPath)) {
    return;
  }

  throw new Error("Browser PDF export completed without creating the output file.");
}

function runBrowserPrint(
  browserExecutable: string,
  htmlPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const browser = spawn(
      browserExecutable,
      [
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        `--print-to-pdf=${outputPath}`,
        pathToFileURL(htmlPath).href
      ],
      {
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true
      }
    );
    const stderrChunks: Buffer[] = [];

    browser.stderr.on("data", (chunk: Buffer | string) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    browser.on("error", reject);
    browser.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
      const details = stderr ? ` ${stderr}` : "";

      reject(new Error(`Browser PDF export failed with exit code ${exitCode}.${details}`));
    });
  });
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
