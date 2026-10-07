from extensions import db


class Warehouse(db.Model):
    __tablename__ = "warehouses"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255))

    def to_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description}


class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    unit = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(60), nullable=False)
    group = db.Column("group_name", db.String(60), nullable=False)
    reorder_point = db.Column(db.Float, nullable=False, default=0)
    standard_supplier = db.Column(db.String(120))
    lot_required = db.Column(db.Boolean, nullable=False, default=False)
    observation = db.Column(db.Text)
    active = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        return {"id": self.id, "code": self.code, "unit": self.unit, "description": self.description,
                "type": self.type, "group": self.group, "reorder_point": self.reorder_point,
                "standard_supplier": self.standard_supplier, "lot_required": self.lot_required,
                "observation": self.observation, "active": self.active}
