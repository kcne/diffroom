from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from diffroom import __version__
from diffroom.git.commands import GitClient
from diffroom.server import create_app


class FakeGitClient(GitClient):
    def __init__(self, repo_root: Path, branch: str) -> None:
        self._repo_root = repo_root
        self._branch = branch

    def repo_root(self) -> Path:
        return self._repo_root

    def current_branch(self) -> str:
        return self._branch


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    (tmp_path / "index.html").write_text("<html><body>DiffRoom SPA</body></html>", encoding="utf-8")
    return tmp_path


@pytest.fixture
def client(static_dir: Path) -> TestClient:
    git_client = FakeGitClient(Path("/tmp/repo"), "main")
    return TestClient(create_app(static_dir=static_dir, git_client=git_client))


def test_health_reports_status_version_repo_root_and_branch(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "version": __version__,
        "repo_root": "/tmp/repo",
        "branch": "main",
    }


def test_index_served(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "DiffRoom SPA" in response.text


def test_spa_fallback_serves_index_for_client_route(client: TestClient) -> None:
    response = client.get("/some/client/route")
    assert response.status_code == 200
    assert "DiffRoom SPA" in response.text


def test_unknown_api_route_is_404(client: TestClient) -> None:
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404


def test_placeholder_when_no_build(tmp_path: Path) -> None:
    client = TestClient(create_app(static_dir=tmp_path))
    response = client.get("/")
    assert response.status_code == 200
    assert "No frontend build found" in response.text
