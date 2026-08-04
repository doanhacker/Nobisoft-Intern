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
        payload: { ...payload, deleted: false },
      },
    ],
  });
}

export async function setImageVectorsDeleted(
  imageIds: string[],
  deleted: boolean,
): Promise<void> {
  if (imageIds.length === 0) return;

  await qdrantClient.setPayload(QDRANT_COLLECTION_NAME, {
    payload: { deleted },
    points: imageIds,
    wait: true,
  });
}

export async function deleteImageVector(imageId: string): Promise<void> {
  await qdrantClient.delete(QDRANT_COLLECTION_NAME, {
    points: [imageId],
    wait: true,
  });
}

export async function getImageVectors(
  imageIds: string[],
): Promise<Map<string, number[]>> {
  if (imageIds.length === 0) return new Map();

  const points = await qdrantClient.retrieve(QDRANT_COLLECTION_NAME, {
    ids: imageIds,
    with_vector: true,
    with_payload: false,
  });

  const vectorMap = new Map<string, number[]>();
  for (const point of points) {
    const vector = point.vector;
    if (Array.isArray(vector)) {
      vectorMap.set(String(point.id), vector as number[]);
    }
  }

  return vectorMap;
}

export async function searchSimilarExcluding(
  vector: number[],
  excludeIds: string[],
  page: number,
  limit: number,
): Promise<SimilarImageSearchResult> {
  const offset = (page - 1) * limit;
  const maxResults = getSearchMaxResults();

  const queryParams: Parameters<typeof qdrantClient.query>[1] = {
    query: vector,
    limit: maxResults,
    score_threshold: getSearchMinScore('image'),
    with_payload: false,
    with_vector: false,
  };

  queryParams.filter = {
    must_not: [
      {
        key: 'deleted',
        match: { value: true },
      },
      ...(excludeIds.length > 0 ? [{ has_id: excludeIds }] : []),
    ],
  };

  const queryResult = await qdrantClient.query(QDRANT_COLLECTION_NAME, queryParams);

  const matchedPoints = queryResult.points.map((point) => ({
    imageId: String(point.id),
    score: point.score,
  }));

  return {
    points: matchedPoints.slice(offset, offset + limit),
    total: matchedPoints.length,
  };
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
    filter: {
      must_not: [
        {
          key: 'deleted',
          match: { value: true },
        },
      ],
    },
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
