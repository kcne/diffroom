"""Thin subprocess wrapper around the system ``git`` binary.

This is part of the imperative shell: it turns ``git`` invocations into plain
strings (or typed errors) for the functional core to consume. It never touches
the database, network, or any pure-logic module.
"""

from __future__ import annotations

import subprocess
from pathlib import Path


class GitError(Exception):
    """A git command exited non-zero or could not be run."""


class NotARepositoryError(GitError):
    """The target directory is not inside a git repository."""


class GitClient:
    """Run git commands rooted at a working directory."""

    def __init__(self, cwd: Path | None = None) -> None:
        self.cwd = cwd if cwd is not None else Path.cwd()

    def run(self, *args: str) -> str:
        """Run ``git <args>`` and return stripped stdout.

        Raises :class:`GitError` if git is missing or exits non-zero.
        """
        try:
            result = subprocess.run(
                ["git", *args],
                cwd=self.cwd,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError as exc:
            raise GitError("git executable not found") from exc
        if result.returncode != 0:
            raise GitError(result.stderr.strip() or f"git {' '.join(args)} failed")
        return result.stdout.strip()

    def repo_root(self) -> Path:
        """Return the repository's top-level directory.

        Raises :class:`NotARepositoryError` when the cwd is not in a repo.
        """
        try:
            return Path(self.run("rev-parse", "--show-toplevel"))
        except GitError as exc:
            raise NotARepositoryError(str(exc)) from exc

    def current_branch(self) -> str:
        """Return the checked-out branch name (empty when detached/unborn)."""
        return self.run("branch", "--show-current")
