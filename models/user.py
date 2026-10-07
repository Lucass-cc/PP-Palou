from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)  # email o usuario
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(10), nullable=False, default="OPERATOR")  # ADMIN / OPERATOR
    status = db.Column(db.String(10), nullable=False, default="ACTIVE")  # ACTIVE / BLOCKED
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reset_token_hash = db.Column(db.String(64))
    reset_expires = db.Column(db.DateTime)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def to_dict(self):  # nunca expone el hash
        return {"id": self.id, "name": self.name, "email": self.email, "role": self.role,
                "status": self.status, "created_at": self.created_at.isoformat()}
