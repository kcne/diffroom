import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Anchor } from "./anchor";

interface ThreadComposerProps {
  anchor: Anchor;
  onSubmit: (anchor: Anchor, body: string) => Promise<void>;
  onCancel: () => void;
}

export function ThreadComposer({ anchor, onSubmit, onCancel }: ThreadComposerProps) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = body.trim().length > 0 && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(anchor, body.trim());
    } catch {
      setError("Could not save the note. Try again.");
      setSaving(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div data-slot="thread-composer" className="space-y-2 p-2">
      <textarea
        autoFocus
        aria-label="Note"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Leave a note…"
        className="min-h-16 w-full rounded-md border bg-background p-2 font-sans text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error ? (
        <p data-slot="thread-composer-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" disabled={!canSubmit} onClick={() => void submit()}>
          {saving ? "Saving…" : "Comment"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
