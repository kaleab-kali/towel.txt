export interface PrintPageOptions {
  margin?: string;
  pageSize?: string;
}

const allowedCssValuePattern = /^[a-z0-9\s.%()-]+$/iu;

export function renderPrintPageStyles(options: PrintPageOptions): string {
  const declarations = [
    options.pageSize
      ? `    size: ${sanitizePrintOption(options.pageSize, "page size")};`
      : undefined,
    options.margin ? `    margin: ${sanitizePrintOption(options.margin, "margin")};` : undefined
  ].filter((declaration): declaration is string => Boolean(declaration));

  if (declarations.length === 0) {
    return "";
  }

  return `@media print {
  @page {
${declarations.join("\n")}
  }
}`;
}

function sanitizePrintOption(value: string, label: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue || !allowedCssValuePattern.test(trimmedValue)) {
    throw new Error(`Invalid print ${label}: ${value}`);
  }

  return trimmedValue;
}
