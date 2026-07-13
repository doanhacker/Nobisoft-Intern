import { qdrantClient, QDRANT_COLLECTION_NAME } from '../config/qdrant.js';

export interface VectorPayload {
  imageId: string;
  path: string;
  fileFormat: string;
  hasOcr: boolean;
}

export interface SimilarImagePoint {
  imageId: string;
  score: number;
}

export interface SimilarImageSearchResult {
  points: SimilarImagePoint[];
  total: number;
}

const DEFAULT_SEARCH_MIN_SCORE = 0.5;
const DEFAULT_SEARCH_MAX_RESULTS = 2000;

function getSearchMinScore(): number {
  const configuredScore = Number(process.env.SEARCH_MIN_SCORE);
  return Number.isFinite(configuredScore) && configuredScore >= 0 && configuredScore <= 1
    ? configuredScore
    : DEFAULT_SEARCH_MIN_SCORE;
}

function getSearchMaxResults(): number {
  const configuredMaxResults = Number(process.env.SEARCH_MAX_RESULTS);
  return Number.isInteger(configuredMaxResults) && configuredMaxResults > 0
    ? configuredMaxResults
    : DEFAULT_SEARCH_MAX_RESULTS;
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

export async function searchSimilarImageVectors(
  vector: number[],
  page: number,
  limit: number,
): Promise<SimilarImageSearchResult> {
  const offset = (page - 1) * limit;
  const maxResults = getSearchMaxResults();

  if (offset >= maxResults) {
    return {
      points: [],
      total: 0,
    };
  }

  const queryLimit = Math.min(limit, maxResults - offset);
  const queryResult = await qdrantClient.query(QDRANT_COLLECTION_NAME, {
    query: vector,
    offset,
    limit: queryLimit,
    score_threshold: getSearchMinScore(),
    with_payload: false,
    with_vector: false,
  });

  return {
    points: queryResult.points.map((point) => ({
      imageId: String(point.id),
      score: point.score,
    })),
    total: queryResult.points.length,
  };
}
