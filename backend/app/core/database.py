from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import quote_plus
from app.core.config import settings


def get_connection_string() -> str:
    driver = settings.DB_DRIVER
    password = quote_plus(settings.DB_PASSWORD)

    # If DB_SERVER already includes a named instance like LAY\SQLEXPRESS,
    # do not append the port.
    if "\\" in settings.DB_SERVER:
        server_part = settings.DB_SERVER
    else:
        server_part = f"{settings.DB_SERVER},{settings.DB_PORT}"

    return (
        f"mssql+pyodbc://{settings.DB_USER}:{password}"
        f"@{server_part}/{settings.DB_NAME}"
        f"?driver={quote_plus(driver)}&TrustServerCertificate=yes"
    )


engine = create_engine(get_connection_string(), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()