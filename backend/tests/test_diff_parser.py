from __future__ import annotations

import textwrap

import pytest

from diffroom.git.diff_parser import (
    DiffParseError,
    RowType,
    parse_diff,
)


def _diff(text: str) -> str:
    return textwrap.dedent(text).lstrip("\n")


def test_parses_single_file_one_hunk() -> None:
    diff = _diff(
        """
        diff --git a/foo.py b/foo.py
        index 83db48f..f735c2d 100644
        --- a/foo.py
        +++ b/foo.py
        @@ -1,3 +1,4 @@
         first
        -second
        +second changed
        +third
         fourth
        """
    )

    files = parse_diff(diff)

    assert len(files) == 1
    file = files[0]
    assert file.path == "foo.py"
    assert file.old_path == "foo.py"
    assert len(file.hunks) == 1

    hunk = file.hunks[0]
    assert (hunk.old_start, hunk.old_count) == (1, 3)
    assert (hunk.new_start, hunk.new_count) == (1, 4)
    assert hunk.header == ""

    assert hunk.rows == (
        _row(1, 1, RowType.CONTEXT, "first"),
        _row(2, None, RowType.DELETE, "second"),
        _row(None, 2, RowType.ADD, "second changed"),
        _row(None, 3, RowType.ADD, "third"),
        _row(3, 4, RowType.CONTEXT, "fourth"),
    )


def test_hunk_header_omitted_counts_default_to_one() -> None:
    diff = _diff(
        """
        diff --git a/a.txt b/a.txt
        --- a/a.txt
        +++ b/a.txt
        @@ -1 +1,2 @@
        -old
        +new
        +extra
        """
    )

    hunk = parse_diff(diff)[0].hunks[0]

    assert (hunk.old_start, hunk.old_count) == (1, 1)
    assert (hunk.new_start, hunk.new_count) == (1, 2)


def test_captures_section_heading() -> None:
    diff = _diff(
        """
        diff --git a/foo.py b/foo.py
        --- a/foo.py
        +++ b/foo.py
        @@ -10,3 +10,3 @@ def foo():
             a = 1
        -    b = 2
        +    b = 3
        """
    )

    hunk = parse_diff(diff)[0].hunks[0]

    assert hunk.header == "def foo():"


def test_multiple_hunks_single_file() -> None:
    diff = _diff(
        """
        diff --git a/foo.py b/foo.py
        --- a/foo.py
        +++ b/foo.py
        @@ -1,2 +1,2 @@
         one
        -two
        +TWO
        @@ -10,2 +10,2 @@
         ten
        -eleven
        +ELEVEN
        """
    )

    file = parse_diff(diff)[0]

    assert len(file.hunks) == 2
    assert file.hunks[0].new_start == 1
    assert file.hunks[1].new_start == 10


def test_multiple_files() -> None:
    diff = _diff(
        """
        diff --git a/a.txt b/a.txt
        --- a/a.txt
        +++ b/a.txt
        @@ -1 +1 @@
        -a
        +A
        diff --git a/b.txt b/b.txt
        --- a/b.txt
        +++ b/b.txt
        @@ -1 +1 @@
        -b
        +B
        """
    )

    files = parse_diff(diff)

    assert [f.path for f in files] == ["a.txt", "b.txt"]


def test_skips_no_newline_marker() -> None:
    diff = _diff(
        """
        diff --git a/a.txt b/a.txt
        --- a/a.txt
        +++ b/a.txt
        @@ -1 +1 @@
        -old
        \\ No newline at end of file
        +new
        \\ No newline at end of file
        """
    )

    rows = parse_diff(diff)[0].hunks[0].rows

    assert rows == (
        _row(1, None, RowType.DELETE, "old"),
        _row(None, 1, RowType.ADD, "new"),
    )


def test_empty_input_returns_empty_list() -> None:
    assert parse_diff("") == []


def test_malformed_hunk_header_raises() -> None:
    diff = _diff(
        """
        diff --git a/a.txt b/a.txt
        --- a/a.txt
        +++ b/a.txt
        @@ this is not a hunk header @@
         a
        """
    )

    with pytest.raises(DiffParseError):
        parse_diff(diff)


def _row(old: int | None, new: int | None, kind: RowType, content: str):  # type: ignore[no-untyped-def]
    from diffroom.git.diff_parser import Row

    return Row(old_line_no=old, new_line_no=new, type=kind, content=content)
