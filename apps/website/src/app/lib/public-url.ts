export function getPublicAppUrl(fallbackOrigin?: string): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (value) {
    return value;
  }

  if (fallbackOrigin) {
    return fallbackOrigin;
  }

  return 'http://localhost:3000';
}
