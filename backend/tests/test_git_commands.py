from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from diffroom.git.commands import GitClient, GitError, NotARepositoryError


def _init_repo(path: Path, branch: str = "main") -> None:
    subprocess.run(["git", "init", "-b", branch, str(path)], check=True, capture_output=True)
    subprocess.run(["git", "-C", str(path), "config", "user.email", "t@t.t"], check=True)
    subprocess.run(["git", "-C", str(path), "config", "user.name", "Test"], check=True)


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    _init_repo(tmp_path)
    return tmp_path


def test_repo_root_returns_toplevel(repo: Path) -> None:
    assert GitClient(repo).repo_root().resolve() == repo.resolve()


def test_repo_root_from_subdir_returns_toplevel(repo: Path) -> None:
    sub = repo / "nested" / "dir"
    sub.mkdir(parents=True)
    assert GitClient(sub).repo_root().resolve() == repo.resolve()


def test_repo_root_outside_repo_raises(tmp_path: Path) -> None:
    with pytest.raises(NotARepositoryError):
        GitClient(tmp_path).repo_root()


def test_not_a_repository_error_is_git_error(tmp_path: Path) -> None:
    assert issubclass(NotARepositoryError, GitError)


def test_current_branch_returns_name(repo: Path) -> None:
    assert GitClient(repo).current_branch() == "main"


def test_run_returns_stripped_stdout(repo: Path) -> None:
    out = GitClient(repo).run("rev-parse", "--is-inside-work-tree")
    assert out == "true"


def test_run_failure_raises_git_error_with_stderr(repo: Path) -> None:
    with pytest.raises(GitError) as excinfo:
        GitClient(repo).run("cat-file", "-e", "deadbeef")
    assert str(excinfo.value)


def _commit_file(repo: Path, name: str, content: str) -> None:
    (repo / name).write_text(content, encoding="utf-8")
    subprocess.run(["git", "-C", str(repo), "add", name], check=True, capture_output=True)
    subprocess.run(["git", "-C", str(repo), "commit", "-m", name], check=True, capture_output=True)


def test_diff_unstaged_returns_working_tree_diff(repo: Path) -> None:
    _commit_file(repo, "foo.txt", "first\nsecond\nthird\n")
    (repo / "foo.txt").write_text("first\nsecond changed\nthird\n", encoding="utf-8")

    diff = GitClient(repo).diff_unstaged()

    assert "diff --git a/foo.txt b/foo.txt" in diff
    assert "-second" in diff
    assert "+second changed" in diff


def test_diff_unstaged_clean_tree_is_empty(repo: Path) -> None:
    _commit_file(repo, "foo.txt", "first\n")
    assert GitClient(repo).diff_unstaged() == ""
