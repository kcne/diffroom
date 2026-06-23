from __future__ import annotations

from unittest.mock import patch

from typer.testing import CliRunner

from diffroom import __version__
from diffroom.cli import app, mint_token, pick_port

runner = CliRunner()


def test_version_command() -> None:
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert __version__ in result.stdout


def test_mint_token_is_unique_and_long() -> None:
    first, second = mint_token(), mint_token()
    assert first != second
    assert len(first) >= 32


def test_pick_port_returns_free_port() -> None:
    port = pick_port()
    assert isinstance(port, int)
    assert port > 0


def test_pick_port_honors_preferred() -> None:
    assert pick_port(54321) == 54321


def test_no_open_does_not_launch_browser() -> None:
    with (
        patch("diffroom.cli.run_server") as run,
        patch("diffroom.cli.webbrowser.open") as browser,
    ):
        result = runner.invoke(app, ["--no-open"])
    assert result.exit_code == 0
    browser.assert_not_called()
    run.assert_called_once()


def test_default_invocation_opens_browser_and_starts_server() -> None:
    with (
        patch("diffroom.cli.run_server") as run,
        patch("diffroom.cli.webbrowser.open") as browser,
    ):
        result = runner.invoke(app, [])
    assert result.exit_code == 0
    browser.assert_called_once()
    run.assert_called_once()
