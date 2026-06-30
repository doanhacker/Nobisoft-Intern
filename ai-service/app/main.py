from fastapi import FastAPI

app = FastAPI(title="Visual Search AI Service", version="0.1.0")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "ai-service"}


@app.post("/embed")
def create_embedding() -> dict[str, str]:
    return {
        "status": "not_implemented",
        "message": "Embedding implementation will be added by the AI service team.",
    }


@app.post("/search")
def search_similar_images() -> dict[str, str]:
    return {
        "status": "not_implemented",
        "message": "Vector search implementation will be added by the AI service team.",
    }
