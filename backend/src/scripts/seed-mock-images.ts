import 'dotenv/config';
import { prisma } from '../config/prisma.js';
import { embedImage } from '../services/ai.service.js';
import { deleteImageVector, upsertImageVector } from '../services/qdrant.service.js';

const MOCK_IMAGE_COUNT = 100;
const MOCK_IMAGE_PREFIX = 'https://picsum.photos/seed/phone-';
const OLD_MOCK_IMAGE_PREFIXES = [
  'https://picsum.photos/seed/mock-search-',
  'https://loremflickr.com/1200/800/smartphone,phone?lock=',
];

const mockImages = Array.from({ length: MOCK_IMAGE_COUNT }, (_, index) => {
  const imageNumber = String(index + 1).padStart(3, '0');

  return {
    path: `${MOCK_IMAGE_PREFIX}${imageNumber}/1200/800`,
    width: 1200,
    height: 800,
    fileSize: 250_000 + index * 1_000,
    fileFormat: 'jpg',
  };
});

async function seedMockImages() {
  const existingMockImages = await prisma.image.findMany({
    where: {
      OR: [...OLD_MOCK_IMAGE_PREFIXES, MOCK_IMAGE_PREFIX].map((prefix) => ({
        path: { startsWith: prefix },
      })),
    },
    select: { id: true },
  });

  await Promise.allSettled(existingMockImages.map((image) => deleteImageVector(image.id)));

  await prisma.image.deleteMany({
    where: {
      OR: [...OLD_MOCK_IMAGE_PREFIXES, MOCK_IMAGE_PREFIX].map((prefix) => ({
        path: { startsWith: prefix },
      })),
    },
  });

  await prisma.image.createMany({
    data: mockImages,
  });

  const createdImages = await prisma.image.findMany({
    where: { path: { startsWith: MOCK_IMAGE_PREFIX } },
    orderBy: { path: 'asc' },
  });

  let indexedCount = 0;

  for (const [index, image] of createdImages.entries()) {
    try {
      const imageResponse = await fetch(image.path);
      if (!imageResponse.ok) {
        throw new Error(`Download failed: ${imageResponse.status}`);
      }

      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      const aiResponse = await embedImage(buffer, `mock-phone-${index + 1}.jpg`, 'image/jpeg');

      if (!aiResponse.success || !aiResponse.data) {
        throw new Error(aiResponse.error_message || 'AI embedding failed');
      }

      await upsertImageVector(image.id, aiResponse.data.embedding, {
        imageId: image.id,
        path: image.path,
        fileFormat: image.fileFormat || 'unknown',
        hasOcr: false,
      });

      indexedCount += 1;
      console.log(`Embedded mock image ${indexedCount}/${createdImages.length}`);
    } catch (error) {
      console.error(`Failed to embed ${image.path}:`, error);
    }
  }

  console.log(
    `Created ${createdImages.length} mock phone images and indexed ${indexedCount} vectors`,
  );
}

try {
  await seedMockImages();
} catch (error) {
  console.error('Failed to seed mock images:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
