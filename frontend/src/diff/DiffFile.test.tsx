import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DiffFile as DiffFileModel, ThreadOut } from "@/lib/api";
import { DiffFile } from "./DiffFile";
import type { Anchor } from "./anchor";

const file: DiffFileModel = {
  path: "src/foo.ts",
  old_path: "src/foo.ts",
  hunks: [
    {
      old_start: 1,
      old_count: 2,
      new_start: 1,
      new_count: 3,
      header: "function foo",
      rows: [
        { old_line_no: 1, new_line_no: 1, type: "context", content: "keep" },
        { old_line_no: null, new_line_no: 2, type: "add", content: "inserted" },
      ],
    },
  ],
};

function renderFile(props: Partial<React.ComponentProps<typeof DiffFile>> = {}) {
  return render(
    <DiffFile
      file={file}
      threads={[]}
      activeAnchor={null}
      onStartCompose={vi.fn()}
      onCancelCompose={vi.fn()}
      onSubmit={vi.fn()}
      {...props}
    />,
  );
}

const thread = (line: number, body: string): ThreadOut => ({
  id: line,
  scope: "unstaged",
  file_path: "src/foo.ts",
  side: "new",
  line,
  created_at: "2024-01-01T00:00:00+00:00",
  comments: [{ id: line, body, created_at: "2024-01-01T00:00:00+00:00" }],
});

describe("DiffFile", () => {
  it("renders the file path header", () => {
    renderFile();
    expect(screen.getByText("src/foo.ts")).toBeInTheDocument();
  });

  it("renders a hunk header with @@ coordinates and the section text", () => {
    renderFile();
    expect(screen.getByText("@@ -1,2 +1,3 @@ function foo")).toBeInTheDocument();
  });

  it("omits the section text when the hunk header is empty", () => {
    render(
      <DiffFile
        file={{ ...file, hunks: [{ ...file.hunks[0], header: "" }] }}
        threads={[]}
        activeAnchor={null}
        onStartCompose={vi.fn()}
        onCancelCompose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("@@ -1,2 +1,3 @@")).toBeInTheDocument();
  });

  it("renders the hunk rows", () => {
    renderFile();
    expect(screen.getByText("keep")).toBeInTheDocument();
    expect(screen.getByText("inserted")).toBeInTheDocument();
  });

  it("renders an existing thread inline under the line it anchors to", () => {
    renderFile({ threads: [thread(2, "please rename this")] });
    expect(screen.getByText("please rename this")).toBeInTheDocument();
  });

  it("surfaces threads whose anchored line is not in the diff in a fallback section", () => {
    renderFile({ threads: [thread(99, "orphaned note")] });
    expect(screen.getByText("orphaned note")).toBeInTheDocument();
    expect(screen.getByText(/lines not shown/i)).toBeInTheDocument();
  });

  it("clicking a row's + button starts compose with that row's anchor", () => {
    const onStartCompose = vi.fn();
    renderFile({ onStartCompose });
    const addButton = screen.getByRole("button", { name: /add a note on line 2/i });
    fireEvent.click(addButton);
    expect(onStartCompose).toHaveBeenCalledWith({ file_path: "src/foo.ts", side: "new", line: 2 });
  });

  it("renders the composer under the active anchor line", () => {
    const anchor: Anchor = { file_path: "src/foo.ts", side: "new", line: 2 };
    renderFile({ activeAnchor: anchor });
    expect(screen.getByLabelText("Note")).toBeInTheDocument();
  });
});
