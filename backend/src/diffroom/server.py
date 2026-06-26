"""FastAPI application factory for DiffRoom's local server."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .git.commands import GitClient, NotARepositoryError
from .git.diff_parser import parse_diff
from .models import (
    DiffResponse,
    ThreadCreate,
    ThreadOut,
    ThreadsResponse,
    to_diff_response,
    to_thread_out,
    to_threads_response,
)
from .store import Store

DEFAULT_STATIC_DIR = Path(__file__).parent / "static"

UNSTAGED_SCOPE = "unstaged"

_PLACEHOLDER_HTML = (
    "<!doctype html><html><head><title>DiffRoom</title></head>"
    "<body><h1>DiffRoom</h1>"
    "<p>No frontend build found. Run <code>just build</code> or the Vite dev server.</p>"
    "</body></html>"
)


def create_app(
    static_dir: Path | None = None,
    version: str = __version__,
    git_client: GitClient | None = None,
    store: Store | None = None,
) -> FastAPI:
    """Build the DiffRoom FastAPI app.

    Serves a JSON API under ``/api`` and the built single-page app for every
    other route (SPA fallback). ``static_dir`` defaults to the packaged
    ``static`` directory populated by the frontend build. ``git_client``
    defaults to one rooted at the process working directory. ``store`` defaults
    to one opened lazily per request at ``.git/diffroom/state.db`` under the
    repo root.
    """
    app = FastAPI(title="DiffRoom", version=version)
    static = static_dir if static_dir is not None else DEFAULT_STATIC_DIR
    index_file = static / "index.html"
    git = git_client if git_client is not None else GitClient()

    def resolve_store() -> Store:
        if store is not None:
            return store
        return Store(git.repo_root() / ".git" / "diffroom" / "state.db")

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {
            "status": "ok",
            "version": version,
            "repo_root": str(git.repo_root()),
            "branch": git.current_branch(),
        }

    @app.get("/api/diff")
    def diff() -> DiffResponse:
        try:
            git.repo_root()
            raw = git.diff_unstaged()
        except NotARepositoryError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return to_diff_response(UNSTAGED_SCOPE, parse_diff(raw))

    @app.post("/api/threads", status_code=201)
    def create_thread(payload: ThreadCreate) -> ThreadOut:
        try:
            thread = resolve_store().create_thread(
                UNSTAGED_SCOPE,
                payload.file_path,
                payload.side,
                payload.line,
                payload.body,
            )
        except NotARepositoryError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return to_thread_out(thread)

    @app.get("/api/threads")
    def list_threads() -> ThreadsResponse:
        try:
            threads = resolve_store().list_threads(UNSTAGED_SCOPE)
        except NotARepositoryError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return to_threads_response(UNSTAGED_SCOPE, threads)

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
