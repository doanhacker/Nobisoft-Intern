import { prisma } from '../../../config/prisma.js';
import { VECTOR_DIMENSION } from '../../../config/qdrant.js';
import {
  getImageVectors,
  searchSimilarExcluding,
  type SimilarImagePoint,
} from '../../../services/qdrant.service.js';
import type {
  RecommendationResult,
  RecommendationResultItem,
} from '../../../types/recommendation.type.js';
import { resolveImageUrl } from '../../../utils/image-url.util.js';

const DEFAULT_CLICK_LIMIT = 30;
const TIME_DECAY_LAMBDA = 0.05;

function getClickLimit(): number {
  const configured = Number(process.env.RECOMMENDATION_CLICK_LIMIT);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_CLICK_LIMIT;
}

// ảnh click càng gần có trọng số càng cao
function computeWeightedMeanVector(
  vectors: number[][],
): number[] {
  const dimension = vectors[0]?.length ?? VECTOR_DIMENSION;
  const mean = new Array<number>(dimension).fill(0);
  let totalWeight = 0;

  for (let i = 0; i < vectors.length; i++) {
    const weight = Math.exp(-TIME_DECAY_LAMBDA * i);
    totalWeight += weight;
    const vec = vectors[i]!;
    for (let d = 0; d < dimension; d++) {
      mean[d] = (mean[d] ?? 0) + vec[d]! * weight;
    }
  }

  if (totalWeight > 0) {
    for (let d = 0; d < dimension; d++) {
      mean[d] = (mean[d] ?? 0) / totalWeight;
    }
  }

  return mean;
}

export class InsufficientClicksError extends Error { }

export async function getRecommendations(
  userId: string,
  page: number,
  limit: number,
): Promise<RecommendationResult> {
  const clickLimit = getClickLimit();

  // 1. Lấy N click gần nhất của user (distinct clickedImageId, ưu tiên mới nhất)
  const recentClicks = await prisma.searchClick.findMany({
    where: {
      searchHistory: {
        userId,
      },
      clickedImage: {
        deletedAt: null,
      },
    },
    select: {
      clickedImageId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: clickLimit * 2, // Lấy dư để distinct
    distinct: ['clickedImageId'],
  });

  // Giữ tối đa clickLimit distinct image IDs
  const distinctClicks = recentClicks.slice(0, clickLimit);
  const clickCount = distinctClicks.length;

  if (clickCount < 3) {
    throw new InsufficientClicksError(
      `Cần ít nhất 3 lượt click để gợi ý (hiện có ${clickCount})`,
    );
  }

  const clickedImageIds = distinctClicks.map((c) => c.clickedImageId);

  // 2. Retrieve vectors từ Qdrant
  const vectorMap = await getImageVectors(clickedImageIds);

  // Giữ thứ tự gốc (mới nhất trước) cho time decay
  const orderedVectors: number[][] = [];
  for (const imageId of clickedImageIds) {
    const vec = vectorMap.get(imageId);
    if (vec) {
      orderedVectors.push(vec);
    }
  }

  if (orderedVectors.length < 3) {
    throw new InsufficientClicksError(
      'Không đủ vector ảnh trong hệ thống để tính gợi ý',
    );
  }

  // 3. Tính weighted mean vector
  const meanVector = computeWeightedMeanVector(orderedVectors);

  // 4. Search Qdrant, loại trừ ảnh đã click
  const vectorResult = await searchSimilarExcluding(
    meanVector,
    clickedImageIds,
    page,
    limit,
  );

  // 5. Enrich với image details từ PostgreSQL
  const results = await getRecommendationResults(vectorResult.points);

  return {
    results,
    total: vectorResult.total,
    page,
    limit,
    clickCount,
  };
}

async function getRecommendationResults(
  points: SimilarImagePoint[],
): Promise<RecommendationResultItem[]> {
  const imageIds = points.map((p) => p.imageId);
  if (imageIds.length === 0) return [];

  const images = await prisma.image.findMany({
    where: {
      id: { in: imageIds },
      deletedAt: null,
    },
    select: {
      id: true,
      path: true,
      width: true,
      height: true,
      fileSize: true,
      fileFormat: true,
      createdAt: true,
    },
  });

  const imageMap = new Map(images.map((img) => [img.id, img]));

  return points.flatMap((point) => {
    const image = imageMap.get(point.imageId);
    if (!image) return [];
    const { path, ...rest } = image;
    return [{
      ...rest,
      imageUrl: resolveImageUrl(path),
      similarityScore: point.score,
    }];
  });
}
