"""FastAPI application factory for DiffRoom's local server."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import __version__

DEFAULT_STATIC_DIR = Path(__file__).parent / "static"

_PLACEHOLDER_HTML = (
    "<!doctype html><html><head><title>DiffRoom</title></head>"
    "<body><h1>DiffRoom</h1>"
    "<p>No frontend build found. Run <code>just build</code> or the Vite dev server.</p>"
    "</body></html>"
)


def create_app(
    static_dir: Path | None = None,
    version: str = __version__,
) -> FastAPI:
    """Build the DiffRoom FastAPI app.

    Serves a JSON API under ``/api`` and the built single-page app for every
    other route (SPA fallback). ``static_dir`` defaults to the packaged
    ``static`` directory populated by the frontend build.
    """
    app = FastAPI(title="DiffRoom", version=version)
    static = static_dir if static_dir is not None else DEFAULT_STATIC_DIR
    index_file = static / "index.html"

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "version": version}

    assets_dir = static / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", response_class=HTMLResponse)
    def spa(full_path: str) -> HTMLResponse:
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        if index_file.is_file():
            return HTMLResponse(index_file.read_text(encoding="utf-8"))
        return HTMLResponse(_PLACEHOLDER_HTML)

    return app
