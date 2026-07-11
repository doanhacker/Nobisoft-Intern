import { qdrantClient, QDRANT_COLLECTION_NAME } from '../config/qdrant.js';

export interface VectorPayload {
  imageId: string;
  path: string;
  fileFormat: string;
  hasOcr: boolean;
}

export async function upsertImageVector(
  imageId: string,
  vector: number[],
  payload: VectorPayload,
): Promise<void> {
  await qdrantClient.upsert(QDRANT_COLLECTION_NAME, {
    points: [
      {
        id: imageId,
        vector,
        payload: { ...payload },
      },
    ],
  });
}

export async function deleteImageVector(imageId: string): Promise<void> {
  await qdrantClient.delete(QDRANT_COLLECTION_NAME, {
    points: [imageId],
  });
}
