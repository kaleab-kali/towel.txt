const protectedBlockPattern = /<(pre|script|style|textarea)\b[^>]*>[\s\S]*?<\/\1>/giu;

export function minifyHtml(html: string): string {
  const protectedBlocks: string[] = [];
  const htmlWithPlaceholders = html.replace(protectedBlockPattern, (block) => {
    const placeholder = `%%TOWEL_TXT_PROTECTED_BLOCK_${protectedBlocks.length}%%`;
    protectedBlocks.push(block);
    return placeholder;
  });

  let minified = htmlWithPlaceholders.replace(/>\s+</g, "><").trim();

  protectedBlocks.forEach((_block, index) => {
    const placeholder = `%%TOWEL_TXT_PROTECTED_BLOCK_${index}%%`;
    const placeholderPattern = escapeRegExp(placeholder);
    minified = minified
      .replace(new RegExp(`>\\s*${placeholderPattern}`, "g"), `>${placeholder}`)
      .replace(new RegExp(`${placeholderPattern}\\s*<`, "g"), `${placeholder}<`);
  });

  return protectedBlocks.reduce(
    (result, block, index) => result.replace(`%%TOWEL_TXT_PROTECTED_BLOCK_${index}%%`, block),
    minified
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
