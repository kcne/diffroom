import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiffFile as DiffFileModel, Hunk, Row, ThreadOut } from "@/lib/api";
import { DiffRow } from "./DiffRow";
import { ThreadComposer } from "./ThreadComposer";
import { ThreadItem } from "./ThreadItem";
import { rowAnchor, sameAnchor, threadsForAnchor, anchorKey, type Anchor } from "./anchor";

const COL_SPAN = 5;

function hunkHeader(hunk: Hunk): string {
  const coords = `@@ -${hunk.old_start},${hunk.old_count} +${hunk.new_start},${hunk.new_count} @@`;
  return hunk.header ? `${coords} ${hunk.header}` : coords;
}

interface DiffFileProps {
  file: DiffFileModel;
  threads: ThreadOut[];
  activeAnchor: Anchor | null;
  onStartCompose: (anchor: Anchor) => void;
  onCancelCompose: () => void;
  onSubmit: (anchor: Anchor, body: string) => Promise<void>;
}

export function DiffFile({
  file,
  threads,
  activeAnchor,
  onStartCompose,
  onCancelCompose,
  onSubmit,
}: DiffFileProps) {
  function renderRow(row: Row, key: number) {
    const anchor = rowAnchor(file.path, row);
    const rowThreads = threadsForAnchor(threads, anchor);
    const composing = sameAnchor(activeAnchor, anchor);
    return (
      <Fragment key={key}>
        <DiffRow row={row} filePath={file.path} onStartCompose={onStartCompose} />
        {rowThreads.map((thread) => (
          <tr key={`thread-${thread.id}`} data-slot="thread-row">
            <td colSpan={COL_SPAN} className="border-t p-2">
              <ThreadItem thread={thread} />
            </td>
          </tr>
        ))}
        {composing ? (
          <tr data-slot="composer-row">
            <td colSpan={COL_SPAN} className="border-t">
              <ThreadComposer anchor={anchor} onSubmit={onSubmit} onCancel={onCancelCompose} />
            </td>
          </tr>
        ) : null}
      </Fragment>
    );
  }

  const renderedKeys = new Set(
    file.hunks.flatMap((hunk) => hunk.rows.map((row) => anchorKey(rowAnchor(file.path, row)))),
  );
  const orphanedThreads = threads.filter(
    (thread) =>
      thread.file_path === file.path &&
      !renderedKeys.has(
        anchorKey({ file_path: thread.file_path, side: thread.side, line: thread.line }),
      ),
  );

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/40 px-4 py-2">
        <CardTitle className="font-mono text-sm font-medium break-all">{file.path}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full border-collapse">
          <tbody>
            {file.hunks.map((hunk, i) => (
              <Fragment key={i}>
                <tr data-slot="hunk-header">
                  <td
                    colSpan={COL_SPAN}
                    className="bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {hunkHeader(hunk)}
                  </td>
                </tr>
                {hunk.rows.map((row, j) => renderRow(row, j))}
              </Fragment>
            ))}
            {orphanedThreads.length > 0 ? (
              <>
                <tr data-slot="orphaned-header">
                  <td
                    colSpan={COL_SPAN}
                    className="border-t bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    Notes on lines not shown in this diff
                  </td>
                </tr>
                {orphanedThreads.map((thread) => (
                  <tr key={`orphaned-${thread.id}`} data-slot="orphaned-thread-row">
                    <td colSpan={COL_SPAN} className="p-2">
                      <ThreadItem thread={thread} />
                    </td>
                  </tr>
                ))}
              </>
            ) : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
