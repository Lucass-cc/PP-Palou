import hmac, os, secrets
from flask import Flask, app, render_template, request, session, redirect, g
from config import Config
from extensions import db
from utils import err, login_required, admin_required, current_user


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    os.makedirs(os.path.join(app.root_path, "database"), exist_ok=True)
    db.init_app(app)

    from routes import auth, dashboard, products, stock, movements, users, sync, imports, tables
    for m in (auth, dashboard, products, stock, movements, users, sync, imports, tables):
        app.register_blueprint(m.bp)

    @app.context_processor 
    def inject():
        session.setdefault("csrf", secrets.token_hex(16))
        return {"csrf_token": lambda: session["csrf"]}

    @app.before_request
    def csrf_protect():
        if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.path.startswith("/api/"):
            sent, real = request.headers.get("X-CSRF-Token", ""), session.get("csrf", "")
            if not real or not hmac.compare_digest(sent, real):
                return err("Token CSRF inválido", 403)

    @app.after_request
    def headers(r):
        r.headers["X-Content-Type-Options"] = "nosniff"
        r.headers["X-Frame-Options"] = "DENY"
        return r

    def page(tpl, name):
        return render_template(tpl, user=g.user, page=name)

    @app.get("/")
    def index():
        return redirect("/dashboard" if current_user() else "/login")

    @app.get("/login")
    def login_page():
        return redirect("/dashboard") if current_user() else render_template("login.html")

    @app.get("/dashboard")
    @login_required
    def dashboard_page(): return page("dashboard.html", "dashboard")

    @app.get("/movement")
    @login_required
    def movement_page(): return page("movement.html", "movement")

    @app.get("/stock")
    @login_required
    def stock_page(): return page("stock.html", "stock")

    @app.get("/sync")
    @login_required
    def sync_page(): return page("sync.html", "sync")

    @app.get("/tablas")
    @login_required
    def tables_page(): return page("tables.html", "tables")

    @app.get("/users")
    @admin_required
    def users_page(): return page("users.html", "users")
    
    @app.get("/import")
    @login_required
    def import_page(): return page("import.html", "import")

    @app.errorhandler(404)
    def nf(e):
        return err("No encontrado", 404) if request.path.startswith("/api/") else redirect("/") 
    
    @app.errorhandler(413)
    def too_big(e):
        return err("Archivo demasiado grande (máximo 8 MB)", 413)

    with app.app_context():
        db.create_all()
        from seed import seed
        seed()
    return app


if __name__ == "__main__":
    create_app().run(debug=os.environ.get("FLASK_DEBUG") == "1")
