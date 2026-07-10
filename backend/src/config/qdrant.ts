import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

if (!process.env.QDRANT_URL) {
  throw new Error('QDRANT_URL is required');
}

const qdrantUrl = new URL(process.env.QDRANT_URL);

export const qdrantClient = new QdrantClient({
  host: qdrantUrl.hostname,
  port: Number(qdrantUrl.port) || 6333,
});

export const QDRANT_COLLECTION_NAME = 'images';
export const VECTOR_DIMENSION = 512;

export async function ensureQdrantCollection() {
  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some(
    (col) => col.name === QDRANT_COLLECTION_NAME,
  );

  if (exists) {
    console.log(`Qdrant collection "${QDRANT_COLLECTION_NAME}" ready`);
    return;
  }

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
