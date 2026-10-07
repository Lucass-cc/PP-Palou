import csv, io
from datetime import datetime
from flask import Blueprint, request, jsonify, Response
from extensions import db
from models import StockMovement
from utils import err, login_required

bp = Blueprint("sync", __name__)
HEADER = ["id_movimiento", "fecha", "tipo", "codigo_producto", "unidad", "cantidad", "deposito", "lote", "usuario", "observacion"]


def _safe(v):  # evita inyección de fórmulas al abrir el CSV en planillas
    v = "" if v is None else str(v)
    return "'" + v if v[:1] in ("=", "+", "-", "@") else v


@bp.post("/api/sync/csv")
@login_required
def sync_csv():
    """confirm=false -> genera y descarga el CSV (no modifica nada).
    confirm=true  -> marca como PROCESSED los movimientos pendientes seleccionados (no borra historial)."""
    d = request.get_json(silent=True) or {}
    ids = d.get("ids")
    if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
        return err("Seleccioná al menos un movimiento")
    rows = (StockMovement.query.filter(StockMovement.id.in_(ids), StockMovement.sync_status == "PENDING")
            .order_by(StockMovement.created_at).all())
    if not rows:
        return err("No hay movimientos pendientes en la selección", 404)
    if d.get("confirm") is True:
        now = datetime.utcnow()
        for m in rows:
            m.sync_status, m.processed_at = "PROCESSED", now
        db.session.commit()
        return jsonify(processed=len(rows))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(HEADER)
    for m in rows:
        w.writerow([m.id, m.created_at.strftime("%Y-%m-%d %H:%M:%S"), m.movement_type, _safe(m.product.code),
                    _safe(m.product.unit), m.quantity, _safe(m.warehouse.name), _safe(m.lot), _safe(m.user.name),
                    _safe(m.observation)])
    name = f"palou_movimientos_{datetime.utcnow():%Y%m%d_%H%M%S}.csv"
    return Response("\ufeff" + buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={name}"})
