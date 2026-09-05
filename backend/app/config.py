# ============================================================
# config.py
#
# PURPOSE:
#   Read the .env file and expose every setting as a typed
#   Python attribute on a single "settings" object.
#
# THE PROBLEM IT SOLVES:
#   Without this file, every Python file would have to do:
#       import os
#       db_url = os.getenv("DATABASE_URL")
#   That is repetitive, untyped, and error-prone.
#   With this file, any other file just does:
#       from app.config import settings
#       print(settings.DATABASE_URL)
#
# DEPENDENCY CHAIN:
#   .env
#    └── config.py  (reads .env)
#         └── database.py  (uses settings.DATABASE_URL)
#         └── main.py      (uses settings.APP_NAME)
# ============================================================


# ---- IMPORTS -----------------------------------------------

# BaseSettings is pydantic-settings' special base class.
# It gives our Settings class the ability to read from .env files.
# A regular Python class cannot do this — BaseSettings can.
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path is Python's built-in tool for working with file paths.
# We use it to build an ABSOLUTE path to our .env file so the
# app finds it correctly no matter where uvicorn is launched from.
#
# Why not just write "../.env" as a string?
# Because pydantic-settings resolves string paths relative to the
# CURRENT WORKING DIRECTORY (wherever you ran uvicorn), not relative
# to this Python file. That causes "file not found" errors.
# Path(__file__) always points to THIS file — it never changes.
from pathlib import Path


# ---- BUILD THE .env PATH -----------------------------------
#
# Step by step what this line does:
#
#   __file__
#       A built-in Python variable. Always equals the full path
#       of the current file being executed.
#       Example: "C:/...../backend/app/config.py"
#
#   Path(__file__)
#       Wraps that string as a Path object so we can navigate.
#       Example: Path("C:/...../backend/app/config.py")
#
#   .resolve()
#       Converts to an absolute path (removes any ".." shortcuts).
#       Example: Path("C:/Users/admin/.../backend/app/config.py")
#
#   .parent
#       Goes ONE folder up — from config.py to its folder /app
#       Example: Path("C:/Users/admin/.../backend/app")
#
#   .parent  (second time)
#       Goes ONE more folder up — from /app to /backend
#       Example: Path("C:/Users/admin/.../backend")
#
#   / ".env"
#       The / operator on Path objects means "join this name".
#       Adds ".env" to the path.
#       Final: Path("C:/Users/admin/.../backend/.env")
#
# Result: an absolute path that always points to backend/.env
ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"


# ---- SETTINGS CLASS ----------------------------------------
#
# We define Settings as a class that INHERITS from BaseSettings.
# Inheritance means Settings gets all of BaseSettings' abilities
# — including the automatic .env reading superpower.
#
# Think of BaseSettings as a template.
# Settings is our customized version of that template.
class Settings(BaseSettings):

    # model_config is a SPECIAL class variable that pydantic-settings
    # looks for automatically. It is NOT a regular attribute.
    # SettingsConfigDict() is the correct way to configure it in v2.
    #
    # env_file=str(ENV_FILE_PATH)
    #   → tells pydantic-settings exactly where to find the .env file
    #   → we convert Path to str because some systems expect a string
    #
    # extra="ignore"
    #   → if .env has keys we haven't declared as fields below,
    #     pydantic silently ignores them instead of raising an error.
    #   → safer for development when .env might have extra comments/keys
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        extra="ignore"
    )

    # ---- FIELDS --------------------------------------------
    # Each field below MUST match a KEY name in the .env file.
    # pydantic-settings reads .env and maps values to these fields.
    # The TYPE (str, bool) tells pydantic what to expect and how
    # to convert the raw string from .env into a Python type.

    # Maps to:  APP_NAME="Urban Furniture Accounting System"
    # Type str  → kept as a string, no conversion needed
    APP_NAME: str

    # Maps to:  APP_VERSION="1.0.0"
    # Type str  → kept as a string
    APP_VERSION: str

    # Maps to:  DEBUG=True
    # Type bool → pydantic converts the STRING "True" from .env
    #             into a real Python boolean True automatically.
    #             Without this type hint it would stay as the
    #             string "True" which is always truthy — a bug.
    DEBUG: bool

    # Maps to:  DATABASE_URL=postgresql://postgres:1234@...
    # Type str  → kept as a string.
    #             database.py passes this directly to create_engine().
    DATABASE_URL: str


# ---- CREATE THE SINGLETON ----------------------------------
#
# A "singleton" means ONE instance shared by the whole app.
# We create it ONCE here at module level.
#
# When Python first imports config.py (from any file), it runs
# this line, reads the .env, and stores the result in "settings".
# Every subsequent import just reuses the same object — Python
# does NOT re-read the .env file each time. Efficient and safe.
#
# Usage in any other file:
#   from app.config import settings
#   print(settings.APP_NAME)     → "Urban Furniture Accounting System"
#   print(settings.DATABASE_URL) → "postgresql://postgres:1234@..."
settings = Settings()
