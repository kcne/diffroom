"""DiffRoom command-line interface (Typer)."""

from __future__ import annotations

import secrets
import socket
import webbrowser

import typer
import uvicorn

from . import __version__
from .git.commands import GitClient, NotARepositoryError
from .server import create_app

HOST = "127.0.0.1"

app = typer.Typer(
    add_completion=False,
    help="Local-first review workspace for Git diffs and coding agents.",
)


def mint_token() -> str:
    """Return a fresh URL-safe session token."""
    return secrets.token_urlsafe(32)


def pick_port(preferred: int | None = None) -> int:
    """Return a port to bind to.

    If ``preferred`` is given it is returned as-is; otherwise the OS assigns a
    free port by binding to port 0.
    """
    if preferred is not None:
        return preferred
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((HOST, 0))
        return int(sock.getsockname()[1])


def run_server(port: int) -> None:  # pragma: no cover - thin uvicorn wrapper
    uvicorn.run(create_app(), host=HOST, port=port, log_level="info")


@app.callback(invoke_without_command=True)
def _root(
    ctx: typer.Context,
    port: int | None = typer.Option(None, "--port", help="Port to bind (default: OS-assigned)."),
    no_open: bool = typer.Option(False, "--no-open", help="Do not open a browser."),
) -> None:
    """Open the DiffRoom review UI for the current repository."""
    if ctx.invoked_subcommand is not None:
        return
    try:
        GitClient().repo_root()
    except NotARepositoryError:
        typer.echo(
            "Not a git repository. Run `diffroom` from inside a git working tree.",
            err=True,
        )
        raise typer.Exit(1) from None
    chosen = pick_port(port)
    token = mint_token()
    url = f"http://{HOST}:{chosen}/?token={token}"
    typer.echo(f"DiffRoom running at {url}")
    typer.echo("Press Ctrl-C to stop.")
    if not no_open:
        webbrowser.open(url)
    run_server(chosen)


@app.command()
def version() -> None:
    """Print the DiffRoom version."""
    typer.echo(__version__)


def main() -> None:
    """Console-script entry point."""
    app()
