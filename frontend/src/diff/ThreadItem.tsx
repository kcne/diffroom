import type { ThreadOut } from "@/lib/api";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function ThreadItem({ thread }: { thread: ThreadOut }) {
  const first = thread.comments[0];
  return (
    <div data-slot="thread-item" className="space-y-1 rounded-md border bg-muted/40 p-2">
      {thread.comments.map((comment) => (
        <div key={comment.id} className="space-y-0.5">
          <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
          <p className="text-xs text-muted-foreground">{formatTimestamp(comment.created_at)}</p>
        </div>
      ))}
      {first ? null : <p className="text-sm text-muted-foreground italic">Empty note.</p>}
    </div>
  );
}
