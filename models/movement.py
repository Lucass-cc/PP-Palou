from datetime import datetime
from extensions import db


class StockMovement(db.Model):
    __tablename__ = "stock_movements"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    movement_type = db.Column(db.String(3), nullable=False)  # IN / OUT
    lot = db.Column(db.String(60))
    observation = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    sync_status = db.Column(db.String(10), nullable=False, default="PENDING", index=True)  # PENDING / PROCESSED
    processed_at = db.Column(db.DateTime)
    product = db.relationship("Product")
    warehouse = db.relationship("Warehouse")
    user = db.relationship("User")

    def to_dict(self):
        return {"id": self.id, "product_id": self.product_id, "code": self.product.code,
                "description": self.product.description, "unit": self.product.unit,
                "warehouse_id": self.warehouse_id, "warehouse": self.warehouse.name,
                "user_id": self.user_id, "user": self.user.name, "quantity": self.quantity,
                "movement_type": self.movement_type, "lot": self.lot, "observation": self.observation,
                "created_at": self.created_at.isoformat(), "sync_status": self.sync_status}
