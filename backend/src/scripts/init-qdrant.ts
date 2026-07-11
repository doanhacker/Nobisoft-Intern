import { qdrantClient, QDRANT_COLLECTION_NAME, VECTOR_DIMENSION } from '../config/qdrant.js';

async function initQdrant() {
  // Kiểm tra collection đã tồn tại chưa
  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some(
    (col) => col.name === QDRANT_COLLECTION_NAME,
  );

  if (exists) {
    console.log(`Qdrant collection "${QDRANT_COLLECTION_NAME}" already exists`);
    return;
  }

  // Tạo collection mới
  await qdrantClient.createCollection(QDRANT_COLLECTION_NAME, {
    vectors: {
      size: VECTOR_DIMENSION,
      distance: 'Cosine',
    },
  });

  console.log(
    `Qdrant collection "${QDRANT_COLLECTION_NAME}" created (dimension=${VECTOR_DIMENSION}, distance=Cosine)`,
  );
}

try {
  await initQdrant();
} catch (error) {
  console.error('Failed to initialize Qdrant:', error);
  process.exitCode = 1;
}
