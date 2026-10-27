import os
from extensions import db
from catalogs import DEPOSITOS, TIPOS, GRUPOS
from models import User, Product, Warehouse, ProductType, ProductGroup, Stock


def sync_catalogs():
    """Crea los depósitos, tipos y grupos que falten. No pisa lo ya cargado (puede venir de un Excel)."""
    for code, name in DEPOSITOS:
        if not Warehouse.query.filter_by(code=code).first():
            db.session.add(Warehouse(code=code, name=name))
    for code, desc in TIPOS:
        if not db.session.get(ProductType, code):
            db.session.add(ProductType(code=code, description=desc))
    for code, desc in GRUPOS:
        if not db.session.get(ProductGroup, code):
            db.session.add(ProductGroup(code=code, description=desc))
    db.session.commit()


def seed():
    sync_catalogs()
    if User.query.first():
        return
    admin = User(name="Camila Palou", email="camila", role="ADMIN", status="ACTIVE")
    admin.set_password(os.environ.get("PALOU_ADMIN_PASSWORD", "Camila2026!"))
    op = User(name="Operador de prueba", email="operador", role="OPERATOR", status="ACTIVE")
    op.set_password(os.environ.get("PALOU_OPERATOR_PASSWORD", "Operador2026!"))
    p = Product(code="TORN-M10", unit="UN", description="Tornillo M10 × 30mm", type="MP", group="0007",
                reorder_point=10, lot_required=False, active=True)
    db.session.add_all([admin, op, p])
    db.session.flush()
    wh = Warehouse.query.filter_by(code="02").first()  # DEPOSITO PRODUCCION
    db.session.add(Stock(product_id=p.id, warehouse_id=wh.id, quantity=0, lot="L-2026-05"))
    db.session.commit()