export function getSafeNextPath(
  nextPath: string | string[] | undefined,
): string {
  const value = (Array.isArray(nextPath) ? nextPath[0] : nextPath)?.trim();

  if (
    !value ||
    value[0] !== '/' ||
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    value.includes('\\') ||
    hasUnsafeCharacters(value)
  ) {
    return '/';
  }

  return value;
}

function hasUnsafeCharacters(value: string): boolean {
  return Array.from(value).some(
    (character) => character <= ' ' || /\s/.test(character),
  );
}
