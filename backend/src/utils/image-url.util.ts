const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export function resolveImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  let urlPath = imagePath.replace(/\\/g, '/');
  if (urlPath.startsWith('storage/')) {
    urlPath = urlPath.slice('storage'.length);
  }

  if (!urlPath.startsWith('/')) {
    urlPath = `/${urlPath}`;
  }

  return `${BACKEND_URL}${urlPath}`;
}
