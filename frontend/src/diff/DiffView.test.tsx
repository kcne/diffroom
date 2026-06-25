import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DiffResponse } from "@/lib/api";
import { DiffView } from "./DiffView";

const file = (path: string) => ({
  path,
  old_path: path,
  hunks: [
    {
      old_start: 1,
      old_count: 1,
      new_start: 1,
      new_count: 1,
      header: "",
      rows: [{ old_line_no: 1, new_line_no: 1, type: "context" as const, content: "code" }],
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
});
