export function normalizeAddress(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function pageBounds(page: number, pageSize: number, max: number): { limit: number; offset: number } {
  const limit = Math.min(Math.max(pageSize, 1), max);
  const current = Math.max(page, 1);
  return { limit, offset: (current - 1) * limit };
}
