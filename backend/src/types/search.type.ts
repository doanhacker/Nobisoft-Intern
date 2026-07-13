export interface SearchImageInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  page: number;
  limit: number;
}

export interface SearchImageResultItem {
  id: string;
  path: string;
  width: number;
  height: number;
  fileSize: number;
  fileFormat: string;
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
