"""
Servidor NutriPlan — Sincronización en tiempo real sin cuentas
Permite crear y compartir partidas mediante un código o enlace directo,
para que varias personas puedan editar simultáneamente la compra, comidas y dietas
sin necesidad de registrarse ni usar contraseñas.
"""

import os
import sys
import json
import sqlite3
import secrets
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "nutriplan.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS salas (
            codigo TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            descripcion TEXT DEFAULT '',
            dietas_json TEXT DEFAULT '[]',
            comidas_json TEXT DEFAULT '[]',
            compra_json TEXT DEFAULT '[]',
            version INTEGER DEFAULT 1,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def generar_codigo_sala():
    # 6 caracteres alfanuméricos fáciles de escribir (ej: CASA24, PLAN88)
    caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(caracteres) for _ in range(6))

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

class NutriPlanHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def responder_json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Comprobar versión de una sala (para polling ligero cada 2.5s)
        if path.startswith("/api/sala/") and path.endswith("/version"):
            codigo = path.split("/")[3].upper().strip()
            conn = get_db()
            row = conn.execute("SELECT version, actualizado_en FROM salas WHERE codigo = ?", (codigo,)).fetchone()
            conn.close()
            if not row:
                return self.responder_json(404, {"error": "Partida no encontrada"})
            return self.responder_json(200, {
                "ok": True,
                "version": row["version"],
                "actualizado_en": row["actualizado_en"]
            })

        # Obtener datos completos de una sala
        elif path.startswith("/api/sala/"):
            codigo = path.split("/")[3].upper().strip()
            conn = get_db()
            row = conn.execute("SELECT * FROM salas WHERE codigo = ?", (codigo,)).fetchone()
            conn.close()
            if not row:
                return self.responder_json(404, {"error": "Partida no encontrada con ese código"})

            return self.responder_json(200, {
                "ok": True,
                "sala": {
                    "codigo": row["codigo"],
                    "nombre": row["nombre"],
                    "descripcion": row["descripcion"],
                    "dietas": json.loads(row["dietas_json"] or "[]"),
                    "comidas": json.loads(row["comidas_json"] or "[]"),
                    "compra": json.loads(row["compra_json"] or "[]"),
                    "version": row["version"],
                    "actualizado_en": row["actualizado_en"]
                }
            })

        # Para cualquier otra ruta, servir archivos estáticos (HTML, CSS, JS)
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        # Crear nueva sala compartida (sin cuenta)
        if path == "/api/sala/crear":
            nombre = payload.get("nombre", "").strip() or "Partida Compartida"
            descripcion = payload.get("descripcion", "").strip()
            dietas = json.dumps(payload.get("dietas", []))
            comidas = json.dumps(payload.get("comidas", []))
            compra = json.dumps(payload.get("compra", []))

            conn = get_db()
            # Generar código único que no exista
            codigo = generar_codigo_sala()
            while conn.execute("SELECT 1 FROM salas WHERE codigo = ?", (codigo,)).fetchone():
                codigo = generar_codigo_sala()

            conn.execute("""
                INSERT INTO salas (codigo, nombre, descripcion, dietas_json, comidas_json, compra_json, version)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            """, (codigo, nombre, descripcion, dietas, comidas, compra))
            conn.commit()
            conn.close()

            return self.responder_json(201, {
                "ok": True,
                "codigo": codigo,
                "nombre": nombre,
                "descripcion": descripcion
            })

        # Guardar cambios en una sala compartida (sincronizar compra, comidas, dietas)
        elif path.startswith("/api/sala/") and path.endswith("/guardar"):
            codigo = path.split("/")[3].upper().strip()
            conn = get_db()
            row = conn.execute("SELECT version FROM salas WHERE codigo = ?", (codigo,)).fetchone()
            if not row:
                conn.close()
                return self.responder_json(404, {"error": "La partida no existe"})

            nueva_version = row["version"] + 1
            dietas_json = json.dumps(payload.get("dietas", []))
            comidas_json = json.dumps(payload.get("comidas", []))
            compra_json = json.dumps(payload.get("compra", []))

            conn.execute("""
                UPDATE salas
                SET dietas_json = ?, comidas_json = ?, compra_json = ?, version = ?, actualizado_en = CURRENT_TIMESTAMP
                WHERE codigo = ?
            """, (dietas_json, comidas_json, compra_json, nueva_version, codigo))
            conn.commit()
            conn.close()

            return self.responder_json(200, {
                "ok": True,
                "version": nueva_version
            })

        return self.responder_json(404, {"error": "Ruta no encontrada"})

if __name__ == "__main__":
    init_db()
    server = HTTPServer(('0.0.0.0', PORT), NutriPlanHandler)
    print(f"Servidor NutriPlan activo en http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
