from datetime import datetime
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_
from extensions import db
from models import Product, Warehouse, Stock, StockMovement, StockControl
from utils import err, login_required, parse_qty, clean

bp = Blueprint("stock", __name__)


@bp.get("/api/stock")
@login_required
def list_stock():
    q = Stock.query.join(Product).join(Warehouse).filter(Product.active.is_(True))
    a = request.args
    if a.get("q"):
        like = f"%{a['q'].strip()}%"
        q = q.filter(or_(Product.code.ilike(like), Product.description.ilike(like)))
    if a.get("group"):
        q = q.filter(Product.group == a["group"])
    if a.get("supplier"):
        q = q.filter(Product.standard_supplier == a["supplier"])
    if a.get("warehouse_id", "").isdigit():
        q = q.filter(Stock.warehouse_id == int(a["warehouse_id"]))
    if a.get("product_id", "").isdigit():
        q = q.filter(Stock.product_id == int(a["product_id"]))
    if a.get("low") == "1":
        q = q.filter(Stock.quantity < Product.reorder_point)
    return jsonify(stock=[s.to_dict() for s in q.order_by(Product.code, Warehouse.name)])


@bp.post("/api/stock/movement")
@login_required
def movement():
    d = request.get_json(silent=True) or {}
    mtype = d.get("movement_type")
    if mtype not in ("IN", "OUT"):
        return err("Tipo de movimiento inválido")
    p = db.session.get(Product, d.get("product_id")) if isinstance(d.get("product_id"), int) else None
    if not p or not p.active:
        return err("Producto inexistente o inactivo")
    wh = db.session.get(Warehouse, d.get("warehouse_id")) if isinstance(d.get("warehouse_id"), int) else None
    if not wh:
        return err("Depósito inexistente")
    qty = parse_qty(d.get("quantity"))
    if qty is None:
        return err("La cantidad debe ser mayor que cero")
    lot = clean(d.get("lot"), 60)
    if p.lot_required and not lot:
        return err("Este producto requiere indicar el lote")
    try:  # una sola transacción: stock + movimiento
        st = Stock.query.filter_by(product_id=p.id, warehouse_id=wh.id).first()
        if not st:
            if mtype == "OUT":
                return err("No hay stock de este producto en el depósito", 409)
            st = Stock(product_id=p.id, warehouse_id=wh.id, quantity=0)
            db.session.add(st)
        if mtype == "OUT":
            if qty > st.quantity:
                db.session.rollback()
                return err(f"Stock insuficiente. Disponible: {st.quantity:g} {p.unit}", 409)
            st.quantity = round(st.quantity - qty, 3)
        else:
            st.quantity = round(st.quantity + qty, 3)
        if lot:
            st.lot = lot
        m = StockMovement(product_id=p.id, warehouse_id=wh.id, user_id=g.user.id, quantity=qty,
                          movement_type=mtype, lot=lot, observation=clean(d.get("observation"), 2000),
                          sync_status="PENDING")
        db.session.add(m)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return err("No se pudo registrar el movimiento", 500)
    return jsonify(movement=m.to_dict(), stock=st.to_dict(), low_stock=st.low_stock), 201


@bp.post("/api/stock/control")
@login_required
def control():
    d = request.get_json(silent=True) or {}
    st = Stock.query.filter_by(product_id=d.get("product_id") if isinstance(d.get("product_id"), int) else 0,
                               warehouse_id=d.get("warehouse_id") if isinstance(d.get("warehouse_id"), int) else 0).first()
    if not st:
        return err("No existe stock para ese producto y depósito", 404)
    now = datetime.utcnow()
    db.session.add(StockControl(product_id=st.product_id, warehouse_id=st.warehouse_id, user_id=g.user.id,
                                control_date=now, observation=clean(d.get("observation"), 2000)))
    st.last_control_date = now
    db.session.commit()
    return jsonify(stock=st.to_dict()), 201
