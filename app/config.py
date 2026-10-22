import os


class Config:
    APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY and APP_ENV != "production":
        SECRET_KEY = "dev-only-change-me"
    STUDY_APP_PASSWORD = os.getenv("STUDY_APP_PASSWORD")
    FRONTEND_DIST_DIR = os.getenv("FRONTEND_DIST_DIR")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI and APP_ENV != "production":
        SQLALCHEMY_DATABASE_URI = "sqlite:///taskflow.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = APP_ENV == "production"
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 12
