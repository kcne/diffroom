import type { Row, Side } from "@/lib/api";

/** A note's line anchor: a file, a side, and a 1-based line number. */
export interface Anchor {
  file_path: string;
  side: Side;
  line: number;
}

/**
 * Map a diff row to the line it should anchor a note to.
 *
 * `add` and `context` rows resolve to the new side (the post-change state);
 * `delete` rows resolve to the old side. Every row has a line number on its
 * resolved side, so this is total.
 */
export function rowAnchor(filePath: string, row: Row): Anchor {
  if (row.type === "delete") {
    return { file_path: filePath, side: "old", line: row.old_line_no ?? 0 };
  }
  return { file_path: filePath, side: "new", line: row.new_line_no ?? 0 };
}

/** Threads anchored to the given line, in creation order. */
export function threadsForAnchor<T extends Anchor>(threads: T[], anchor: Anchor): T[] {
  return threads.filter(
    (t) => t.file_path === anchor.file_path && t.side === anchor.side && t.line === anchor.line,
  );
}

/** A stable key for an anchor, for set membership / dedup. */
export function anchorKey(anchor: Anchor): string {
  return `${anchor.file_path}\u0000${anchor.side}\u0000${anchor.line}`;
}

/** Whether two anchors point at the same line. */
export function sameAnchor(a: Anchor | null, b: Anchor | null): boolean {
  if (!a || !b) return false;
  return a.file_path === b.file_path && a.side === b.side && a.line === b.line;
}
