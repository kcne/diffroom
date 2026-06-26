from __future__ import annotations

import subprocess
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


def _init_repo(path: Path) -> None:
    subprocess.run(["git", "init", "-b", "main", str(path)], check=True, capture_output=True)
    subprocess.run(["git", "-C", str(path), "config", "user.email", "t@t.t"], check=True)
    subprocess.run(["git", "-C", str(path), "config", "user.name", "Test"], check=True)


def _commit_file(repo: Path, name: str, content: str) -> None:
    (repo / name).write_text(content, encoding="utf-8")
    subprocess.run(["git", "-C", str(repo), "add", name], check=True, capture_output=True)
    subprocess.run(["git", "-C", str(repo), "commit", "-m", name], check=True, capture_output=True)


def _repo_client(repo: Path, static_dir: Path) -> TestClient:
    return TestClient(create_app(static_dir=static_dir, git_client=GitClient(repo)))


def test_diff_endpoint_returns_structured_unstaged_diff(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    _commit_file(repo, "foo.txt", "first\nsecond\nthird\n")
    (repo / "foo.txt").write_text("first\nsecond changed\nthird\n", encoding="utf-8")
    static = tmp_path / "static"
    static.mkdir()

    response = _repo_client(repo, static).get("/api/diff")

    assert response.status_code == 200
    body = response.json()
    assert body["scope"] == "unstaged"
    assert len(body["files"]) == 1
    file = body["files"][0]
    assert file["path"] == "foo.txt"
    contents = [row["content"] for hunk in file["hunks"] for row in hunk["rows"]]
    assert "second changed" in contents
    types = {row["type"] for hunk in file["hunks"] for row in hunk["rows"]}
    assert {"context", "add", "delete"} <= types


def test_diff_endpoint_empty_when_clean(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    _commit_file(repo, "foo.txt", "first\n")
    static = tmp_path / "static"
    static.mkdir()

    response = _repo_client(repo, static).get("/api/diff")

    assert response.status_code == 200
    assert response.json() == {"scope": "unstaged", "files": []}


def test_diff_endpoint_not_a_repo_returns_400(tmp_path: Path) -> None:
    not_repo = tmp_path / "plain"
    not_repo.mkdir()
    static = tmp_path / "static"
    static.mkdir()

    response = _repo_client(not_repo, static).get("/api/diff")

    assert response.status_code == 400


def _threads_client(repo: Path, static_dir: Path) -> TestClient:
    return TestClient(create_app(static_dir=static_dir, git_client=GitClient(repo)))


def test_create_thread_returns_201_with_nested_comment(tmp_path: Path) -> None:
    from diffroom.store import Store

    static = tmp_path / "static"
    static.mkdir()
    store = Store(tmp_path / "state.db")
    client = TestClient(
        create_app(
            static_dir=static, git_client=FakeGitClient(Path("/tmp/repo"), "main"), store=store
        )
    )

    response = client.post(
        "/api/threads",
        json={"file_path": "foo.py", "side": "new", "line": 12, "body": "needs a guard"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] >= 1
    assert body["scope"] == "unstaged"
    assert body["file_path"] == "foo.py"
    assert body["side"] == "new"
    assert body["line"] == 12
    assert body["created_at"]
    assert len(body["comments"]) == 1
    assert body["comments"][0]["body"] == "needs a guard"


def test_create_then_list_threads_round_trip(tmp_path: Path) -> None:
    from diffroom.store import Store

    static = tmp_path / "static"
    static.mkdir()
    store = Store(tmp_path / "state.db")
    client = TestClient(
        create_app(
            static_dir=static, git_client=FakeGitClient(Path("/tmp/repo"), "main"), store=store
        )
    )
    client.post(
        "/api/threads",
        json={"file_path": "a.py", "side": "new", "line": 1, "body": "first"},
    )

    response = client.get("/api/threads")

    assert response.status_code == 200
    body = response.json()
    assert body["scope"] == "unstaged"
    assert len(body["threads"]) == 1
    assert body["threads"][0]["comments"][0]["body"] == "first"


def test_list_threads_empty(tmp_path: Path) -> None:
    from diffroom.store import Store

    static = tmp_path / "static"
    static.mkdir()
    store = Store(tmp_path / "state.db")
    client = TestClient(
        create_app(
            static_dir=static, git_client=FakeGitClient(Path("/tmp/repo"), "main"), store=store
        )
    )

    response = client.get("/api/threads")

    assert response.status_code == 200
    assert response.json() == {"scope": "unstaged", "threads": []}


@pytest.mark.parametrize(
    "payload",
    [
        {"side": "new", "line": 1, "body": "x"},
        {"file_path": "a.py", "side": "new", "line": 1},
        {"file_path": "a.py", "side": "new", "line": 0, "body": "x"},
        {"file_path": "a.py", "side": "sideways", "line": 1, "body": "x"},
        {"file_path": "", "side": "new", "line": 1, "body": "x"},
        {"file_path": "a.py", "side": "new", "line": 1, "body": ""},
    ],
)
def test_create_thread_invalid_body_returns_422(tmp_path: Path, payload: dict) -> None:
    from diffroom.store import Store

    static = tmp_path / "static"
    static.mkdir()
    store = Store(tmp_path / "state.db")
    client = TestClient(
        create_app(
            static_dir=static, git_client=FakeGitClient(Path("/tmp/repo"), "main"), store=store
        )
    )

    response = client.post("/api/threads", json=payload)

    assert response.status_code == 422


def test_threads_not_a_repo_returns_400(tmp_path: Path) -> None:
    not_repo = tmp_path / "plain"
    not_repo.mkdir()
    static = tmp_path / "static"
    static.mkdir()
    client = _threads_client(not_repo, static)

    post = client.post(
        "/api/threads",
        json={"file_path": "a.py", "side": "new", "line": 1, "body": "x"},
    )
    get = client.get("/api/threads")

    assert post.status_code == 400
    assert get.status_code == 400
