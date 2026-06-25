import { Badge } from "@/components/ui/badge";
import type { DiffResponse } from "@/lib/api";
import { DiffFile } from "./DiffFile";

export function DiffView({ diff }: { diff: DiffResponse }) {
  if (diff.files.length === 0) {
    return (
      <p data-slot="diff-empty" className="text-sm text-muted-foreground">
        No changes in the {diff.scope} diff.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Badge variant="secondary" data-slot="diff-scope">
        {diff.scope}
      </Badge>
      {diff.files.map((file) => (
        <DiffFile key={file.path} file={file} />
      ))}
    </div>
  );
}
