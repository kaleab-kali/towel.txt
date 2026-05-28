# Print Notes

This document tracks print rendering decisions for Towel.txt.

## MVP goals

- Output should be readable when opened directly in a browser.
- Print styles should avoid clipped headings, code blocks, and tables.
- Generated HTML should be self-contained for easy sharing.
- PDF output should reuse the same rendered HTML and print CSS through browser
  print automation.
