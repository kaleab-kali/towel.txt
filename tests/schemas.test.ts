import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaFiles = [
  "config.schema.json",
  "doctor.schema.json",
  "error.schema.json",
  "inspect.schema.json",
  "render-summary.schema.json"
];

describe("JSON schemas", () => {
  it("keeps shipped schemas parseable and versioned", async () => {
    for (const schemaFile of schemaFiles) {
      const schema = JSON.parse(
        await readFile(path.join(packageRoot, "schemas", schemaFile), "utf8")
      ) as Record<string, unknown>;

      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(schema.$id).toBe(`https://github.com/kaleab-kali/towel.txt/schemas/${schemaFile}`);
      expect(schema.type).toBe("object");
    }
  });
});
