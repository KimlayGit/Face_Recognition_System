from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Facial Recognition Attendance API"
    SECRET_KEY: str = "change_this_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    DB_SERVER: str = "localhost"
    DB_PORT: int = 1433
    DB_NAME: str = "AttendanceDB"
    DB_USER: str = "sa"
    DB_PASSWORD: str = "YourStrong!Passw0rd"
    DB_DRIVER: str = "ODBC Driver 17 for SQL Server"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
