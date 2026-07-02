import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Row } from "@/lib/api";
import { rowAnchor, type Anchor } from "./anchor";

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

interface DiffRowProps {
  row: Row;
  filePath: string;
  onStartCompose: (anchor: Anchor) => void;
}

export function DiffRow({ row, filePath, onStartCompose }: DiffRowProps) {
  return (
    <tr
      data-slot="diff-row"
      data-row-type={row.type}
      className={cn("group font-mono text-sm leading-relaxed", ROW_STYLE[row.type])}
    >
      <td className="w-6 select-none px-0.5 align-top">
        <button
          type="button"
          aria-label={`Add a note on line ${row.new_line_no ?? row.old_line_no}`}
          onClick={() => onStartCompose(rowAnchor(filePath, row))}
          className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Plus className="size-3" />
        </button>
      </td>
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
