# Visual Search Engine

Skeleton project for a visual search engine with:

- FastAPI backend for API orchestration
- React/Vite frontend for the search UI
- FastAPI AI service for embedding, OCR, indexing, and search tasks
- PostgreSQL with pgvector for image metadata and vector search

## Requirements

- Docker and Docker Compose
- Git

## Quick Start

```powershell
copy .env.example .env
docker compose up --build
```

Services:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Backend docs: http://localhost:8000/docs
- AI service: http://localhost:9000
- AI service docs: http://localhost:9000/docs
- Database: localhost:5432

## Project Structure

```text
visual-search-engine/
  ai-service/       AI endpoints and future CLIP/OCR/indexing modules
  backend/          Main application API
  database/         Initial schema and future migrations
  datasets/         Local datasets, ignored by Git except .gitkeep
  docs/             Architecture and team documentation
  frontend/         React/Vite client
  scripts/          Helper scripts for setup, import, and maintenance
  storage/          Local uploaded/generated files, ignored by Git except .gitkeep
```

## Branch Workflow

Create a branch per task:

```powershell
git checkout -b feature/backend-upload-api
git checkout -b feature/frontend-search-page
git checkout -b feature/ai-embedding-index
git checkout -b docs/update-architecture
```

Before pushing:

```powershell
git status
docker compose up --build
```

## Suggested Task Split

- Backend: upload API, image metadata, database access, calls to AI service
- Frontend: upload screen, search screen, result grid, API integration
- AI service: preprocessing, embeddings, OCR, vector indexing, similarity search
- Database: migrations, indexes, seed data, schema documentation
- DevOps/docs: CI, setup scripts, architecture notes
