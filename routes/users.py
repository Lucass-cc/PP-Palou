import re
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from extensions import db
from models import User, StockMovement, StockControl
from utils import err, admin_required, clean

bp = Blueprint("users", __name__)


@bp.get("/api/users")
@admin_required
def list_users():
    return jsonify(users=[u.to_dict() for u in User.query.order_by(User.name)])


@bp.post("/api/users")
@admin_required
def create_user():
    d = request.get_json(silent=True) or {}
    name, email, pw = clean(d.get("name"), 120), clean(d.get("email"), 120), d.get("password") or ""
    if not name or not email:
        return err("Nombre y usuario/email son obligatorios")
    if not re.fullmatch(r"[\w.@+-]{3,120}", email):
        return err("Usuario/email inválido")
    if len(pw) < 8:
        return err("La contraseña debe tener al menos 8 caracteres")
    if User.query.filter(func.lower(User.email) == email.lower()).first():
        return err("Ese usuario ya existe", 409)
    u = User(name=name, email=email, role="OPERATOR", status="ACTIVE")  # solo existe un ADMIN
    u.set_password(pw)
    db.session.add(u)
    db.session.commit()
    return jsonify(user=u.to_dict()), 201


@bp.put("/api/users/<int:uid>")
@admin_required
def update_user(uid):
    u = db.session.get(User, uid)
    if not u:
        return err("Usuario no encontrado", 404)
    d = request.get_json(silent=True) or {}
    if "status" in d:
        if d["status"] not in ("ACTIVE", "BLOCKED"):
            return err("Estado inválido")
        if u.id == g.user.id or u.role == "ADMIN":
            return err("No se puede bloquear a la administradora", 403)
        u.status = d["status"]
    if "name" in d:
        if not clean(d["name"], 120):
            return err("Nombre inválido")
        u.name = clean(d["name"], 120)
    if d.get("password"):
        if len(d["password"]) < 8:
            return err("La contraseña debe tener al menos 8 caracteres")
        u.set_password(d["password"])
    db.session.commit()
    return jsonify(user=u.to_dict())


@bp.delete("/api/users/<int:uid>")
@admin_required
def delete_user(uid):
    u = db.session.get(User, uid)
    if not u:
        return err("Usuario no encontrado", 404)
    if u.id == g.user.id or u.role == "ADMIN":
        return err("No se puede eliminar a la administradora", 403)
    if StockMovement.query.filter_by(user_id=uid).first() or StockControl.query.filter_by(user_id=uid).first():
        return err("El usuario tiene historial de movimientos; para conservar la trazabilidad bloquealo en lugar de eliminarlo", 409)
    db.session.delete(u)
    db.session.commit()
    return jsonify(ok=True)
