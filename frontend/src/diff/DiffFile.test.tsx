import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DiffFile as DiffFileModel } from "@/lib/api";
import { DiffFile } from "./DiffFile";

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

describe("DiffFile", () => {
  it("renders the file path header", () => {
    render(<DiffFile file={file} />);
    expect(screen.getByText("src/foo.ts")).toBeInTheDocument();
  });

  it("renders a hunk header with @@ coordinates and the section text", () => {
    render(<DiffFile file={file} />);
    expect(screen.getByText("@@ -1,2 +1,3 @@ function foo")).toBeInTheDocument();
  });

  it("omits the section text when the hunk header is empty", () => {
    const noHeader: DiffFileModel = {
      ...file,
      hunks: [{ ...file.hunks[0], header: "" }],
    };
    render(<DiffFile file={noHeader} />);
    expect(screen.getByText("@@ -1,2 +1,3 @@")).toBeInTheDocument();
  });

  it("renders the hunk rows", () => {
    render(<DiffFile file={file} />);
    expect(screen.getByText("keep")).toBeInTheDocument();
    expect(screen.getByText("inserted")).toBeInTheDocument();
  });
});
