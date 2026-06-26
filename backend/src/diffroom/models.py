"""Pydantic models for the JSON API and the OpenAPI → TS contract.

These mirror the pure parser dataclasses in :mod:`diffroom.git.diff_parser`,
which stay the functional core. This module is the API boundary: a thin,
pure converter maps the dataclasses onto Pydantic models that FastAPI
serializes and that drive TypeScript type generation.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from .git import diff_parser
from .git.diff_parser import RowType
from .store import Side, Thread

__all__ = [
    "Row",
    "Hunk",
    "DiffFile",
    "DiffResponse",
    "RowType",
    "to_diff_response",
    "Side",
    "ThreadCreate",
    "CommentOut",
    "ThreadOut",
    "ThreadsResponse",
    "to_thread_out",
    "to_threads_response",
]


class Row(BaseModel):
    """One rendered diff line. ``old_line_no`` is null on adds, ``new_line_no`` on deletes."""

    old_line_no: int | None
    new_line_no: int | None
    type: RowType
    content: str


class Hunk(BaseModel):
    """A contiguous block of changes with its ``@@`` ranges and rows."""

    old_start: int
    old_count: int
    new_start: int
    new_count: int
    header: str
    rows: list[Row]


class DiffFile(BaseModel):
    """A single file's section of a diff."""

    path: str
    old_path: str
    hunks: list[Hunk]


class DiffResponse(BaseModel):
    """The structured diff for one scope."""

    scope: str
    files: list[DiffFile]


def to_diff_response(scope: str, files: list[diff_parser.DiffFile]) -> DiffResponse:
    """Convert parser dataclasses into a serializable :class:`DiffResponse`."""
    return DiffResponse(
        scope=scope,
        files=[
            DiffFile(
                path=file.path,
                old_path=file.old_path,
                hunks=[
                    Hunk(
                        old_start=hunk.old_start,
                        old_count=hunk.old_count,
                        new_start=hunk.new_start,
                        new_count=hunk.new_count,
                        header=hunk.header,
                        rows=[
                            Row(
                                old_line_no=row.old_line_no,
                                new_line_no=row.new_line_no,
                                type=row.type,
                                content=row.content,
                            )
                            for row in hunk.rows
                        ],
                    )
                    for hunk in file.hunks
                ],
            )
            for file in files
        ],
    )


class ThreadCreate(BaseModel):
    """Request body for creating a single-line note."""

    file_path: str = Field(min_length=1)
    side: Side
    line: int = Field(ge=1)
    body: str = Field(min_length=1)


class CommentOut(BaseModel):
    """One message in a thread."""

    id: int
    body: str
    created_at: str


class ThreadOut(BaseModel):
    """A note anchored to a single diff line, with its comments nested."""

    id: int
    scope: str
    file_path: str
    side: Side
    line: int
    created_at: str
    comments: list[CommentOut]


class ThreadsResponse(BaseModel):
    """The review threads for one scope."""

    scope: str
    threads: list[ThreadOut]


def to_thread_out(thread: Thread) -> ThreadOut:
    """Convert a store :class:`~diffroom.store.Thread` into its API model."""
    return ThreadOut(
        id=thread.id,
        scope=thread.scope,
        file_path=thread.file_path,
        side=thread.side,
        line=thread.line,
        created_at=thread.created_at,
        comments=[
            CommentOut(id=comment.id, body=comment.body, created_at=comment.created_at)
            for comment in thread.comments
        ],
    )


def to_threads_response(scope: str, threads: list[Thread]) -> ThreadsResponse:
    """Convert store threads into a serializable :class:`ThreadsResponse`."""
    return ThreadsResponse(scope=scope, threads=[to_thread_out(t) for t in threads])
