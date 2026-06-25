import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiffResponse } from "@/lib/api";
import { fetchDiff } from "@/lib/api";
import { useDiff } from "./useDiff";

vi.mock("@/lib/api", () => ({ fetchDiff: vi.fn() }));

const sample: DiffResponse = {
  scope: "unstaged",
  files: [
    {
      path: "a.ts",
      old_path: "a.ts",
      hunks: [
        {
          old_start: 1,
          old_count: 1,
          new_start: 1,
          new_count: 1,
          header: "",
          rows: [{ old_line_no: 1, new_line_no: 1, type: "context", content: "x" }],
        },
      ],
    },
  ],
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useDiff", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("resolves to the typed diff body", async () => {
    vi.mocked(fetchDiff).mockResolvedValue(sample);
    const { result } = renderHook(() => useDiff(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchDiff).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(sample);
  });

  it("surfaces an error when the request fails", async () => {
    vi.mocked(fetchDiff).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useDiff(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
