import os
from extensions import db
from models import User, Product, Warehouse, Stock


def seed():
    """Datos iniciales (solo si la base está vacía). Cambiá las contraseñas en el primer ingreso."""
    if User.query.first():
        return
    admin = User(name="Camila", email="camila", role="ADMIN", status="ACTIVE")
    admin.set_password(os.environ.get("PALOU_ADMIN_PASSWORD", "Camila2026!"))
    op = User(name="Operador de prueba", email="operador", role="OPERATOR", status="ACTIVE")
    op.set_password(os.environ.get("PALOU_OPERATOR_PASSWORD", "Operador2026!"))
    wh = Warehouse(name="Depósito producción", description="Depósito de producción")
    p = Product(code="TORN-M10", unit="UN", description="Tornillo M10 × 30mm", type="Materia prima",
                group="Bulonería", reorder_point=10, lot_required=False, active=True)
    db.session.add_all([admin, op, wh, p])
    db.session.flush()
    db.session.add(Stock(product_id=p.id, warehouse_id=wh.id, quantity=0, lot="L-2026-05"))
    db.session.commit()
