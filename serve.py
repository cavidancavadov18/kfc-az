"""Start the real KFC backend (FastAPI + SQLite) on http://127.0.0.1:8765/"""
import os

import uvicorn

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("http://127.0.0.1:8765/", flush=True)
    uvicorn.run("backend:app", host="127.0.0.1", port=8765, reload=False)
