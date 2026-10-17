"""Start the real KFC backend (FastAPI + SQLite)."""
import os

import uvicorn

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8765"))
    print(f"http://{host}:{port}/", flush=True)
    uvicorn.run("backend:app", host=host, port=port, reload=False)
