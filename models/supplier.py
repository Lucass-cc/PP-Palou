from extensions import db


class Supplier(db.Model):
    __tablename__ = "suppliers"
    code = db.Column(db.String(10), primary_key=True)   # P00001…
    name = db.Column(db.String(120), nullable=False)    # Razón social
    trade_name = db.Column(db.String(120))              # Nombre de fantasía
    tax_id = db.Column(db.String(20))                   # CUIT/CUIL
    email = db.Column(db.String(120))
    phone = db.Column(db.String(40))
    contact = db.Column(db.String(120))
    blocked = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {"code": self.code, "name": self.name, "trade_name": self.trade_name, "tax_id": self.tax_id,
                "email": self.email, "phone": self.phone, "contact": self.contact, "blocked": self.blocked}