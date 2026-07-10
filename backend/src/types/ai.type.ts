// Response từ AI: POST /api/process-image
export interface AiOcrLine {
  rawText: string;
  confidenceScore: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface AiProcessImageResponse {
  success: boolean;
  data: {
    embedding: number[];
    ocrLines: AiOcrLine[];
  };
}

// Response từ AI: POST /api/embed-image 
export interface AiEmbedImageResponse {
  success: boolean;
  data: {
    embedding: number[];
  };
}

// Response từ AI: POST /api/embed-text 
export interface AiEmbedTextResponse {
  success: boolean;
  data: {
    embedding: number[];
  };
}
