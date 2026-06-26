from __future__ import annotations

from pathlib import Path

from diffroom.store import Side, Store


def test_create_thread_returns_thread_with_first_comment(tmp_path: Path) -> None:
    store = Store(tmp_path / "state.db")

    thread = store.create_thread("unstaged", "foo.py", Side.NEW, 12, "needs a guard")

    assert thread.id >= 1
    assert thread.scope == "unstaged"
    assert thread.file_path == "foo.py"
    assert thread.side == Side.NEW
    assert thread.line == 12
    assert thread.created_at
    assert len(thread.comments) == 1
    comment = thread.comments[0]
    assert comment.id >= 1
    assert comment.body == "needs a guard"
    assert comment.created_at


def test_list_threads_orders_by_creation_with_comments(tmp_path: Path) -> None:
    store = Store(tmp_path / "state.db")
    first = store.create_thread("unstaged", "a.py", Side.NEW, 1, "first")
    second = store.create_thread("unstaged", "b.py", Side.OLD, 5, "second")

    threads = store.list_threads("unstaged")

    assert [t.id for t in threads] == [first.id, second.id]
    assert threads[0].comments[0].body == "first"
    assert threads[1].side == Side.OLD
    assert threads[1].comments[0].body == "second"


def test_list_threads_empty_returns_empty_list(tmp_path: Path) -> None:
    store = Store(tmp_path / "state.db")

    assert store.list_threads("unstaged") == []


def test_list_threads_filters_by_scope(tmp_path: Path) -> None:
    store = Store(tmp_path / "state.db")
    store.create_thread("unstaged", "a.py", Side.NEW, 1, "note")

    assert store.list_threads("staged") == []
    assert len(store.list_threads("unstaged")) == 1


def test_store_creates_missing_parent_dir_and_schema(tmp_path: Path) -> None:
    db_path = tmp_path / "nested" / "diffroom" / "state.db"

    store = Store(db_path)
    store.create_thread("unstaged", "a.py", Side.NEW, 1, "note")

    assert db_path.exists()


def test_reopening_existing_db_preserves_threads(tmp_path: Path) -> None:
    db_path = tmp_path / "state.db"
    Store(db_path).create_thread("unstaged", "a.py", Side.NEW, 1, "note")

    reopened = Store(db_path)

    threads = reopened.list_threads("unstaged")
    assert len(threads) == 1
    assert threads[0].comments[0].body == "note"
