import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { DiffResponse, ThreadOut } from "@/lib/api";
import { DiffFile } from "./DiffFile";
import type { Anchor } from "./anchor";

interface DiffViewProps {
  diff: DiffResponse;
  threads?: ThreadOut[];
  onSubmit?: (anchor: Anchor, body: string) => Promise<void>;
}

export function DiffView({ diff, threads = [], onSubmit }: DiffViewProps) {
  const [activeAnchor, setActiveAnchor] = useState<Anchor | null>(null);

  async function submit(anchor: Anchor, body: string) {
    await onSubmit?.(anchor, body);
    setActiveAnchor(null);
  }

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
        <DiffFile
          key={file.path}
          file={file}
          threads={threads.filter((t) => t.file_path === file.path)}
          activeAnchor={activeAnchor}
          onStartCompose={setActiveAnchor}
          onCancelCompose={() => setActiveAnchor(null)}
          onSubmit={submit}
        />
      ))}
    </div>
  );
}
