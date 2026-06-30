# Architecture

## Runtime Flow

```text
Frontend (React/Vite)
  -> Backend API (FastAPI)
    -> AI Service (FastAPI)
    -> PostgreSQL + pgvector
    -> storage/
```

## Service Responsibilities

Backend:

- Receive image upload and search requests
- Store image metadata
- Call AI service for embeddings, OCR, and similarity search
- Return normalized API responses to the frontend

AI service:

- Preprocess images
- Generate CLIP embeddings
- Extract OCR text when needed
- Build and query vector indexes

Frontend:

- Upload images
- Submit text or image search queries
- Display ranked visual results and metadata

Database:

- `images`: image metadata and storage paths
- `image_embeddings`: pgvector embeddings linked to images

## Notes for Contributors

- Keep large datasets, uploads, generated files, and model weights out of Git.
- Add database changes as migration files under `database/migrations/`.
- Keep API contracts documented in FastAPI docstrings or `docs/`.
