import { describe, expect, it } from "vitest";

import { extractLocalImageSources } from "../src/parser/images.js";

describe("extractLocalImageSources", () => {
  it("extracts unique safe relative image sources", () => {
    expect(
      extractLocalImageSources(`![One](images/one.png)
![Duplicate](images/one.png)
![Two](assets/two.jpg)`)
    ).toEqual(["images/one.png", "assets/two.jpg"]);
  });

  it("ignores remote, absolute, data, hash, query, and traversal image sources", () => {
    expect(
      extractLocalImageSources(`![Remote](https://example.com/image.png)
![Data](data:image/png;base64,abc)
![Absolute](/images/one.png)
![Hash](image.png#size)
![Query](image.png?v=1)
![Traversal](../image.png)`)
    ).toEqual([]);
  });

  it("ignores front matter before extracting images", () => {
    expect(
      extractLocalImageSources(`---
title: Image Doc
---
![Image](images/one.png)`)
    ).toEqual(["images/one.png"]);
  });
});
