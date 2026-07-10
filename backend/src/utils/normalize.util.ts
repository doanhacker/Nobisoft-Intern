/**
 * Chuyển chuỗi tiếng Việt có dấu thành không dấu, lowercase.
 * Dùng cho cột `nameSearch` để hỗ trợ tìm kiếm không dấu.
 *
 * Ví dụ: "Nguyễn Văn Đức" → "nguyen van duc"
 */
export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}
