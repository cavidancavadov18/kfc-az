"""KFC FastAPI app — API + clean URL static pages on :8765."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import db as store

ROOT = Path(__file__).resolve().parent
PAGES = {
    "": "index.html",
    "index": "index.html",
    "menu": "menu.html",
    "offers": "offers.html",
    "about": "about.html",
    "contact": "contact.html",
    "branches": "branches.html",
    "career": "career.html",
    "ingredients": "ingredients.html",
    "login": "login.html",
    "register": "register.html",
    "terms": "terms.html",
    "privacy": "privacy.html",
    "orders": "orders.html",
    "favorites": "favorites.html",
    "admin": "admin.html",
}

COOKIE_USER = "kfc_sid"
COOKIE_ADMIN = "kfc_admin_sid"
CATALOG = store.load_catalog_prices()

app = FastAPI(title="KFC AZ Local API")


@app.on_event("startup")
def _startup() -> None:
    store.init_db()
    global CATALOG
    CATALOG = store.load_catalog_prices()


def _cookie_kwargs() -> dict[str, Any]:
    return {"httponly": True, "samesite": "lax", "path": "/"}


def _user_from_request(request: Request):
    token = request.cookies.get(COOKIE_USER)
    with store.db() as conn:
        return store.session_user(conn, token, kind="user")


def _require_user(request: Request):
    user = _user_from_request(request)
    if not user:
        raise HTTPException(401, "Login required")
    return user


def _require_admin(request: Request) -> None:
    token = request.cookies.get(COOKIE_ADMIN)
    with store.db() as conn:
        if not store.admin_session_ok(conn, token):
            raise HTTPException(401, "Admin login required")


def _persist_order_statuses(conn) -> None:
    rows = conn.execute("SELECT id, created_at, delivery, status FROM orders").fetchall()
    for row in rows:
        nxt = store.sync_order_status(row["created_at"], row["delivery"], row["status"])
        if nxt != row["status"]:
            conn.execute("UPDATE orders SET status = ? WHERE id = ?", (nxt, row["id"]))


# ---- models ----
class RegisterIn(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    password2: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


class AdminLoginIn(BaseModel):
    user: str
    password: str


class OrderItemIn(BaseModel):
    id: int
    qty: int = Field(ge=1, le=99)
    note: str = ""


class OrderIn(BaseModel):
    items: list[OrderItemIn]
    delivery: str
    branch: str
    address: str = ""
    phone: str
    pay: str = "cash"
    note: str = ""
    coupon: str = ""


class PromoIn(BaseModel):
    code: str


class FavIn(BaseModel):
    product_id: int


class MessageIn(BaseModel):
    kind: str
    name: str = ""
    phone: str = ""
    email: str = ""
    restaurant: str = ""
    text: str = ""
    message: str = ""
    position: str = ""
    note: str = ""
    cv: str = ""


class StatusIn(BaseModel):
    status: str


class OverrideIn(BaseModel):
    price: float | None = None
    featured: bool | None = None
    soldOut: bool = False
    hidden: bool = False


# ---- auth ----
@app.post("/api/auth/register")
def auth_register(body: RegisterIn, response: Response):
    name = body.name.strip()
    email = body.email.strip()
    phone = body.phone.strip()
    if not name or not email or not phone or not body.password:
        raise HTTPException(400, "required")
    if len(body.password) < 6:
        raise HTTPException(400, "short")
    if body.password2 is not None and body.password != body.password2:
        raise HTTPException(400, "mismatch")
    with store.db() as conn:
        exists = conn.execute("SELECT 1 FROM users WHERE email = ? COLLATE NOCASE", (email,)).fetchone()
        if exists:
            raise HTTPException(400, "exists")
        user = store.register_user(conn, name, email, phone, body.password)
        token = store.create_session(conn, int(user["id"]), kind="user")
        response.set_cookie(COOKIE_USER, token, **_cookie_kwargs(), max_age=14 * 24 * 3600)
        return {"user": store.user_public(user)}


@app.post("/api/auth/login")
def auth_login(body: LoginIn, response: Response):
    with store.db() as conn:
        user = store.login_user(conn, body.email, body.password)
        if not user:
            raise HTTPException(400, "bad")
        token = store.create_session(conn, int(user["id"]), kind="user")
        response.set_cookie(COOKIE_USER, token, **_cookie_kwargs(), max_age=14 * 24 * 3600)
        return {"user": store.user_public(user)}


@app.post("/api/auth/logout")
def auth_logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_USER)
    if token:
        with store.db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    response.delete_cookie(COOKIE_USER, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def auth_me(request: Request):
    user = _user_from_request(request)
    if not user:
        return {"user": None}
    return {"user": store.user_public(user)}


# ---- promo ----
@app.post("/api/promo/validate")
def promo_validate(body: PromoIn, request: Request):
    code = body.code.strip().upper()
    rate = store.PROMO.get(code)
    if rate is None:
        raise HTTPException(400, "bad")
    if code == "TAPWIN":
        user = _user_from_request(request)
        if not user:
            raise HTTPException(401, "Login required")
        with store.db() as conn:
            granted = conn.execute(
                "SELECT 1 FROM promo_grants WHERE user_id = ? AND code = 'TAPWIN'",
                (user["id"],),
            ).fetchone()
            if not granted:
                raise HTTPException(400, "bad")
    return {"code": code, "rate": rate, "percent": int(rate * 100)}


@app.post("/api/promo/grant-tapwin")
def promo_grant_tapwin(request: Request):
    user = _require_user(request)
    with store.db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO promo_grants(user_id, code) VALUES (?, 'TAPWIN')",
            (user["id"],),
        )
    return {"ok": True, "code": "TAPWIN", "rate": store.PROMO["TAPWIN"]}


# ---- favorites ----
@app.get("/api/favorites")
def fav_list(request: Request):
    user = _require_user(request)
    with store.db() as conn:
        rows = conn.execute(
            "SELECT product_id FROM favorites WHERE user_id = ? ORDER BY product_id",
            (user["id"],),
        ).fetchall()
    return {"ids": [int(r["product_id"]) for r in rows]}


@app.post("/api/favorites")
def fav_add(body: FavIn, request: Request):
    user = _require_user(request)
    with store.db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO favorites(user_id, product_id) VALUES (?, ?)",
            (user["id"], int(body.product_id)),
        )
        rows = conn.execute(
            "SELECT product_id FROM favorites WHERE user_id = ?", (user["id"],)
        ).fetchall()
    return {"ids": [int(r["product_id"]) for r in rows]}


@app.delete("/api/favorites/{product_id}")
def fav_del(product_id: int, request: Request):
    user = _require_user(request)
    with store.db() as conn:
        conn.execute(
            "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
            (user["id"], int(product_id)),
        )
        rows = conn.execute(
            "SELECT product_id FROM favorites WHERE user_id = ?", (user["id"],)
        ).fetchall()
    return {"ids": [int(r["product_id"]) for r in rows]}


# ---- orders ----
@app.get("/api/orders")
def orders_list(request: Request):
    user = _require_user(request)
    with store.db() as conn:
        _persist_order_statuses(conn)
        rows = conn.execute(
            """
            SELECT o.*, u.email FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
            """,
            (user["id"],),
        ).fetchall()
        # write back synced statuses
        for row in rows:
            nxt = store.sync_order_status(row["created_at"], row["delivery"], row["status"])
            if nxt != row["status"]:
                conn.execute("UPDATE orders SET status = ? WHERE id = ?", (nxt, row["id"]))
        rows = conn.execute(
            """
            SELECT o.*, u.email FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return {"orders": [store.order_dict(r) for r in rows]}


