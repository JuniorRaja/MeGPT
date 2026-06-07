from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    qdrant_url: str = "http://localhost:6333"
    litellm_url: str = "http://localhost:4000"
    pocketbase_url: str = "http://localhost:8090"

    litellm_master_key: str = "sk-selfgpt-master-key"
    default_model: str = "llama-3.3-70b-versatile"
    embed_model: str = "nomic-ai/nomic-embed-text-v1.5"

    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""

    pocketbase_admin_email: str = ""
    pocketbase_admin_password: str = ""

    qdrant_collection: str = "selfgpt_knowledge"
    embed_dim: int = 768


settings = Settings()
