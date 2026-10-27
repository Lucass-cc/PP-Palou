from datetime import datetime
from extensions import db


class ImportLog(db.Model):
    """Registro de cada importación confirmada desde Excel (alimenta la sección Tablas)."""
    __tablename__ = "import_logs"
    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(20), nullable=False)        # catalogs / suppliers / products / stock
    filename = db.Column(db.String(120))
    rows = db.Column(db.Integer, nullable=False, default=0)             # filas leídas del archivo
    source_columns = db.Column(db.Integer, nullable=False, default=0)   # columnas que traía el archivo
    applied = db.Column(db.Integer, nullable=False, default=0)          # filas nuevas + actualizadas
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)