@app.get("/api/orders/{number}")
def orders_one(number: str, request: Request):
    user = _require_user(request)
    with store.db() as conn:
        row = conn.execute(
            """
            SELECT o.*, u.email FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE o.number = ? AND o.user_id = ?
            """,
            (number, user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(404, "not found")
        nxt = store.sync_order_status(row["created_at"], row["delivery"], row["status"])
        if nxt != row["status"]:
            conn.execute("UPDATE orders SET status = ? WHERE id = ?", (nxt, row["id"]))
            row = conn.execute(
                """
                SELECT o.*, u.email FROM orders o
                JOIN users u ON u.id = o.user_id
                WHERE o.number = ? AND o.user_id = ?
                """,
                (number, user["id"]),
            ).fetchone()
    return {"order": store.order_dict(row)}


@app.post("/api/orders")
def orders_create(body: OrderIn, request: Request):
    user = _require_user(request)
    if body.delivery not in ("delivery", "pickup"):
        raise HTTPException(400, "delivery")
    if body.pay not in ("cash", "card"):
        raise HTTPException(400, "pay")
    branch = body.branch.strip()
    phone = body.phone.strip()
    address = body.address.strip()
    if not branch:
        raise HTTPException(400, "needBranch")
    if not phone:
        raise HTTPException(400, "needPhone")
    if body.delivery == "delivery" and not address:
        raise HTTPException(400, "needAddress")
    if not body.items:
        raise HTTPException(400, "empty")

    with store.db() as conn:
        lines = []
        subtotal = 0.0
        for item in body.items:
            flags = store.product_flags(conn, item.id)
            if flags["hidden"] or flags["soldOut"]:
                raise HTTPException(400, f"unavailable:{item.id}")
            price = store.product_price(conn, CATALOG, item.id)
            if price is None:
                raise HTTPException(400, f"unknown:{item.id}")
            qty = int(item.qty)
            subtotal += price * qty
            lines.append({"id": item.id, "qty": qty, "note": (item.note or "")[:200], "price": price})

        coupon = (body.coupon or "").strip().upper()
        rate = 0.0
        if coupon:
            rate = store.PROMO.get(coupon) or 0.0
            if not rate:
                raise HTTPException(400, "couponBad")
            if coupon == "TAPWIN":
                granted = conn.execute(
                    "SELECT 1 FROM promo_grants WHERE user_id = ? AND code = 'TAPWIN'",
                    (user["id"],),
                ).fetchone()
                if not granted:
                    raise HTTPException(400, "couponBad")

        discount = round(subtotal * rate, 2)
        total = round(max(0.0, subtotal - discount), 2)
        number = "KF" + str(int(time.time() * 1000))[-6:]
        now = int(time.time() * 1000)
        conn.execute(
            """
            INSERT INTO orders(
              number, user_id, items_json, subtotal, discount, total, coupon,
              status, delivery, branch, address, phone, pay, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                number,
                user["id"],
                json.dumps(lines),
                subtotal,
                discount,
                total,
                coupon,
                body.delivery,
                branch,
                address if body.delivery == "delivery" else "",
                phone,
                body.pay,
                (body.note or "")[:300],
                now,
            ),
        )
        row = conn.execute(
            """
            SELECT o.*, u.email FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE o.number = ?
            """,
            (number,),
        ).fetchone()
    return {"order": store.order_dict(row)}


# ---- messages ----
@app.post("/api/messages")
def messages_create(body: MessageIn):
    if body.kind not in ("feedback", "contact", "career"):
        raise HTTPException(400, "kind")
    payload = body.model_dump()
    with store.db() as conn:
        conn.execute(
            "INSERT INTO messages(kind, payload_json, read, created_at) VALUES (?, ?, 0, ?)",
            (body.kind, json.dumps(payload), int(time.time() * 1000)),
        )
    return {"ok": True}


# ---- overrides (public read) ----
@app.get("/api/overrides")
def overrides_public():
    with store.db() as conn:
        return {"overrides": store.get_overrides(conn)}


# ---- admin ----
@app.post("/api/admin/login")
def admin_login(body: AdminLoginIn, response: Response):
    if body.user.strip() != store.ADMIN_USER or body.password != store.ADMIN_PASSWORD:
        raise HTTPException(400, "bad")
    with store.db() as conn:
        token = store.create_admin_session(conn)
    response.set_cookie(COOKIE_ADMIN, token, **_cookie_kwargs(), max_age=7 * 24 * 3600)
    return {"ok": True}


@app.post("/api/admin/logout")
def admin_logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_ADMIN)
    if token:
        with store.db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    response.delete_cookie(COOKIE_ADMIN, path="/")
    return {"ok": True}


@app.get("/api/admin/me")
def admin_me(request: Request):
    token = request.cookies.get(COOKIE_ADMIN)
    with store.db() as conn:
        ok = store.admin_session_ok(conn, token)
    return {"ok": ok}


@app.get("/api/admin/orders")
def admin_orders(request: Request):
    _require_admin(request)
    with store.db() as conn:
        _persist_order_statuses(conn)
        rows = conn.execute(
            """
            SELECT o.*, u.email FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC
            """
        ).fetchall()
        out = []
        for row in rows:
            nxt = store.sync_order_status(row["created_at"], row["delivery"], row["status"])
            if nxt != row["status"]:
                conn.execute("UPDATE orders SET status = ? WHERE id = ?", (nxt, row["id"]))
            d = store.order_dict(row)
            d["status"] = nxt
            d["email"] = row["email"]
            out.append(d)
    return {"orders": out}


@app.patch("/api/admin/orders/{number}")
def admin_order_status(number: str, body: StatusIn, request: Request):
    _require_admin(request)
    if body.status not in ("new", "preparing", "ready", "onway", "done", "cancelled"):
        raise HTTPException(400, "status")
    with store.db() as conn:
        cur = conn.execute("UPDATE orders SET status = ? WHERE number = ?", (body.status, number))
        if cur.rowcount == 0:
            raise HTTPException(404, "not found")
    return {"ok": True, "status": body.status}


@app.delete("/api/admin/orders/{number}")
def admin_order_del(number: str, request: Request):
    _require_admin(request)
    with store.db() as conn:
        conn.execute("DELETE FROM orders WHERE number = ?", (number,))
    return {"ok": True}


@app.get("/api/admin/users")
def admin_users(request: Request):
    _require_admin(request)
    with store.db() as conn:
        rows = conn.execute(
            "SELECT id, name, email, phone, created_at FROM users WHERE email != 'admin@local' ORDER BY id DESC"
        ).fetchall()
    return {
        "users": [
            {"id": r["id"], "name": r["name"], "email": r["email"], "phone": r["phone"], "at": r["created_at"]}
            for r in rows
        ]
    }


@app.delete("/api/admin/users/{user_id}")
def admin_user_del(user_id: int, request: Request):
    _require_admin(request)
    with store.db() as conn:
        conn.execute("DELETE FROM users WHERE id = ? AND email != 'admin@local'", (user_id,))
    return {"ok": True}


@app.get("/api/admin/messages")
def admin_messages(request: Request):
    _require_admin(request)
    with store.db() as conn:
        rows = conn.execute("SELECT * FROM messages ORDER BY created_at DESC").fetchall()
    out = []
    for r in rows:
        try:
            payload = json.loads(r["payload_json"])
        except Exception:
            payload = {}
        out.append(
            {
                "id": r["id"],
                "kind": r["kind"],
                "read": bool(r["read"]),
                "at": r["created_at"],
                **payload,
            }
        )
    return {"messages": out}


@app.patch("/api/admin/messages/{msg_id}")
def admin_msg_read(msg_id: int, request: Request):
    _require_admin(request)
    with store.db() as conn:
        conn.execute("UPDATE messages SET read = 1 WHERE id = ?", (msg_id,))
    return {"ok": True}


@app.delete("/api/admin/messages/{msg_id}")
def admin_msg_del(msg_id: int, request: Request):
    _require_admin(request)
    with store.db() as conn:
        conn.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
    return {"ok": True}


@app.get("/api/admin/overrides")
def admin_overrides_get(request: Request):
    _require_admin(request)
    with store.db() as conn:
        return {"overrides": store.get_overrides(conn)}


@app.put("/api/admin/overrides/{product_id}")
def admin_overrides_put(product_id: int, body: OverrideIn, request: Request):
    _require_admin(request)
    if product_id not in CATALOG:
        raise HTTPException(404, "product")
    with store.db() as conn:
        data = store.get_overrides(conn)
        entry: dict[str, Any] = {
            "soldOut": bool(body.soldOut),
            "hidden": bool(body.hidden),
        }
        if body.price is not None:
            entry["price"] = float(body.price)
        if body.featured is not None:
            entry["featured"] = bool(body.featured)
        data[str(product_id)] = entry
        store.set_overrides(conn, data)
    return {"ok": True, "overrides": data}


@app.get("/api/admin/dash")
def admin_dash(request: Request):
    _require_admin(request)
    with store.db() as conn:
        _persist_order_statuses(conn)
        rows = conn.execute(
            """
            SELECT o.*, u.email FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC LIMIT 8
            """
        ).fetchall()
        recent = []
        for row in rows:
            d = store.order_dict(row)
            d["email"] = row["email"]
            recent.append(d)
        all_orders = conn.execute("SELECT total, status FROM orders").fetchall()
        users = conn.execute("SELECT COUNT(*) AS c FROM users WHERE email != 'admin@local'").fetchone()["c"]
        unread = conn.execute("SELECT COUNT(*) AS c FROM messages WHERE read = 0").fetchone()["c"]
        overrides = store.get_overrides(conn)
    revenue = sum(float(o["total"]) for o in all_orders if o["status"] != "cancelled")
    hidden = sum(1 for v in overrides.values() if isinstance(v, dict) and v.get("hidden"))
    return {
        "orders": len(all_orders),
        "revenue": revenue,
        "users": users,
        "unread": unread,
        "products": len(CATALOG),
        "hidden": hidden,
        "recent": recent,
        "overrides": overrides,
    }


# ---- static / clean URLs ----
app.mount("/css", StaticFiles(directory=str(ROOT / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(ROOT / "js")), name="js")


@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(ROOT / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
def sw():
    return FileResponse(ROOT / "sw.js", media_type="application/javascript")


@app.get("/")
async def home():
    return FileResponse(ROOT / "index.html")


@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
async def spa_pages(full_path: str):
    path = full_path.strip("/")
    if path.endswith(".html"):
        slug = path.rsplit("/", 1)[-1][:-5]
        target = "/" if slug in ("", "index") else "/" + slug
        return Response(status_code=301, headers={"Location": target})
    if path in PAGES:
        return FileResponse(ROOT / PAGES[path])
    candidate = (ROOT / path).resolve()
    if path and candidate.is_file() and str(candidate).startswith(str(ROOT.resolve())):
        return FileResponse(candidate)
    raise HTTPException(404, "Not found")
