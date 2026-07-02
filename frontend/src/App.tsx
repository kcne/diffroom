import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DiffView } from "./diff/DiffView";
import { useDiff } from "./diff/useDiff";
import { useCreateThread, useThreads } from "./diff/useThreads";
import type { Anchor } from "./diff/anchor";

export function App() {
  const { data, isPending, isError, error } = useDiff();
  const threads = useThreads();
  const createThread = useCreateThread();

  async function onSubmit(anchor: Anchor, body: string) {
    await createThread.mutateAsync({ ...anchor, body });
  }

  let content: ReactNode = null;
  if (isPending) {
    content = (
      <div data-slot="diff-loading" className="space-y-2" aria-busy="true">
        <span className="text-sm text-muted-foreground">Loading diff…</span>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (isError) {
    content = (
      <Alert variant="destructive" data-slot="diff-error">
        <AlertTitle>Could not load the diff</AlertTitle>
        <AlertDescription>{String(error)}</AlertDescription>
      </Alert>
    );
  } else if (data) {
    content = <DiffView diff={data} threads={threads.data?.threads ?? []} onSubmit={onSubmit} />;
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">DiffRoom</h1>
      {content}
    </main>
  );
}
