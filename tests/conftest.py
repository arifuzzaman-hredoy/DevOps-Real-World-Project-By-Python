import pytest

from app.extensions import db
from app.main import create_app


@pytest.fixture()
def app():
    app = create_app({
        "TESTING": True,
        "AUTH_DISABLED": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SECRET_KEY": "test-secret",
    })
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
