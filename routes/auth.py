import hashlib, secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, session, jsonify, current_app
from sqlalchemy import func
from extensions import db
from models.user import User
from utils import err, login_required, current_user

bp = Blueprint("auth", __name__)


@bp.post("/api/auth/login")
def login():
    d = request.get_json(silent=True) or {}
    ident = (d.get("username") or "").strip().lower()
    u = User.query.filter(func.lower(User.email) == ident).first()
    if not u or not u.check_password(d.get("password") or ""):
        return err("Credenciales inválidas", 401)
    if u.status != "ACTIVE":
        return err("Usuario bloqueado. Contactá a la administradora.", 403)
    session.clear()
    session["uid"] = u.id
    session["csrf"] = secrets.token_hex(16)
    session.permanent = True
    return jsonify(user=u.to_dict())


@bp.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@bp.get("/api/auth/me")
@login_required
def me():
    return jsonify(user=current_user().to_dict())


@bp.post("/api/auth/reset-request")
def reset_request():
    """Estructura de recuperación: genera un token de un solo uso (1 h).
    Todavía no hay envío de email: el token se registra en el log del servidor."""
    d = request.get_json(silent=True) or {}
    ident = (d.get("username") or "").strip().lower()
    u = User.query.filter(func.lower(User.email) == ident).first()
    if u and u.status == "ACTIVE":
        token = secrets.token_urlsafe(24)
        u.reset_token_hash = hashlib.sha256(token.encode()).hexdigest()
        u.reset_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        current_app.logger.warning("TOKEN DE RESET para %s: %s", u.email, token)  # TODO: enviar por email
    return jsonify(message="Si el usuario existe, se generó un código de recuperación.")


@bp.post("/api/auth/reset-confirm")
def reset_confirm():
    d = request.get_json(silent=True) or {}
    pw = d.get("password") or ""
    if len(pw) < 8:
        return err("La contraseña debe tener al menos 8 caracteres")
    h = hashlib.sha256((d.get("token") or "").encode()).hexdigest()
    u = User.query.filter_by(reset_token_hash=h).first()
    if not u or not u.reset_expires or u.reset_expires < datetime.utcnow():
        return err("Código inválido o vencido", 400)
    u.set_password(pw)
    u.reset_token_hash = u.reset_expires = None
    db.session.commit()
    return jsonify(ok=True)
