from extensions import db


class Stock(db.Model):
    __tablename__ = "stock"
    __table_args__ = (db.UniqueConstraint("product_id", "warehouse_id", name="uq_stock_prod_wh"),
                      db.CheckConstraint("quantity >= 0", name="ck_stock_nonneg"))
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey("warehouses.id"), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False, default=0)
    lot = db.Column(db.String(60))  # último lote registrado
    last_control_date = db.Column(db.DateTime)
    product = db.relationship("Product")
    warehouse = db.relationship("Warehouse")

    @property
    def low_stock(self):  # regla de negocio: por debajo del punto de reposición
        return self.quantity < self.product.reorder_point

    def to_dict(self):
        p = self.product
        return {"id": self.id, "product_id": p.id, "code": p.code, "description": p.description,
                "type": p.type, "group": p.group, "standard_supplier": p.standard_supplier,
                "unit": p.unit, "warehouse_id": self.warehouse_id, "warehouse": self.warehouse.name,
                "quantity": self.quantity, "reorder_point": p.reorder_point, "lot": self.lot,
                "last_control_date": self.last_control_date.isoformat() if self.last_control_date else None,
                "observation": p.observation, "low_stock": self.low_stock, "active": p.active}
