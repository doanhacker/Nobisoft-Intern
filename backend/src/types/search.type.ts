export interface SearchImageInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  page: number;
  limit: number;
}

export interface SearchImageResultItem {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  fileFormat: string | null;
  similarityScore: number;
  createdAt: Date;
}

export interface SearchImageResult {
  results: SearchImageResultItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchImageResponse {
  success: true;
  data: {
    searchType: 'IMAGE_ONLY';
    results: SearchImageResultItem[];
    total: number;
    page: number;
    limit: number;
  };
}
