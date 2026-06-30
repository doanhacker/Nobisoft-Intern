from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://visual_search:change_me@database:5432/visual_search"
    ai_service_url: str = "http://ai-service:9000"
    storage_dir: str = "/app/storage"
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
