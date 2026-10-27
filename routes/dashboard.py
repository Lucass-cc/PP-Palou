from flask import Blueprint, jsonify
from sqlalchemy import func
from extensions import db
from models import Product, Stock, StockMovement
from utils import login_required

bp = Blueprint("dashboard", __name__)


@bp.get("/api/dashboard")

@login_required
def dashboard():
    low = (Stock.query.join(Product).filter(Product.active.is_(True), Stock.quantity < Product.reorder_point)
           .order_by(Product.code).all())
    wh_count = (db.session.query(func.count(func.distinct(Stock.warehouse_id)))
                .select_from(Stock).join(Product, Product.id == Stock.product_id)
                .filter(Product.active.is_(True)).scalar() or 0)
    return jsonify(
        active_products=Product.query.filter_by(active=True).count(),
        warehouses_count=wh_count,
        low_stock_count=len({s.product_id for s in low}),   # productos distintos
        pending_count=StockMovement.query.filter_by(sync_status="PENDING").count(),
        low_stock=[s.to_dict() for s in low])               # una fila por producto y depósito