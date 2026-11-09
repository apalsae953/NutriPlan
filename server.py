"""
Servidor NutriPlan — Sincronización en tiempo real sin cuentas
Cada familia es una "sala" con un código. Quien tenga el código o el enlace
entra en la misma familia y comparte listas de la compra, recetas, dietas y
miembros, sin registrarse ni usar contraseñas.

Control de versiones optimista: cada guardado indica sobre qué versión se hizo
(baseVersion). Si otra persona guardó antes, se responde 409 con los datos
actuales y el cliente fusiona los cambios antes de volver a guardar.
"""

import os
import re
import json
import sqlite3
import secrets
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", "3000"))
HOST = os.environ.get("HOST", "0.0.0.0")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("NUTRIPLAN_DB", os.path.join(BASE_DIR, "nutriplan.db"))

# Colecciones que se guardan por familia (cada una en su columna <nombre>_json)
COLECCIONES = ("dietas", "comidas", "compra", "rapida", "historial", "miembros")

MAX_BODY = 5 * 1024 * 1024  # 5 MB por petición es de sobra para una familia
CODIGO_VALIDO = re.compile(r"^[A-Z0-9]{4,12}$")

# Archivos que nunca se sirven como estáticos
NO_SERVIR = {".db", ".py", ".pyc", ".sqlite", ".sqlite3"}


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
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
    # Migración: añadir columnas de colecciones nuevas en bases de datos antiguas
    columnas = {row[1] for row in conn.execute("PRAGMA table_info(salas)")}
    for col in COLECCIONES:
        if f"{col}_json" not in columnas:
            conn.execute(f"ALTER TABLE salas ADD COLUMN {col}_json TEXT DEFAULT '[]'")
    conn.commit()
    conn.close()


def generar_codigo_sala():
    # 6 caracteres alfanuméricos fáciles de escribir (sin 0/O ni 1/I)
    caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(caracteres) for _ in range(6))


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def cargar_json(texto):
    try:
        valor = json.loads(texto or "[]")
        return valor if isinstance(valor, list) else []
    except ValueError:
        return []


def sala_a_dict(row):
    sala = {
        "codigo": row["codigo"],
        "nombre": row["nombre"],
        "descripcion": row["descripcion"] or "",
        "version": row["version"],
        "actualizado_en": row["actualizado_en"],
    }
    for col in COLECCIONES:
        sala[col] = cargar_json(row[f"{col}_json"])
    return sala


def texto_corto(valor, maximo):
    return str(valor or "").strip()[:maximo]


class NutriPlanHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # El sondeo de versión llega cada pocos segundos: no llenar la consola con él
    def log_message(self, format, *args):
        if "/version" in self.path:
            return
        super().log_message(format, *args)

    def end_headers(self):
        # Los estáticos se revalidan siempre para que las actualizaciones lleguen al momento
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def responder_json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(data)

    def codigo_de_ruta(self, path):
        partes = path.strip("/").split("/")
        if len(partes) < 3:
            return None
        codigo = partes[2].upper().strip()
        return codigo if CODIGO_VALIDO.match(codigo) else None

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        if path.startswith("/api/sala/"):
            codigo = self.codigo_de_ruta(path)
            if not codigo:
                return self.responder_json(400, {"error": "Código no válido"})

            conn = get_db()
            try:
                # Comprobación ligera de versión (para el sondeo periódico)
                if path.endswith("/version"):
                    row = conn.execute(
                        "SELECT version, actualizado_en FROM salas WHERE codigo = ?", (codigo,)
                    ).fetchone()
                    if not row:
                        return self.responder_json(404, {"error": "Familia no encontrada"})
                    return self.responder_json(200, {
                        "ok": True,
                        "version": row["version"],
                        "actualizado_en": row["actualizado_en"],
                    })

                row = conn.execute("SELECT * FROM salas WHERE codigo = ?", (codigo,)).fetchone()
                if not row:
                    return self.responder_json(404, {"error": "No hay ninguna familia con ese código"})
                return self.responder_json(200, {"ok": True, "sala": sala_a_dict(row)})
            finally:
                conn.close()

        if path.startswith("/api/"):
            return self.responder_json(404, {"error": "Ruta no encontrada"})

        # No exponer la base de datos ni el código del servidor
        if os.path.splitext(path)[1].lower() in NO_SERVIR or "__pycache__" in path or "/." in path:
            self.send_error(404)
            return

        return super().do_GET()

    def leer_payload(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length > MAX_BODY:
            return None
        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            payload = json.loads(body)
            return payload if isinstance(payload, dict) else {}
        except ValueError:
            return {}

    def do_POST(self):
        path = urlparse(self.path).path
        payload = self.leer_payload()
        if payload is None:
            return self.responder_json(413, {"error": "Los datos son demasiado grandes"})

        # Crear nueva sala compartida (sin cuenta)
        if path == "/api/sala/crear":
            nombre = texto_corto(payload.get("nombre"), 80) or "Mi familia"
            descripcion = texto_corto(payload.get("descripcion"), 300)
            valores = {
                col: json.dumps(payload.get(col) if isinstance(payload.get(col), list) else [], ensure_ascii=False)
                for col in COLECCIONES
            }

            conn = get_db()
            try:
                codigo = generar_codigo_sala()
                while conn.execute("SELECT 1 FROM salas WHERE codigo = ?", (codigo,)).fetchone():
                    codigo = generar_codigo_sala()

                columnas = ", ".join(f"{col}_json" for col in COLECCIONES)
                huecos = ", ".join("?" for _ in COLECCIONES)
                conn.execute(
                    f"INSERT INTO salas (codigo, nombre, descripcion, {columnas}, version) "
                    f"VALUES (?, ?, ?, {huecos}, 1)",
                    (codigo, nombre, descripcion, *[valores[c] for c in COLECCIONES]),
                )
                conn.commit()
            finally:
                conn.close()

            return self.responder_json(201, {
                "ok": True,
                "codigo": codigo,
                "nombre": nombre,
                "descripcion": descripcion,
                "version": 1,
            })

        # Guardar cambios en una sala compartida
        if path.startswith("/api/sala/") and path.endswith("/guardar"):
            codigo = self.codigo_de_ruta(path)
            if not codigo:
                return self.responder_json(400, {"error": "Código no válido"})

            # Solo se actualizan las colecciones que vienen en la petición
            sets, valores = [], []
            for col in COLECCIONES:
                if isinstance(payload.get(col), list):
                    sets.append(f"{col}_json = ?")
                    valores.append(json.dumps(payload[col], ensure_ascii=False))
            if isinstance(payload.get("nombre"), str) and payload["nombre"].strip():
                sets.append("nombre = ?")
                valores.append(texto_corto(payload["nombre"], 80))
            if isinstance(payload.get("descripcion"), str):
                sets.append("descripcion = ?")
                valores.append(texto_corto(payload["descripcion"], 300))
            sets.append("version = version + 1")
            sets.append("actualizado_en = CURRENT_TIMESTAMP")

            base_version = payload.get("baseVersion")
            condicion = "codigo = ?"
            params = [*valores, codigo]
            if isinstance(base_version, int):
                condicion += " AND version = ?"
                params.append(base_version)

            conn = get_db()
            try:
                cur = conn.execute(f"UPDATE salas SET {', '.join(sets)} WHERE {condicion}", params)
                conn.commit()
                row = conn.execute("SELECT * FROM salas WHERE codigo = ?", (codigo,)).fetchone()
            finally:
                conn.close()

            if not row:
                return self.responder_json(404, {"error": "La familia no existe"})
            if cur.rowcount == 0:
                # Alguien guardó antes: devolver el estado actual para fusionar
                return self.responder_json(409, {"error": "Conflicto de versión", "sala": sala_a_dict(row)})

            return self.responder_json(200, {"ok": True, "version": row["version"]})

        return self.responder_json(404, {"error": "Ruta no encontrada"})


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), NutriPlanHandler)
    print(f"Servidor NutriPlan activo en http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
