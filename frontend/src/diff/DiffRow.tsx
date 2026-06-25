import { cn } from "@/lib/utils";
import type { Row } from "@/lib/api";

const MARKER: Record<Row["type"], string> = {
  add: "+",
  delete: "-",
  context: " ",
};

const SR_LABEL: Record<Row["type"], string> = {
  add: "added line",
  delete: "removed line",
  context: "",
};

const ROW_STYLE: Record<Row["type"], string> = {
  add: "bg-green-50 dark:bg-green-950/40",
  delete: "bg-red-50 dark:bg-red-950/40",
  context: "",
};

const GUTTER =
  "w-12 select-none border-r px-2 text-right align-top tabular-nums text-muted-foreground";

export function DiffRow({ row }: { row: Row }) {
  return (
    <tr
      data-slot="diff-row"
      data-row-type={row.type}
      className={cn("font-mono text-sm leading-relaxed", ROW_STYLE[row.type])}
    >
      <td className={GUTTER}>{row.old_line_no ?? ""}</td>
      <td className={GUTTER}>{row.new_line_no ?? ""}</td>
      <td className="w-5 select-none px-1 text-center align-top text-muted-foreground">
        <span aria-hidden>{MARKER[row.type]}</span>
        {SR_LABEL[row.type] ? <span className="sr-only">{SR_LABEL[row.type]}</span> : null}
      </td>
      <td className="w-full px-2 align-top whitespace-pre-wrap">{row.content}</td>
    </tr>
  );
}
