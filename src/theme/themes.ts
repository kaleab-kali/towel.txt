import { defaultDocumentStyles } from "./default.js";

export const themeNames = ["default", "compact", "report"] as const;

export type ThemeName = (typeof themeNames)[number];

const compactThemeStyles = `
/* theme: compact */
:root {
  font-size: 14px;
  line-height: 1.5;
}

.document {
  margin: 1.5rem auto;
  max-width: 760px;
  padding: 2.5rem;
}

.document-title {
  font-size: 1.8rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
}

.document-meta {
  margin-bottom: 1.5rem;
}

.toc {
  margin-bottom: 1.75rem;
  padding: 1rem 1.25rem;
}

.content h1,
.content h2,
.content h3,
.content h4,
.content h5,
.content h6 {
  margin-top: 1.5rem;
}
`.trim();

const reportThemeStyles = `
/* theme: report */
:root {
  font-family:
    Georgia, "Times New Roman", ui-serif, serif;
}

body {
  background: #eef1f5;
  color: #18212f;
}

.document {
  border-top: 8px solid #1d4ed8;
  box-shadow: 0 16px 40px rgb(15 23 42 / 12%);
}

.document-title {
  border-bottom-color: #93a4bd;
  color: #0f1f36;
}

.document-meta {
  color: #52657f;
}

.toc {
  background: #f8fafc;
  border-color: #b8c4d4;
}

.toc a {
  color: #1d4ed8;
}

.content th {
  background: #e9eef6;
}

@media print {
  .document {
    border-top: 0;
    box-shadow: none;
  }
}
`.trim();

export function getThemeStyles(themeName: ThemeName = "default"): string {
  if (themeName === "compact") {
    return `${defaultDocumentStyles}\n\n${compactThemeStyles}`;
  }

  if (themeName === "report") {
    return `${defaultDocumentStyles}\n\n${reportThemeStyles}`;
  }

  return defaultDocumentStyles;
}

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && themeNames.includes(value as ThemeName);
}
