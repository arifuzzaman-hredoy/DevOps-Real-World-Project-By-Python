from flask import Flask, render_template
from .config import Config
from .extensions import db
from .routes import api
from .metrics import install_metrics

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    db.init_app(app)
    app.register_blueprint(api)
    install_metrics(app)

    @app.get("/")
    def index():
        return render_template("index.html")

    with app.app_context():
        db.create_all()

    return app

app = create_app()
