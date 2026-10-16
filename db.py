"""SQLite helpers for the KFC backend."""
from __future__ import annotations

import json
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from hashlib import scrypt
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "kfc.db"

ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")

PROMO = {"KFC10": 0.1, "BUCKET15": 0.15, "TAPWIN": 0.12, "FRIEND5": 0.05}


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"{salt.hex()}${digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, dig_hex = stored.split("$", 1)
        salt = bytes.fromhex(salt_hex)
        check = _hash_password(password, salt)
        return secrets.compare_digest(check, stored)
    except Exception:
        return False


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db():
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE COLLATE NOCASE,
              phone TEXT NOT NULL DEFAULT '',
              password_hash TEXT NOT NULL,
              created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              kind TEXT NOT NULL DEFAULT 'user',
              created_at INTEGER NOT NULL,
              expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              number TEXT NOT NULL UNIQUE,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              items_json TEXT NOT NULL,
              subtotal REAL NOT NULL,
              discount REAL NOT NULL DEFAULT 0,
              total REAL NOT NULL,
              coupon TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'new',
              delivery TEXT NOT NULL,
              branch TEXT NOT NULL,
              address TEXT NOT NULL DEFAULT '',
              phone TEXT NOT NULL,
              pay TEXT NOT NULL,
              note TEXT NOT NULL DEFAULT '',
              created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS favorites (
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              product_id INTEGER NOT NULL,
              PRIMARY KEY (user_id, product_id)
            );
            CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              kind TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              read INTEGER NOT NULL DEFAULT 0,
              created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS promo_grants (
              user_id INTEGER NOT NULL,
              code TEXT NOT NULL,
              PRIMARY KEY (user_id, code)
            );
            """
        )
        row = conn.execute("SELECT value_json FROM settings WHERE key = 'overrides'").fetchone()
        if not row:
            conn.execute(
                "INSERT INTO settings(key, value_json) VALUES ('overrides', ?)",
                (json.dumps({}),),
            )


def load_catalog_prices() -> dict[int, dict[str, Any]]:
    """Parse js/catalog.js for id/price/name (server-side pricing)."""
    text = (ROOT / "js" / "catalog.js").read_text(encoding="utf-8")
    products: dict[int, dict[str, Any]] = {}
    import re

    for match in re.finditer(
        r"\{\s*id:\s*(\d+)\s*,\s*name:\s*\"((?:\\.|[^\"])*)\"\s*,\s*description:\s*\"((?:\\.|[^\"])*)\"\s*,\s*price:\s*([0-9.]+)",
        text,
    ):
        pid = int(match.group(1))
        products[pid] = {
            "id": pid,
            "name": match.group(2).replace('\\"', '"'),
            "price": float(match.group(4)),
        }
    return products


def get_overrides(conn: sqlite3.Connection) -> dict[str, Any]:
    row = conn.execute("SELECT value_json FROM settings WHERE key = 'overrides'").fetchone()
    if not row:
        return {}
    try:
        return json.loads(row["value_json"]) or {}
    except Exception:
        return {}


def set_overrides(conn: sqlite3.Connection, data: dict[str, Any]) -> None:
    conn.execute(
        "INSERT INTO settings(key, value_json) VALUES('overrides', ?) "
        "ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
        (json.dumps(data),),
    )


def product_price(conn: sqlite3.Connection, catalog: dict[int, dict[str, Any]], product_id: int) -> float | None:
    base = catalog.get(int(product_id))
    if not base:
        return None
    over = get_overrides(conn).get(str(product_id)) or get_overrides(conn).get(product_id)
    if isinstance(over, dict) and over.get("price") is not None:
        return float(over["price"])
    return float(base["price"])


def product_flags(conn: sqlite3.Connection, product_id: int) -> dict[str, bool]:
    over = get_overrides(conn).get(str(product_id)) or get_overrides(conn).get(product_id) or {}
    if not isinstance(over, dict):
        over = {}
    return {
        "soldOut": bool(over.get("soldOut")),
        "hidden": bool(over.get("hidden")),
        "featured": over.get("featured"),
    }


def create_session(conn: sqlite3.Connection, user_id: int, kind: str = "user", days: int = 14) -> str:
    token = secrets.token_urlsafe(32)
    now = int(time.time() * 1000)
    expires = now + days * 24 * 60 * 60 * 1000
    conn.execute(
        "INSERT INTO sessions(token, user_id, kind, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
        (token, user_id, kind, now, expires),
    )
    return token


def session_user(conn: sqlite3.Connection, token: str | None, kind: str = "user") -> sqlite3.Row | None:
    if not token:
        return None
    now = int(time.time() * 1000)
    row = conn.execute(
        """
        SELECT u.*, s.kind AS session_kind FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.kind = ? AND s.expires_at > ?
        """,
        (token, kind, now),
    ).fetchone()
    return row


def admin_session_ok(conn: sqlite3.Connection, token: str | None) -> bool:
    if not token:
        return False
    now = int(time.time() * 1000)
    row = conn.execute(
        "SELECT 1 FROM sessions WHERE token = ? AND kind = 'admin' AND expires_at > ?",
        (token, now),
    ).fetchone()
    return bool(row)


def create_admin_session(conn: sqlite3.Connection) -> str:
    """Admin is not a users-row; use user_id 0 sentinel with a fake ensure."""
    # Ensure a system user exists for FK if needed — use sessions without FK user for admin.
    # Simpler: store admin sessions with user_id pointing to optional system user.
    row = conn.execute("SELECT id FROM users WHERE email = ?", ("admin@local",)).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO users(name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            ("Admin", "admin@local", "", _hash_password(ADMIN_PASSWORD), int(time.time() * 1000)),
        )
        row = conn.execute("SELECT id FROM users WHERE email = ?", ("admin@local",)).fetchone()
    return create_session(conn, int(row["id"]), kind="admin", days=7)


def register_user(conn: sqlite3.Connection, name: str, email: str, phone: str, password: str) -> sqlite3.Row:
    now = int(time.time() * 1000)
    conn.execute(
        "INSERT INTO users(name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (name.strip(), email.strip(), phone.strip(), _hash_password(password), now),
    )
    return conn.execute("SELECT * FROM users WHERE email = ?", (email.strip(),)).fetchone()


def login_user(conn: sqlite3.Connection, email: str, password: str) -> sqlite3.Row | None:
    row = conn.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email.strip(),)).fetchone()
    if not row or row["email"].lower() == "admin@local":
        return None
    if not _verify_password(password, row["password_hash"]):
        return None
    return row


def user_public(row: sqlite3.Row) -> dict[str, Any]:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "phone": row["phone"]}


def sync_order_status(created_at: int, delivery: str, status: str) -> str:
    if status in ("cancelled", "done"):
        return status
    age = int(time.time() * 1000) - int(created_at)
    if age >= 140000:
        return "done"
    if delivery == "delivery" and age >= 80000:
        return "onway"
    if age >= 50000:
        return "ready"
    if age >= 18000:
        return "preparing"
    return "new"


def order_dict(row: sqlite3.Row) -> dict[str, Any]:
    items = json.loads(row["items_json"] or "[]")
    status = sync_order_status(row["created_at"], row["delivery"], row["status"])
    keys = set(row.keys())
    return {
        "id": row["id"],
        "number": row["number"],
        "user_id": row["user_id"],
        "email": row["email"] if "email" in keys else None,
        "items": items,
        "subtotal": row["subtotal"],
        "discount": row["discount"],
        "total": row["total"],
        "coupon": row["coupon"],
        "status": status,
        "delivery": row["delivery"],
        "branch": row["branch"],
        "address": row["address"],
        "phone": row["phone"],
        "pay": row["pay"],
        "note": row["note"],
        "at": row["created_at"],
    }


hash_password = _hash_password
verify_password = _verify_password
