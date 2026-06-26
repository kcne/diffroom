"""SQLite persistence for review threads — the storage edge of the shell.

This module owns ``.git/diffroom/state.db``. It returns plain domain dataclasses
(:class:`Thread`, :class:`Comment`) and never imports Pydantic, FastAPI, or any
pure-core module; :mod:`diffroom.models` maps these onto the API boundary.

A "single-line note" is one thread anchored to ``file_path`` + ``side`` + ``line``
plus its first comment, created together. The schema is thread-shaped from day
one so follow-up comments, categories, and resolve/unresolve can land later
without reshaping it.

Queries are built with SQLAlchemy Core (the query builder, not the ORM): the
table metadata and typed column expressions keep statements readable and ready
for the richer filters later slices add, while the store still hands back plain
dataclasses rather than ORM objects.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    MetaData,
    RowMapping,
    Table,
    Text,
    create_engine,
    event,
    insert,
    select,
)
from sqlalchemy.engine import URL
from sqlalchemy.pool import NullPool

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

    @classmethod
    def from_row(cls, row: RowMapping) -> Comment:
        return cls(id=row["id"], body=row["body"], created_at=row["created_at"])


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

    @classmethod
    def from_row(cls, row: RowMapping, comments: tuple[Comment, ...]) -> Thread:
        return cls(
            id=row["id"],
            scope=row["scope"],
            file_path=row["file_path"],
            side=Side(row["side"]),
            line=row["line"],
            created_at=row["created_at"],
            comments=comments,
        )


_metadata = MetaData()

threads_table = Table(
    "threads",
    _metadata,
    Column("id", Integer, primary_key=True),
    Column("scope", Text, nullable=False),
    Column("file_path", Text, nullable=False),
    Column("side", Text, nullable=False),
    Column("line", Integer, nullable=False),
    Column("created_at", Text, nullable=False),
)

comments_table = Table(
    "comments",
    _metadata,
    Column("id", Integer, primary_key=True),
    Column("thread_id", Integer, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False),
    Column("body", Text, nullable=False),
    Column("created_at", Text, nullable=False),
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    """Persist and read review threads in a per-repo SQLite database.

    Constructed from a database *path*; it creates the parent directory and
    schema on construction (idempotent). A :class:`~sqlalchemy.pool.NullPool`
    engine opens a fresh connection per operation within the calling thread, so
    nothing is shared across Uvicorn's worker threads.
    """

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._engine = create_engine(
            URL.create("sqlite", database=str(db_path)), poolclass=NullPool
        )

        @event.listens_for(self._engine, "connect")
        def _enable_foreign_keys(dbapi_connection: Any, _: Any) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        _metadata.create_all(self._engine)

    def create_thread(self, scope: str, file_path: str, side: Side, line: int, body: str) -> Thread:
        """Insert a thread and its first comment, returning the stored record."""
        created_at = _now()
        with self._engine.begin() as conn:
            thread_pk = conn.execute(
                insert(threads_table).values(
                    scope=scope,
                    file_path=file_path,
                    side=side.value,
                    line=line,
                    created_at=created_at,
                )
            ).inserted_primary_key
            assert thread_pk is not None  # autoincrement PK is always assigned
            thread_id = thread_pk[0]
            comment_pk = conn.execute(
                insert(comments_table).values(thread_id=thread_id, body=body, created_at=created_at)
            ).inserted_primary_key
            assert comment_pk is not None
            comment_id = comment_pk[0]
        return Thread(
            id=thread_id,
            scope=scope,
            file_path=file_path,
            side=side,
            line=line,
            created_at=created_at,
            comments=(Comment(id=comment_id, body=body, created_at=created_at),),
        )

    def list_threads(self, scope: str) -> list[Thread]:
        """Return threads for ``scope`` in creation order, comments nested."""
        with self._engine.connect() as conn:
            thread_rows = (
                conn.execute(
                    select(threads_table)
                    .where(threads_table.c.scope == scope)
                    .order_by(threads_table.c.id)
                )
                .mappings()
                .all()
            )
            comment_rows = (
                conn.execute(
                    select(comments_table)
                    .join(threads_table, comments_table.c.thread_id == threads_table.c.id)
                    .where(threads_table.c.scope == scope)
                    .order_by(comments_table.c.id)
                )
                .mappings()
                .all()
            )

        comments_by_thread: dict[int, list[Comment]] = {}
        for row in comment_rows:
            comments_by_thread.setdefault(row["thread_id"], []).append(Comment.from_row(row))

        return [
            Thread.from_row(row, tuple(comments_by_thread.get(row["id"], ())))
            for row in thread_rows
        ]
