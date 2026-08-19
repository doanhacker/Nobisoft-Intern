/**
 * Utility functions for processing image URLs (resizing, thumbnails, etc.)
 */

/**
 * Generates a thumbnail image URL by appending the target width parameter (`?w=...`).
 * Used for displaying lower quality / smaller size images in Masonry Grids
 * to improve page loading performance while keeping full-res URLs for lightboxes.
 *
 * @param url Original image URL (or undefined)
 * @param width Target pixel width (default: 600)
 * @returns Modified image URL with `?w=...` or original URL if invalid
 */
export function getThumbnailUrl(url: string | undefined | null, width = 600): string {
  if (!url) return ''

  // If already contains w= parameter, don't duplicate
  if (/[?&]w=\d+/.test(url)) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}w=${width}`
}
