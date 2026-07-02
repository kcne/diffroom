import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DiffResponse, ThreadOut } from "@/lib/api";
import { DiffView } from "./DiffView";

const file = (path: string) => ({
  path,
  old_path: path,
  hunks: [
    {
      old_start: 1,
      old_count: 2,
      new_start: 1,
      new_count: 2,
      header: "",
      rows: [
        { old_line_no: 1, new_line_no: 1, type: "context" as const, content: "code" },
        { old_line_no: null, new_line_no: 2, type: "add" as const, content: "added" },
      ],
    },
  ],
});

describe("DiffView", () => {
  it("renders a section for each file", () => {
    const diff: DiffResponse = { scope: "unstaged", files: [file("a.ts"), file("b.ts")] };
    render(<DiffView diff={diff} />);
    expect(screen.getByText("a.ts")).toBeInTheDocument();
    expect(screen.getByText("b.ts")).toBeInTheDocument();
  });

  it("shows the scope badge", () => {
    const diff: DiffResponse = { scope: "unstaged", files: [file("a.ts")] };
    render(<DiffView diff={diff} />);
    expect(screen.getByText("unstaged")).toBeInTheDocument();
  });

  it("renders an empty state when there are no files", () => {
    const diff: DiffResponse = { scope: "unstaged", files: [] };
    render(<DiffView diff={diff} />);
    expect(screen.getByText(/no changes/i)).toBeInTheDocument();
  });

  it("renders threads routed to the file they belong to", () => {
    const diff: DiffResponse = { scope: "unstaged", files: [file("a.ts"), file("b.ts")] };
    const threads: ThreadOut[] = [
      {
        id: 1,
        scope: "unstaged",
        file_path: "b.ts",
        side: "new",
        line: 2,
        created_at: "2024-01-01T00:00:00+00:00",
        comments: [{ id: 1, body: "note on b", created_at: "2024-01-01T00:00:00+00:00" }],
      },
    ];
    render(<DiffView diff={diff} threads={threads} />);
    expect(screen.getByText("note on b")).toBeInTheDocument();
  });

  it("keeps only one composer open at a time", () => {
    const diff: DiffResponse = { scope: "unstaged", files: [file("a.ts")] };
    render(<DiffView diff={diff} />);
    const [firstAdd, secondAdd] = screen.getAllByRole("button", { name: /add a note/i });

    fireEvent.click(firstAdd);
    expect(screen.getAllByLabelText("Note")).toHaveLength(1);

    fireEvent.click(secondAdd);
    expect(screen.getAllByLabelText("Note")).toHaveLength(1);
  });
});
