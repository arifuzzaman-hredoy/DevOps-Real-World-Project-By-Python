import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    STUDY_APP_PASSWORD = os.getenv("STUDY_APP_PASSWORD", "study-matrix-local")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("APP_ENV") == "production"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///taskflow.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
