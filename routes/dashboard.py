from flask import Blueprint, jsonify
from models import Product, Stock, StockMovement
from utils import login_required

bp = Blueprint("dashboard", __name__)


@bp.get("/api/dashboard")
@login_required
def dashboard():
    low = (Stock.query.join(Product).filter(Product.active.is_(True), Stock.quantity < Product.reorder_point)
           .order_by(Product.code).all())
    recent = StockMovement.query.order_by(StockMovement.created_at.desc(), StockMovement.id.desc()).limit(8)
    return jsonify(
        active_products=Product.query.filter_by(active=True).count(),
        low_stock_count=len(low),
        pending_count=StockMovement.query.filter_by(sync_status="PENDING").count(),
        recent_movements=[m.to_dict() for m in recent],
        low_stock=[s.to_dict() for s in low[:10]])
