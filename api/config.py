from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    qdrant_url: str = "http://localhost:6333"
    litellm_url: str = "http://localhost:4000"
    pocketbase_url: str = "http://localhost:8090"

    litellm_master_key: str = "sk-megpt-master-key"
    default_model: str = "llama-3.3-70b-versatile"
    embed_model: str = "nomic-ai/nomic-embed-text-v1.5"

    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""

    pocketbase_token: str = ""

    groq_api_key: str = ""
    kokoro_url: str = "http://localhost:8880"
    tts_voice: str = "af_heart"
    tts_provider: str = "fish"  # fish | kokoro
    fish_audio_api_key: str = ""
    fish_audio_voice_id: str = ""

    qdrant_collection: str = "megpt_knowledge"
    embed_dim: int = 768

    github_token: str = ""
    github_username: str = "JuniorRaja"

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""


settings = Settings()
