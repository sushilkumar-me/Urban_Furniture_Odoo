from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        extra="ignore"
    )

    APP_NAME: str
    APP_VERSION: str
    DEBUG: bool
    DATABASE_URL: str

settings = Settings()
