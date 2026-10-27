from extensions import db


class Warehouse(db.Model):
    __tablename__ = "warehouses"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(4), unique=True, nullable=False)   # código oficial (01, 02, MT…)
    name = db.Column(db.String(80), unique=True, nullable=False)  # descripción oficial
    description = db.Column(db.String(255))

    def to_dict(self):
        return {"id": self.id, "code": self.code, "name": self.name, "description": self.description}


class ProductType(db.Model):
    __tablename__ = "product_types"
    code = db.Column(db.String(4), primary_key=True)
    description = db.Column(db.String(80), nullable=False)

    def to_dict(self):
        return {"code": self.code, "description": self.description}


class ProductGroup(db.Model):
    __tablename__ = "product_groups"
    code = db.Column(db.String(4), primary_key=True)
    description = db.Column(db.String(80), nullable=False)

    def to_dict(self):
        return {"code": self.code, "description": self.description}


class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    unit = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(4), db.ForeignKey("product_types.code"), nullable=False)
    group = db.Column("group_code", db.String(4), db.ForeignKey("product_groups.code"), nullable=False)
    reorder_point = db.Column(db.Float, nullable=False, default=0)
    standard_supplier = db.Column(db.String(120))
    lot_required = db.Column(db.Boolean, nullable=False, default=False)
    observation = db.Column(db.Text)
    active = db.Column(db.Boolean, nullable=False, default=True)
    type_ref = db.relationship("ProductType")
    group_ref = db.relationship("ProductGroup")

    def to_dict(self):
        return {"id": self.id, "code": self.code, "unit": self.unit, "description": self.description,
                "type": self.type, "type_name": self.type_ref.description,
                "group": self.group, "group_name": self.group_ref.description,
                "reorder_point": self.reorder_point, "standard_supplier": self.standard_supplier,
                "lot_required": self.lot_required, "observation": self.observation, "active": self.active}