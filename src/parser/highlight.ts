const javascriptLikeLanguages = new Set(["js", "jsx", "ts", "tsx", "javascript", "typescript"]);
const jsonLanguages = new Set(["json"]);
const shellLanguages = new Set(["bash", "sh", "shell", "zsh"]);

type TokenClassifier = (token: string) => string | undefined;

export function highlightCode(code: string, language: string | undefined): string {
  const normalizedLanguage = normalizeLanguage(language);

  if (normalizedLanguage && javascriptLikeLanguages.has(normalizedLanguage)) {
    return highlightWithPattern(
      code,
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:as|async|await|break|case|catch|class|const|continue|default|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|return|throw|true|try|type|undefined|var|while)\b|\b\d+(?:\.\d+)?\b/g,
      classifyJavaScriptToken
    );
  }

  if (normalizedLanguage && jsonLanguages.has(normalizedLanguage)) {
    return highlightWithPattern(
      code,
      /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b(?:false|null|true)\b/g,
      classifyJsonToken
    );
  }

  if (normalizedLanguage && shellLanguages.has(normalizedLanguage)) {
    return highlightWithPattern(
      code,
      /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--?[A-Za-z0-9][\w-]*|\b(?:cat|cd|cp|echo|git|mkdir|mv|node|npm|pnpm|rm|towel-txt)\b/g,
      classifyShellToken
    );
  }

  return escapeHtml(code);
}

function highlightWithPattern(
  code: string,
  pattern: RegExp,
  classifyToken: TokenClassifier
): string {
  let highlighted = "";
  let lastIndex = 0;

  for (const match of code.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    highlighted += escapeHtml(code.slice(lastIndex, index));
    highlighted += wrapToken(token, classifyToken(token));
    lastIndex = index + token.length;
  }

  highlighted += escapeHtml(code.slice(lastIndex));

  return highlighted;
}

function classifyJavaScriptToken(token: string): string | undefined {
  if (token.startsWith("//") || token.startsWith("/*")) {
    return "syntax-comment";
  }

  if (startsWithQuote(token)) {
    return "syntax-string";
  }

  if (/^\d/.test(token)) {
    return "syntax-number";
  }

  if (token === "true" || token === "false" || token === "null" || token === "undefined") {
    return "syntax-literal";
  }

  return "syntax-keyword";
}

function classifyJsonToken(token: string): string | undefined {
  if (token.startsWith('"')) {
    return "syntax-string";
  }

  if (token === "true" || token === "false" || token === "null") {
    return "syntax-literal";
  }

  return "syntax-number";
}

function classifyShellToken(token: string): string | undefined {
  if (token.startsWith("#")) {
    return "syntax-comment";
  }

  if (startsWithQuote(token)) {
    return "syntax-string";
  }

  if (token.startsWith("-")) {
    return "syntax-flag";
  }

  return "syntax-command";
}

function wrapToken(token: string, className: string | undefined): string {
  const escapedToken = escapeHtml(token);

  if (!className) {
    return escapedToken;
  }

  return `<span class="${className}">${escapedToken}</span>`;
}

function startsWithQuote(value: string): boolean {
  return value.startsWith('"') || value.startsWith("'") || value.startsWith("`");
}

function normalizeLanguage(language: string | undefined): string | undefined {
  return language?.trim().split(/\s+/, 1)[0]?.toLowerCase();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
