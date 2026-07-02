import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Row } from "@/lib/api";
import { DiffRow } from "./DiffRow";

function renderRow(row: Row, onStartCompose = vi.fn()) {
  const { container } = render(
    <table>
      <tbody>
        <DiffRow row={row} filePath="a.ts" onStartCompose={onStartCompose} />
      </tbody>
    </table>,
  );
  const tr = container.querySelector('[data-slot="diff-row"]');
  if (!tr) throw new Error("row not rendered");
  return { tr, cells: tr.querySelectorAll("td"), onStartCompose };
}

describe("DiffRow", () => {
  it("renders an added line with a + marker, the new line number, and a blank old gutter", () => {
    const { tr, cells } = renderRow({
      old_line_no: null,
      new_line_no: 5,
      type: "add",
      content: "added code",
    });
    expect(tr.getAttribute("data-row-type")).toBe("add");
    expect(cells[1].textContent).toBe("");
    expect(cells[2].textContent).toBe("5");
    expect(cells[3].textContent).toContain("+");
    expect(cells[4].textContent).toBe("added code");
  });

  it("renders a removed line with a - marker and a blank new gutter", () => {
    const { tr, cells } = renderRow({
      old_line_no: 7,
      new_line_no: null,
      type: "delete",
      content: "removed code",
    });
    expect(tr.getAttribute("data-row-type")).toBe("delete");
    expect(cells[1].textContent).toBe("7");
    expect(cells[2].textContent).toBe("");
    expect(cells[3].textContent).toContain("-");
    expect(cells[4].textContent).toBe("removed code");
  });

  it("renders a context line with both numbers and no +/- marker", () => {
    const { tr, cells } = renderRow({
      old_line_no: 3,
      new_line_no: 3,
      type: "context",
      content: "unchanged",
    });
    expect(tr.getAttribute("data-row-type")).toBe("context");
    expect(cells[1].textContent).toBe("3");
    expect(cells[2].textContent).toBe("3");
    expect(cells[3].textContent?.trim()).toBe("");
    expect(cells[4].textContent).toBe("unchanged");
  });

  it("calls onStartCompose with the row's anchor when the + button is clicked", () => {
    const { tr, onStartCompose } = renderRow({
      old_line_no: null,
      new_line_no: 5,
      type: "add",
      content: "added code",
    });
    fireEvent.click(tr.querySelector("button")!);
    expect(onStartCompose).toHaveBeenCalledWith({ file_path: "a.ts", side: "new", line: 5 });
  });
});
