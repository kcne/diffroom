from __future__ import annotations

from diffroom.git.diff_parser import DiffFile, Hunk, Row, RowType
from diffroom.models import DiffResponse, ThreadsResponse, to_diff_response, to_threads_response
from diffroom.store import Comment, Side, Thread


def test_to_diff_response_maps_dataclasses_faithfully() -> None:
    files = [
        DiffFile(
            path="foo.py",
            old_path="foo.py",
            hunks=(
                Hunk(
                    old_start=1,
                    old_count=3,
                    new_start=1,
                    new_count=4,
                    header="def foo():",
                    rows=(
                        Row(1, 1, RowType.CONTEXT, "first"),
                        Row(2, None, RowType.DELETE, "second"),
                        Row(None, 2, RowType.ADD, "second changed"),
                    ),
                ),
            ),
        )
    ]

    response = to_diff_response("unstaged", files)

    assert isinstance(response, DiffResponse)
    assert response.scope == "unstaged"
    assert len(response.files) == 1
    file = response.files[0]
    assert file.path == "foo.py"
    assert file.old_path == "foo.py"
    assert len(file.hunks) == 1
    hunk = file.hunks[0]
    assert (hunk.old_start, hunk.old_count, hunk.new_start, hunk.new_count) == (1, 3, 1, 4)
    assert hunk.header == "def foo():"
    assert hunk.rows[0] == file.hunks[0].rows[0]
    assert hunk.rows[1].type is RowType.DELETE
    assert hunk.rows[1].old_line_no == 2
    assert hunk.rows[1].new_line_no is None
    assert hunk.rows[2].type is RowType.ADD


def test_to_diff_response_empty_files() -> None:
    response = to_diff_response("unstaged", [])
    assert response.scope == "unstaged"
    assert response.files == []


def test_row_type_serializes_to_string_value() -> None:
    response = to_diff_response(
        "unstaged",
        [DiffFile("a", "a", (Hunk(1, 1, 1, 1, "", (Row(1, 1, RowType.CONTEXT, "x"),)),))],
    )
    dumped = response.model_dump(mode="json")
    assert dumped["files"][0]["hunks"][0]["rows"][0]["type"] == "context"


def test_to_threads_response_maps_dataclasses() -> None:
    threads = [
        Thread(
            id=1,
            scope="unstaged",
            file_path="foo.py",
            side=Side.NEW,
            line=12,
            created_at="2026-01-01T00:00:00+00:00",
            comments=(Comment(id=1, body="needs a guard", created_at="2026-01-01T00:00:00+00:00"),),
        )
    ]

    response = to_threads_response("unstaged", threads)

    assert isinstance(response, ThreadsResponse)
    assert response.scope == "unstaged"
    assert len(response.threads) == 1
    thread = response.threads[0]
    assert thread.id == 1
    assert thread.file_path == "foo.py"
    assert thread.side is Side.NEW
    assert thread.line == 12
    assert thread.created_at == "2026-01-01T00:00:00+00:00"
    assert len(thread.comments) == 1
    assert thread.comments[0].body == "needs a guard"


def test_to_threads_response_empty() -> None:
    response = to_threads_response("unstaged", [])
    assert response.scope == "unstaged"
    assert response.threads == []


def test_side_serializes_to_string_value() -> None:
    threads = [
        Thread(
            id=1,
            scope="unstaged",
            file_path="a.py",
            side=Side.OLD,
            line=3,
            created_at="2026-01-01T00:00:00+00:00",
            comments=(Comment(id=1, body="x", created_at="2026-01-01T00:00:00+00:00"),),
        )
    ]
    dumped = to_threads_response("unstaged", threads).model_dump(mode="json")
    assert dumped["threads"][0]["side"] == "old"
