export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = removeVietnameseDiacritics(query);
  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0);
}
