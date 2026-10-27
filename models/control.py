from datetime import datetime
from extensions import db


class StockControl(db.Model):
    """Registro de controles de stock (conteos). No borra ni pisa el historial de movimientos."""
    __tablename__ = "stock_controls"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    control_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    system_quantity = db.Column(db.Float)    # cantidad que tenía el sistema
    counted_quantity = db.Column(db.Float)   # cantidad contada físicamente
    observation = db.Column(db.Text)