import { prisma } from '../../../config/prisma.js';
import { embedImage } from '../../../services/ai.service.js';
import { searchSimilarImageVectors } from '../../../services/qdrant.service.js';
import type { SearchImageInput, SearchImageResult } from '../../../types/search.type.js';

export async function searchImagesByImage(input: SearchImageInput): Promise<SearchImageResult> {
  const aiResponse = await embedImage(input.buffer, input.originalname, input.mimetype);

  if (!aiResponse.success || !aiResponse.data) {
    throw new Error(aiResponse.error_message || 'AI không thể xử lý ảnh tìm kiếm');
  }

  const vectorResult = await searchSimilarImageVectors(
    aiResponse.data.embedding,
    input.page,
    input.limit,
  );
  const imageIds = vectorResult.points.map((point) => point.imageId);

  if (imageIds.length === 0) {
    return {
      results: [],
      total: vectorResult.total,
      page: input.page,
      limit: input.limit,
    };
  }

  const images = await prisma.image.findMany({
    where: { id: { in: imageIds } },
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
  const imageMap = new Map(images.map((image) => [image.id, image]));

  const results = vectorResult.points.flatMap((point) => {
    const image = imageMap.get(point.imageId);
    return image ? [{ ...image, similarityScore: point.score }] : [];
  });

  return {
    results,
    total: vectorResult.total,
    page: input.page,
    limit: input.limit,
  };
}
