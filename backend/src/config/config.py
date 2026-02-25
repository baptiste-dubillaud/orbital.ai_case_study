from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Base app
    log_level: str = "INFO"

    # Data
    data_path: str

    # LLM configuration
    llm_base_url: str
    llm_model: str
    llm_api_key: str

settings = Settings()