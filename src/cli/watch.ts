import { watch as watchPath } from "node:fs/promises";

export interface WatchFilesOptions {
  debounceMs?: number;
  files: string[];
  onChange: (filePath: string) => Promise<void> | void;
  signal?: AbortSignal;
}

export async function watchFiles({
  debounceMs = 100,
  files,
  onChange,
  signal
}: WatchFilesOptions): Promise<void> {
  const uniqueFiles = [...new Set(files)];
  const scheduler = createChangeScheduler(onChange, debounceMs);

  try {
    await Promise.all(
      uniqueFiles.map(async (filePath) => {
        for await (const _event of watchPath(filePath, { signal })) {
          void _event;
          scheduler.schedule(filePath);
        }
      })
    );
  } catch (error) {
    if (!isAbortError(error)) {
      throw error;
    }
  } finally {
    await scheduler.flush();
  }
}

function createChangeScheduler(
  onChange: (filePath: string) => Promise<void> | void,
  debounceMs: number
): {
  flush: () => Promise<void>;
  schedule: (filePath: string) => void;
} {
  let pendingFilePath: string | undefined;
  let pendingTimeout: NodeJS.Timeout | undefined;
  let pendingWork = Promise.resolve();

  return {
    async flush() {
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        pendingTimeout = undefined;

        if (pendingFilePath) {
          const filePath = pendingFilePath;
          pendingFilePath = undefined;
          pendingWork = pendingWork.then(() => onChange(filePath));
        }
      }

      await pendingWork;
    },
    schedule(filePath) {
      pendingFilePath = filePath;

      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
      }

      pendingTimeout = setTimeout(() => {
        pendingTimeout = undefined;

        if (!pendingFilePath) {
          return;
        }

        const filePathToReport = pendingFilePath;
        pendingFilePath = undefined;
        pendingWork = pendingWork.then(() => onChange(filePathToReport));
      }, debounceMs);
      pendingTimeout.unref();
    }
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
