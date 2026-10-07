from flask import Blueprint, request, jsonify
from models import StockMovement
from utils import login_required

bp = Blueprint("movements", __name__)


@bp.get("/api/movements")
@login_required
def list_movements():
    q = StockMovement.query
    t = request.args.get("type")
    if t in ("IN", "OUT"):
        q = q.filter_by(movement_type=t)
    if request.args.get("status") in ("PENDING", "PROCESSED"):
        q = q.filter_by(sync_status=request.args["status"])
    limit = min(int(request.args.get("limit", 50)) if request.args.get("limit", "50").isdigit() else 50, 500)
    rows = q.order_by(StockMovement.created_at.desc(), StockMovement.id.desc()).limit(limit)
    return jsonify(movements=[m.to_dict() for m in rows])


@bp.get("/api/movements/pending")
@login_required
def pending():
    rows = StockMovement.query.filter_by(sync_status="PENDING").order_by(StockMovement.created_at)
    return jsonify(movements=[m.to_dict() for m in rows])
