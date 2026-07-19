from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    firebase_project_id: str = "easm-platform"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
