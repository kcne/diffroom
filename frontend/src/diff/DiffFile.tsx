import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiffFile as DiffFileModel, Hunk } from "@/lib/api";
import { DiffRow } from "./DiffRow";

function hunkHeader(hunk: Hunk): string {
  const coords = `@@ -${hunk.old_start},${hunk.old_count} +${hunk.new_start},${hunk.new_count} @@`;
  return hunk.header ? `${coords} ${hunk.header}` : coords;
}

export function DiffFile({ file }: { file: DiffFileModel }) {
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
                    colSpan={4}
                    className="bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {hunkHeader(hunk)}
                  </td>
                </tr>
                {hunk.rows.map((row, j) => (
                  <DiffRow key={j} row={row} />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
