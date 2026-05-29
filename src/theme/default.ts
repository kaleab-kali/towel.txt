export const defaultDocumentStyles = `
:root {
  color-scheme: light;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

body {
  background: #f6f7f9;
  color: #1f2937;
  margin: 0;
}

.document {
  background: #ffffff;
  margin: 3rem auto;
  max-width: 820px;
  min-height: 100vh;
  padding: 4rem;
}

.document-title {
  border-bottom: 1px solid #d7dce3;
  font-size: 2.25rem;
  line-height: 1.15;
  margin: 0 0 1rem;
  padding-bottom: 1rem;
}

.document-meta {
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  font-size: 0.95rem;
  gap: 0.5rem 1rem;
  margin: -0.25rem 0 2rem;
}

.cover-page {
  align-items: center;
  border-bottom: 1px solid #d7dce3;
  display: flex;
  min-height: calc(100vh - 8rem);
  padding-bottom: 3rem;
}

.cover-page-content {
  max-width: 680px;
}

.cover-page-title {
  font-size: 3rem;
  line-height: 1.05;
  margin: 0;
}

.cover-page-subtitle {
  color: #475569;
  font-size: 1.35rem;
  line-height: 1.35;
  margin: 1rem 0 0;
}

.cover-page-meta {
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 2rem 0 0;
}

.toc {
  border: 1px solid #d7dce3;
  margin: 0 0 2.5rem;
  padding: 1.25rem 1.5rem;
}

.toc h2 {
  font-size: 1rem;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
}

.toc ol {
  margin: 0.25rem 0 0;
  padding-left: 1.5rem;
}

.toc a {
  color: #0f766e;
  text-decoration: none;
}

.content h1,
.content h2,
.content h3,
.content h4,
.content h5,
.content h6 {
  line-height: 1.25;
  margin: 2rem 0 0.75rem;
}

.content p,
.content ul,
.content ol,
.content blockquote,
.content pre,
.content table {
  margin: 0 0 1rem;
}

.content blockquote {
  border-left: 4px solid #94a3b8;
  color: #475569;
  padding-left: 1rem;
}

.content code {
  background: #eef2f7;
  border-radius: 4px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.9em;
  padding: 0.1rem 0.25rem;
}

.content pre {
  background: #111827;
  color: #f9fafb;
  overflow-x: auto;
  padding: 1rem;
}

.content pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}

.syntax-keyword,
.syntax-command {
  color: #93c5fd;
  font-weight: 600;
}

.syntax-string {
  color: #bbf7d0;
}

.syntax-number,
.syntax-literal {
  color: #fde68a;
}

.syntax-comment {
  color: #cbd5e1;
  font-style: italic;
}

.syntax-flag {
  color: #fbcfe8;
}

.content table {
  border-collapse: collapse;
  width: 100%;
}

.content th,
.content td {
  border: 1px solid #d7dce3;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.content th {
  background: #f8fafc;
}

.page-break {
  border-top: 1px dashed #94a3b8;
  height: 0;
  margin: 2rem 0;
}

.break-before-page {
  break-before: page;
  page-break-before: always;
}

.break-after-page {
  break-after: page;
  page-break-after: always;
}

.avoid-page-break {
  break-inside: avoid;
  page-break-inside: avoid;
}

.footnotes {
  border-top: 1px solid #d7dce3;
  color: #475569;
  font-size: 0.92rem;
  margin-top: 2.5rem;
  padding-top: 1rem;
}

.footnotes ol {
  margin: 0;
  padding-left: 1.25rem;
}

.footnotes li {
  margin: 0 0 0.5rem;
}

.footnotes p {
  margin: 0 0 0.5rem;
}

.footnote-ref {
  font-size: 0.75em;
  line-height: 0;
  vertical-align: super;
}

.footnote-ref a,
.footnote-backref {
  color: #0f766e;
  text-decoration: none;
}

.footnote-backref {
  font-size: 0.85em;
  margin-left: 0.25rem;
}

@media print {
  @page {
    margin: 0.75in;
  }

  body {
    background: #ffffff;
  }

  .document {
    margin: 0;
    max-width: none;
    min-height: auto;
    padding: 0;
  }

  .cover-page {
    border-bottom: 0;
    break-after: page;
    min-height: 100vh;
    padding-bottom: 0;
  }

  .toc,
  .content blockquote,
  .content pre,
  .content table,
  .avoid-page-break,
  .footnotes li {
    break-inside: avoid;
  }

  .page-break {
    border: 0;
    break-after: page;
    height: 0;
    margin: 0;
    page-break-after: always;
  }

  .content h1,
  .content h2,
  .content h3,
  .content h4,
  .content h5,
  .content h6 {
    break-after: avoid;
  }

  .content pre {
    background: #f8fafc;
    border: 1px solid #d7dce3;
    color: #111827;
  }

  .syntax-keyword,
  .syntax-command {
    color: #1d4ed8;
  }

  .syntax-string {
    color: #166534;
  }

  .syntax-number,
  .syntax-literal {
    color: #92400e;
  }

  .syntax-comment {
    color: #64748b;
  }

  .syntax-flag {
    color: #be185d;
  }

  .toc a {
    color: inherit;
  }

  .footnote-ref a,
  .footnote-backref {
    color: inherit;
  }
}
`.trim();
