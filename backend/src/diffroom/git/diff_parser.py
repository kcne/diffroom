"""Pure parser: ``git diff`` unified text → structured ``files → hunks → rows``.

This is the functional core. It imports only the standard library and never
touches the subprocess, database, or network. The imperative shell
(:mod:`diffroom.git.commands`) feeds it raw text; later slices map these
dataclasses to Pydantic models for the API.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class DiffParseError(Exception):
    """The supplied text is not a structurally valid unified diff."""


class RowType(str, Enum):
    """The role a single diff row plays within a hunk."""

    CONTEXT = "context"
    ADD = "add"
    DELETE = "delete"


@dataclass(frozen=True, slots=True)
class Row:
    """One rendered line of a hunk.

    ``old_line_no`` is ``None`` for added lines; ``new_line_no`` is ``None`` for
    deleted lines; context lines carry both.
    """

    old_line_no: int | None
    new_line_no: int | None
    type: RowType
    content: str


@dataclass(frozen=True, slots=True)
class Hunk:
    """A contiguous block of changes with its ``@@`` ranges and rows."""

    old_start: int
    old_count: int
    new_start: int
    new_count: int
    header: str
    rows: tuple[Row, ...]


@dataclass(frozen=True, slots=True)
class DiffFile:
    """A single file's section of a diff. ``old_path`` equals ``path`` for plain modifications."""

    path: str
    old_path: str
    hunks: tuple[Hunk, ...]


_HUNK_HEADER = re.compile(
    r"^@@ -(?P<old_start>\d+)(?:,(?P<old_count>\d+))? "
    r"\+(?P<new_start>\d+)(?:,(?P<new_count>\d+))? @@(?: (?P<header>.*))?$"
)


def parse_diff(text: str) -> list[DiffFile]:
    """Parse unified ``git diff`` ``text`` into a list of :class:`DiffFile`.

    Returns ``[]`` for empty input. Raises :class:`DiffParseError` on
    structurally invalid input (a hunk or content line before any file header,
    or a malformed ``@@`` header).
    """
    files: list[DiffFile] = []
    lines = text.splitlines()
    index = 0
    total = len(lines)

    while index < total:
        line = lines[index]
        if line.startswith("diff --git") or line.startswith("--- "):
            file, index = _parse_file(lines, index)
            files.append(file)
        elif line.startswith("@@") or _is_content(line):
            raise DiffParseError(f"unexpected line before a file header: {line!r}")
        else:
            index += 1

    return files


def _parse_file(lines: list[str], index: int) -> tuple[DiffFile, int]:
    total = len(lines)
    old_path: str | None = None
    path: str | None = None

    while index < total:
        line = lines[index]
        if line.startswith("--- "):
            old_path = _strip_prefix(line[4:])
            index += 1
        elif line.startswith("+++ "):
            path = _strip_prefix(line[4:])
            index += 1
        elif line.startswith("@@"):
            break
        elif line.startswith("diff --git") and path is not None:
            break
        else:
            index += 1

    if path is None or old_path is None:
        raise DiffParseError("file section missing '--- a/' or '+++ b/' header")

    hunks: list[Hunk] = []
    while index < total and lines[index].startswith("@@"):
        hunk, index = _parse_hunk(lines, index)
        hunks.append(hunk)

    return DiffFile(path=path, old_path=old_path, hunks=tuple(hunks)), index


def _parse_hunk(lines: list[str], index: int) -> tuple[Hunk, int]:
    match = _HUNK_HEADER.match(lines[index])
    if match is None:
        raise DiffParseError(f"malformed hunk header: {lines[index]!r}")

    old_start = int(match.group("old_start"))
    old_count = int(match.group("old_count") or 1)
    new_start = int(match.group("new_start"))
    new_count = int(match.group("new_count") or 1)
    header = match.group("header") or ""

    index += 1
    total = len(lines)
    old_no = old_start
    new_no = new_start
    rows: list[Row] = []

    while index < total:
        line = lines[index]
        if line.startswith("@@") or line.startswith("diff --git"):
            break
        if line.startswith("\\"):
            index += 1
            continue
        if line.startswith("+"):
            rows.append(Row(None, new_no, RowType.ADD, line[1:]))
            new_no += 1
        elif line.startswith("-"):
            rows.append(Row(old_no, None, RowType.DELETE, line[1:]))
            old_no += 1
        elif line.startswith(" "):
            rows.append(Row(old_no, new_no, RowType.CONTEXT, line[1:]))
            old_no += 1
            new_no += 1
        else:
            break
        index += 1

    return (
        Hunk(
            old_start=old_start,
            old_count=old_count,
            new_start=new_start,
            new_count=new_count,
            header=header,
            rows=tuple(rows),
        ),
        index,
    )


def _is_content(line: str) -> bool:
    return bool(line) and line[0] in "+- "


def _strip_prefix(path: str) -> str:
    if path.startswith(("a/", "b/")):
        return path[2:]
    return path
