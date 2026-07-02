import { describe, expect, it } from "vitest";
import type { Row } from "@/lib/api";
import { anchorKey, rowAnchor, sameAnchor, threadsForAnchor } from "./anchor";

describe("rowAnchor", () => {
  it("anchors an add row to the new side and new line number", () => {
    const row: Row = { old_line_no: null, new_line_no: 5, type: "add", content: "x" };
    expect(rowAnchor("a.ts", row)).toEqual({ file_path: "a.ts", side: "new", line: 5 });
  });

  it("anchors a delete row to the old side and old line number", () => {
    const row: Row = { old_line_no: 7, new_line_no: null, type: "delete", content: "x" };
    expect(rowAnchor("a.ts", row)).toEqual({ file_path: "a.ts", side: "old", line: 7 });
  });

  it("anchors a context row to the new side", () => {
    const row: Row = { old_line_no: 3, new_line_no: 4, type: "context", content: "x" };
    expect(rowAnchor("a.ts", row)).toEqual({ file_path: "a.ts", side: "new", line: 4 });
  });
});

describe("threadsForAnchor", () => {
  const threads = [
    { file_path: "a.ts", side: "new" as const, line: 4, id: 1 },
    { file_path: "a.ts", side: "old" as const, line: 4, id: 2 },
    { file_path: "b.ts", side: "new" as const, line: 4, id: 3 },
    { file_path: "a.ts", side: "new" as const, line: 4, id: 4 },
  ];

  it("keeps only threads matching file_path, side, and line", () => {
    const matched = threadsForAnchor(threads, { file_path: "a.ts", side: "new", line: 4 });
    expect(matched.map((t) => t.id)).toEqual([1, 4]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(threadsForAnchor(threads, { file_path: "a.ts", side: "new", line: 99 })).toEqual([]);
  });
});

describe("anchorKey", () => {
  it("distinguishes anchors by file, side, and line", () => {
    const base = { file_path: "a.ts", side: "new" as const, line: 4 };
    expect(anchorKey(base)).toBe(anchorKey({ ...base }));
    expect(anchorKey(base)).not.toBe(anchorKey({ ...base, side: "old" }));
    expect(anchorKey(base)).not.toBe(anchorKey({ ...base, line: 5 }));
    expect(anchorKey(base)).not.toBe(anchorKey({ ...base, file_path: "b.ts" }));
  });
});

describe("sameAnchor", () => {
  it("is true for identical anchors and false otherwise", () => {
    const a = { file_path: "a.ts", side: "new" as const, line: 4 };
    expect(sameAnchor(a, { ...a })).toBe(true);
    expect(sameAnchor(a, { ...a, line: 5 })).toBe(false);
    expect(sameAnchor(a, null)).toBe(false);
    expect(sameAnchor(null, null)).toBe(false);
  });
});
