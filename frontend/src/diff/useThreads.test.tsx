import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadOut, ThreadsResponse } from "@/lib/api";
import { createThread, fetchThreads } from "@/lib/api";
import { useCreateThread, useThreads } from "./useThreads";

vi.mock("@/lib/api", () => ({ fetchThreads: vi.fn(), createThread: vi.fn() }));

const thread: ThreadOut = {
  id: 1,
  scope: "unstaged",
  file_path: "a.ts",
  side: "new",
  line: 2,
  created_at: "2024-01-01T00:00:00+00:00",
  comments: [{ id: 1, body: "note", created_at: "2024-01-01T00:00:00+00:00" }],
};
const response: ThreadsResponse = { scope: "unstaged", threads: [thread] };

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useThreads", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("resolves to the typed threads body", async () => {
    vi.mocked(fetchThreads).mockResolvedValue(response);
    const { result } = renderHook(() => useThreads(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });
});

describe("useCreateThread", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("posts the note and refetches the threads list on success", async () => {
    vi.mocked(createThread).mockResolvedValue(thread);
    vi.mocked(fetchThreads).mockResolvedValue(response);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const wrap = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateThread(), { wrapper: wrap });
    await result.current.mutateAsync({ file_path: "a.ts", side: "new", line: 2, body: "note" });

    expect(createThread).toHaveBeenCalledWith({
      file_path: "a.ts",
      side: "new",
      line: 2,
      body: "note",
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["threads"] }));
  });
});
