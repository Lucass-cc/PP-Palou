import math
from functools import wraps
from flask import session, jsonify, request, redirect, g
from extensions import db
from models.user import User


def current_user():
    uid = session.get("uid")
    u = db.session.get(User, uid) if uid else None
    return u if u and u.status == "ACTIVE" else None


def err(msg, code=400, **extra):
    return jsonify(error=msg, **extra), code


def _deny(api_msg, code, page_target):
    if request.path.startswith("/api/"):
        return err(api_msg, code)
    return redirect(page_target)


def login_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        u = current_user()
        if not u:
            session.pop("uid", None)
            return _deny("No autenticado", 401, "/login")
        g.user = u
        return f(*a, **kw)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        u = current_user()
        if not u:
            return _deny("No autenticado", 401, "/login")
        if u.role != "ADMIN":  # autorización siempre validada en el servidor
            return _deny("Permiso denegado", 403, "/dashboard")
        g.user = u
        return f(*a, **kw)
    return wrapper


def parse_qty(v, allow_zero=False):
    try:
        q = float(v)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(q) or q < 0 or (q == 0 and not allow_zero):
        return None
    return round(q, 3)


def clean(v, maxlen=255):
    v = (v or "").strip() if isinstance(v, str) else ""
    return v[:maxlen] or None
