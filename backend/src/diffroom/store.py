"""SQLite persistence for review threads — the storage edge of the shell.

This module owns ``.git/diffroom/state.db``. It returns plain domain dataclasses
(:class:`Thread`, :class:`Comment`) and never imports Pydantic, FastAPI, or any
pure-core module; :mod:`diffroom.models` maps these onto the API boundary.

A "single-line note" is one thread anchored to ``file_path`` + ``side`` + ``line``
plus its first comment, created together. The schema is thread-shaped from day
one so follow-up comments, categories, and resolve/unresolve can land later
without reshaping it.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path

__all__ = ["Side", "Comment", "Thread", "Store"]


class Side(str, Enum):
    """Which side of the diff a thread anchors to (deletes have only ``OLD``)."""

    OLD = "old"
    NEW = "new"


@dataclass(frozen=True, slots=True)
class Comment:
    """One message in a thread."""

    id: int
    body: str
    created_at: str


@dataclass(frozen=True, slots=True)
class Thread:
    """A note anchored to a single diff line, carrying one or more comments."""

    id: int
    scope: str
    file_path: str
    side: Side
    line: int
    created_at: str
    comments: tuple[Comment, ...]


_SCHEMA = """
CREATE TABLE IF NOT EXISTS threads (
    id         INTEGER PRIMARY KEY,
    scope      TEXT NOT NULL,
    file_path  TEXT NOT NULL,
    side       TEXT NOT NULL,
    line       INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY,
    thread_id  INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    """Persist and read review threads in a per-repo SQLite database.

    Constructed from a database *path*; it creates the parent directory and
    schema on construction (idempotent) and opens a fresh connection per
    operation, which keeps it safe across Uvicorn's worker threads.
    """

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_SCHEMA)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def create_thread(self, scope: str, file_path: str, side: Side, line: int, body: str) -> Thread:
        """Insert a thread and its first comment, returning the stored record."""
        created_at = _now()
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO threads (scope, file_path, side, line, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (scope, file_path, side.value, line, created_at),
            )
            thread_id = cursor.lastrowid
            assert thread_id is not None  # INTEGER PRIMARY KEY always assigns a rowid
            comment_cursor = conn.execute(
                "INSERT INTO comments (thread_id, body, created_at) VALUES (?, ?, ?)",
                (thread_id, body, created_at),
            )
            comment_id = comment_cursor.lastrowid
            assert comment_id is not None
            comment = Comment(id=comment_id, body=body, created_at=created_at)
        return Thread(
            id=thread_id,
            scope=scope,
            file_path=file_path,
            side=side,
            line=line,
            created_at=created_at,
            comments=(comment,),
        )

    def list_threads(self, scope: str) -> list[Thread]:
        """Return threads for ``scope`` in creation order, comments nested."""
        with self._connect() as conn:
            thread_rows = conn.execute(
                "SELECT id, scope, file_path, side, line, created_at"
                " FROM threads WHERE scope = ? ORDER BY id ASC",
                (scope,),
            ).fetchall()
            comment_rows = conn.execute(
                "SELECT c.id, c.thread_id, c.body, c.created_at FROM comments c"
                " JOIN threads t ON c.thread_id = t.id"
                " WHERE t.scope = ? ORDER BY c.id ASC",
                (scope,),
            ).fetchall()

        comments_by_thread: dict[int, list[Comment]] = {}
        for row in comment_rows:
            comments_by_thread.setdefault(row["thread_id"], []).append(
                Comment(id=row["id"], body=row["body"], created_at=row["created_at"])
            )

        return [
            Thread(
                id=row["id"],
                scope=row["scope"],
                file_path=row["file_path"],
                side=Side(row["side"]),
                line=row["line"],
                created_at=row["created_at"],
                comments=tuple(comments_by_thread.get(row["id"], ())),
            )
            for row in thread_rows
        ]
