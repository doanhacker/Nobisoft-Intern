export interface IndexingFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface IndexingResult {
  filename: string;
  success: boolean;
  imageId?: string;
  error?: string;
}
