import { prisma } from '../config/prisma.js';

async function initDbExtensions() {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  console.log('✓ Extension pg_trgm ready');

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_image_ocr_normalized_trgm
      ON image_ocr USING GIN (normalized_text gin_trgm_ops)
  `);
  console.log('✓ GIN trigram index on image_ocr.normalized_text ready');
}

try {
  await initDbExtensions();
} catch (error) {
  console.error('Failed to initialize DB extensions:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
