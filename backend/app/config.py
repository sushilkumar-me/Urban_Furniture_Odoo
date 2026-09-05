# ============================================================
# config.py
#
# WHY THIS FILE EXISTS:
#   This file reads our .env file and makes all settings
#   available to the rest of the application as a single
#   Python object called "settings".
#
# WHO USES THIS FILE:
#   - database.py  (needs DATABASE_URL to connect)
#   - main.py      (needs APP_NAME and APP_VERSION for docs)
# ============================================================


# BaseSettings: the special class that reads .env files automatically
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path is a built-in Python tool for working with file paths.
# It lets us build a path based on WHERE THIS FILE IS LOCATED,
# so it always works no matter what folder uvicorn is run from.
from pathlib import Path


# __file__ is a built-in Python variable that always contains
# the full path to the CURRENT Python file being executed.
# Example: "C:/...../backend/app/config.py"
#
# Path(__file__) wraps it as a Path object so we can navigate.
# .resolve()     makes it an absolute path (removes any ".." or ".")
# .parent        goes one folder UP  → this gives us: backend/app/
# .parent        goes one more UP    → this gives us: backend/
# / ".env"       adds ".env" to the end → backend/.env
#
# This technique is called "relative-to-this-file" path resolution.
# It ALWAYS works, whether you run uvicorn from backend/ or anywhere else.
ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):

    # model_config tells pydantic-settings how to behave.
    # env_file      → the absolute path to our .env file (built above)
    # extra="ignore" → ignore unknown keys in .env instead of crashing
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        extra="ignore"
    )

    # Each field below maps to a KEY in the .env file.
    # pydantic-settings reads the .env and fills these in automatically.

    # APP_NAME → "Urban Furniture Accounting System"
    APP_NAME: str

    # APP_VERSION → "1.0.0"
    APP_VERSION: str

    # DEBUG → True or False
    # pydantic converts the string "True" to a real Python bool
    DEBUG: bool

    # DATABASE_URL → the full PostgreSQL connection string
    # Placeholder for now — used in Phase 2
    DATABASE_URL: str


# Create ONE instance of Settings.
# This reads the .env file and fills in all the values above.
# Every other file imports THIS object — never creates a new one.
#
# Usage:
#   from app.config import settings
#   print(settings.APP_NAME)  →  "Urban Furniture Accounting System"
settings = Settings()
