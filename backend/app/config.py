from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str = "test-key"
    supabase_url: str = "https://test.supabase.co"
    supabase_service_key: str = "test-service-key"
    supabase_jwt_secret: str = "test-jwt-secret"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
