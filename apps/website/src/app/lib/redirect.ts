export function getSafeNextPath(nextPath: string | string[] | undefined) {
  const value = Array.isArray(nextPath) ? nextPath[0] : nextPath;

  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}
