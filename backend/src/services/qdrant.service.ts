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

type VectorSearchMode = 'image' | 'semantic';

const DEFAULT_SEARCH_MIN_SCORES: Record<VectorSearchMode, number> = {
  image: 0.3,
  semantic: 0.1,
};
const DEFAULT_SEARCH_MAX_RESULTS = 2000;

function getSearchMinScore(mode: VectorSearchMode): number {
  const environmentVariable = mode === 'image'
    ? process.env.SEARCH_MIN_SCORE_IMAGE
    : process.env.SEARCH_MIN_SCORE_SEMANTIC;
  const configuredScore = environmentVariable?.trim()
    ? Number(environmentVariable)
    : Number.NaN;

  return Number.isFinite(configuredScore) && configuredScore >= 0 && configuredScore <= 1
    ? configuredScore
    : DEFAULT_SEARCH_MIN_SCORES[mode];
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
  mode: VectorSearchMode,
): Promise<SimilarImageSearchResult> {
  const offset = (page - 1) * limit;
  const maxResults = getSearchMaxResults();
  const queryResult = await qdrantClient.query(QDRANT_COLLECTION_NAME, {
    query: vector,
    limit: maxResults,
    score_threshold: getSearchMinScore(mode),
    with_payload: false,
    with_vector: false,
  });

  const matchedPoints = queryResult.points.map((point) => ({
    imageId: String(point.id),
    score: point.score,
  }));

  return {
    points: matchedPoints.slice(offset, offset + limit),
    total: matchedPoints.length,
  };
}
