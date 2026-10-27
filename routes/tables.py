"""Tablas de datos: vista resumida de lo que PALOU guarda de los Excel de TOTVS."""
from flask import Blueprint, jsonify
from sqlalchemy import case, func
from extensions import db
from models import ImportLog, Product, ProductGroup, ProductType, Stock, Supplier, User, Warehouse
from utils import err, login_required

bp = Blueprint("tables", __name__)

# clave -> (nombre, tipo de importación que la alimenta, campos que PALOU guarda)
TABLES = {
    "products": ("Productos", "products", ["Código", "Descripción", "Tipo", "Grupo", "Unidad", "Punto de pedido",
                                           "Proveedor estándar", "Exige lote"]),
    "suppliers": ("Proveedores", "suppliers", ["Código", "Razón social", "Nombre de fantasía", "CUIT/CUIL", "E-mail",
                                               "Teléfono", "Contacto", "Bloqueado"]),
    "warehouses": ("Depósitos", "catalogs", ["Código", "Descripción"]),
    "types": ("Tipos", "catalogs", ["Código", "Descripción"]),
    "groups": ("Grupos", "catalogs", ["Código", "Descripción"]),
    "imports": ("Importaciones", None, []),
}
KIND_LABEL = {"catalogs": "Depósitos, tipos y grupos", "suppliers": "Proveedores", "products": "Productos",
              "stock": "Stock (saldos)"}


def _logs():
    return ImportLog.query.order_by(ImportLog.created_at.desc(), ImportLog.id.desc())


@bp.get("/api/tables")
@login_required
def tables_index():
    counts = {"products": Product.query.count(), "suppliers": Supplier.query.count(),
              "warehouses": Warehouse.query.count(), "types": ProductType.query.count(),
              "groups": ProductGroup.query.count(), "imports": ImportLog.query.count()}
    users = {u.id: u.name for u in User.query}
    last = {}
    for log in _logs():
        last.setdefault(log.kind, log)
    out = []
    for key, (label, kind, fields) in TABLES.items():
        log = last.get(kind) if kind else None
        out.append({"key": key, "label": label, "count": counts[key], "fields": fields, "kept": len(fields),
                    "last_import": None if not log else {
                        "filename": log.filename, "rows": log.rows, "source_columns": log.source_columns,
                        "applied": log.applied, "created_at": log.created_at.isoformat(),
                        "user": users.get(log.user_id, "")}})
    return jsonify(tables=out)


@bp.get("/api/tables/<key>")
@login_required
def table_rows(key):
    if key not in TABLES:
        return err("Tabla inexistente", 404)
    if key == "products":
        sup = {s.code: s.name for s in Supplier.query}
        tn = {t.code: t.description for t in ProductType.query}
        gn = {g.code: g.description for g in ProductGroup.query}
        rows = [{"id": p.id, "code": p.code, "description": p.description, "type": tn.get(p.type, p.type),
                 "group": gn.get(p.group, p.group), "unit": p.unit, "reorder_point": p.reorder_point,
                 "supplier": p.standard_supplier, "supplier_name": sup.get(p.standard_supplier),
                 "lot_required": p.lot_required, "active": p.active} for p in Product.query.order_by(Product.code)]
    elif key == "suppliers":
        rows = [s.to_dict() for s in Supplier.query.order_by(Supplier.code)]
    elif key == "warehouses":
        agg = {wid: (n, q) for wid, n, q in db.session.query(
            Stock.warehouse_id, func.sum(case((Stock.quantity > 0, 1), else_=0)),
            func.coalesce(func.sum(Stock.quantity), 0)).group_by(Stock.warehouse_id).all()}
        rows = [{**w.to_dict(), "stock_products": int(agg.get(w.id, (0, 0))[0] or 0),
                 "stock_units": float(agg.get(w.id, (0, 0))[1] or 0)} for w in Warehouse.query.order_by(Warehouse.code)]
    elif key in ("types", "groups"):
        model, col = (ProductType, Product.type) if key == "types" else (ProductGroup, Product.group)
        cnt = dict(db.session.query(col, func.count(Product.id)).group_by(col).all())
        rows = [{"code": m.code, "name": m.description, "products": cnt.get(m.code, 0)}
                for m in model.query.order_by(model.code)]
    else:  # imports
        users = {u.id: u.name for u in User.query}
        rows = [{"id": l.id, "created_at": l.created_at.isoformat(), "kind": l.kind,
                 "kind_label": KIND_LABEL.get(l.kind, l.kind), "filename": l.filename, "rows": l.rows,
                 "source_columns": l.source_columns, "applied": l.applied, "user": users.get(l.user_id, "")}
                for l in _logs().limit(500)]
    return jsonify(rows=rows)