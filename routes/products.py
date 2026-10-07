from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_
from extensions import db
from models import Product, Warehouse, Stock, StockMovement
from utils import err, login_required, parse_qty, clean

bp = Blueprint("products", __name__)


@bp.get("/api/products")
@login_required
def list_products():
    q = Product.query
    if request.args.get("active", "1") == "1":
        q = q.filter_by(active=True)
    s = (request.args.get("q") or "").strip()
    if s:
        like = f"%{s}%"
        q = q.filter(or_(Product.code.ilike(like), Product.description.ilike(like)))
    return jsonify(products=[p.to_dict() for p in q.order_by(Product.code).limit(200)])


@bp.get("/api/products/meta")
@login_required
def meta():
    col = lambda c: [r[0] for r in db.session.query(c).filter(c.isnot(None)).distinct().order_by(c)]
    return jsonify(groups=col(Product.group), suppliers=col(Product.standard_supplier),
                   types=col(Product.type), units=col(Product.unit),
                   warehouses=[w.to_dict() for w in Warehouse.query.order_by(Warehouse.name)])


@bp.get("/api/products/<int:pid>")
@login_required
def get_product(pid):
    p = db.session.get(Product, pid)
    return jsonify(product=p.to_dict()) if p else err("Producto no encontrado", 404)


def _fields(d, partial=False):
    """Valida y normaliza los campos del producto. Devuelve (data, error)."""
    data = {}
    for k, label, ln in (("code", "Código", 40), ("unit", "Unidad", 20), ("description", "Descripción", 255),
                         ("type", "Tipo", 60), ("group", "Grupo", 60)):
        if k in d or not partial:
            v = clean(d.get(k), ln)
            if not v:
                return None, f"{label} es obligatorio"
            data[k] = v.upper() if k == "code" else v
    if "reorder_point" in d or not partial:
        rp = parse_qty(d.get("reorder_point"), allow_zero=True)
        if rp is None:
            return None, "Punto de reposición inválido (≥ 0)"
        data["reorder_point"] = rp
    if "standard_supplier" in d:
        data["standard_supplier"] = clean(d.get("standard_supplier"), 120)
    if "observation" in d:
        data["observation"] = clean(d.get("observation"), 2000)
    if "lot_required" in d:
        data["lot_required"] = bool(d.get("lot_required"))
    if "active" in d:
        data["active"] = bool(d.get("active"))
    return data, None


@bp.post("/api/products")
@login_required
def create_product():
    d = request.get_json(silent=True) or {}
    data, e = _fields(d)
    if e:
        return err(e)
    wh = db.session.get(Warehouse, d.get("warehouse_id")) if isinstance(d.get("warehouse_id"), int) else None
    if not wh:
        return err("Depósito inexistente")
    qty = parse_qty(d.get("quantity", 0), allow_zero=True)
    if qty is None:
        return err("Cantidad inválida")
    lot = clean(d.get("lot"), 60)
    if data.get("lot_required") and qty > 0 and not lot:
        return err("El producto requiere lote")
    if Product.query.filter_by(code=data["code"]).first():
        return err("Ya existe un producto con ese código", 409)
    try:
        p = Product(**data)
        db.session.add(p)
        db.session.flush()
        db.session.add(Stock(product_id=p.id, warehouse_id=wh.id, quantity=qty, lot=lot))
        if qty > 0:  # el stock inicial queda trazado como movimiento pendiente
            db.session.add(StockMovement(product_id=p.id, warehouse_id=wh.id, user_id=g.user.id, quantity=qty,
                                         movement_type="IN", lot=lot, observation="Stock inicial (alta de producto)"))
        db.session.commit()
    except Exception:
        db.session.rollback()
        return err("No se pudo crear el producto", 500)
    return jsonify(product=p.to_dict()), 201


@bp.put("/api/products/<int:pid>")
@login_required
def update_product(pid):
    p = db.session.get(Product, pid)
    if not p:
        return err("Producto no encontrado", 404)
    data, e = _fields(request.get_json(silent=True) or {}, partial=True)
    if e:
        return err(e)
    if "code" in data and Product.query.filter(Product.code == data["code"], Product.id != pid).first():
        return err("Ya existe un producto con ese código", 409)
    for k, v in data.items():
        setattr(p, k, v)
    db.session.commit()
    return jsonify(product=p.to_dict())
