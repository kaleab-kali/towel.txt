import { describe, expect, it } from "vitest";

import { packageName } from "../src/index.js";

describe("package metadata", () => {
  it("exports the CLI package name", () => {
    expect(packageName).toBe("towel-txt");
  });
});
