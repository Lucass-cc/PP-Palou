from datetime import datetime
from extensions import db


class StockControl(db.Model):
    """Registro de controles de stock; no toca ni borra el historial de movimientos."""
    __tablename__ = "stock_controls"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    control_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    observation = db.Column(db.Text)
