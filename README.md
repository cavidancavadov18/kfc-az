# KFC AZ (local backend)

Real SQLite + FastAPI backend. Cart stays in the browser; accounts, orders, favorites, messages and admin live on the server.

## Run

```bash
pip install -r requirements.txt
python serve.py
```

Open http://127.0.0.1:8765/

Admin: http://127.0.0.1:8765/admin — `admin` / `admin`  
(override with `ADMIN_USER` / `ADMIN_PASSWORD` env vars)

Promo codes: `KFC10`, `BUCKET15`, `FRIEND5`, `TAPWIN` (after winning Bucket Tap while logged in)
