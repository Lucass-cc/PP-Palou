# PALOU — CONTROL DE STOCK
    python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    python app.py        # http://127.0.0.1:5000
Usuarios iniciales: `camila` / `Camila2026!` (ADMIN) y `operador` / `Operador2026!`. Cambiá las claves
(variables `PALOU_ADMIN_PASSWORD`, `PALOU_OPERATOR_PASSWORD` antes del primer arranque) y definí `SECRET_KEY` en producción.
Cambiar de base: `DATABASE_URL=postgresql://...`. El token de recuperación de contraseña se imprime en el log (aún sin email).
