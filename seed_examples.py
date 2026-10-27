"""Productos de EJEMPLO (códigos y cantidades inventados). Se puede correr varias veces sin duplicar."""
from app import create_app
from extensions import db
from models import Product, Warehouse, Stock

# código, descripción, tipo, grupo, punto de pedido, cantidad, código de depósito
EJEMPLOS = [
    ("TORN-M10", "Tornillo M10 × 30mm", "MP", "0007", 10, 0, "02"),
    ("ARAN-M10", "Arandela plana M10", "MP", "0007", 25, 8, "02"),
    ("RODA-075", "Rodamiento rígido 6204", "II", "0004", 8, 6, "04"),
    ("TUER-M10", "Tuerca hexagonal M10", "MP", "0007", 50, 140, "01"),
    ("BULO-M12", "Bulón hexagonal M12 × 60mm", "MP", "0007", 30, 75, "01"),
    ("CADE-08B", "Cadena de rodillos 08B", "II", "0015", 4, 12, "04"),
]

app = create_app()
with app.app_context():
    for code, desc, tipo, grupo, rp, qty, dep in EJEMPLOS:
        wh = Warehouse.query.filter_by(code=dep).first()
        p = Product.query.filter_by(code=code).first()
        if not p:
            p = Product(code=code, unit="UN", description=desc, type=tipo, group=grupo,
                        reorder_point=rp, lot_required=False, active=True)
            db.session.add(p)
            db.session.flush()
        if not Stock.query.filter_by(product_id=p.id, warehouse_id=wh.id).first():
            db.session.add(Stock(product_id=p.id, warehouse_id=wh.id, quantity=qty))
    db.session.commit()
    print("Ejemplos cargados.")