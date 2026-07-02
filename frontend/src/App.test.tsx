import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiffResponse, ThreadOut, ThreadsResponse } from "./lib/api";
import { createThread, fetchDiff, fetchThreads } from "./lib/api";
import { App } from "./App";

vi.mock("./lib/api", () => ({
  fetchDiff: vi.fn(),
  fetchThreads: vi.fn(),
  createThread: vi.fn(),
}));

const sample: DiffResponse = {
  scope: "unstaged",
  files: [
    {
      path: "src/app.ts",
      old_path: "src/app.ts",
      hunks: [
        {
          old_start: 1,
          old_count: 1,
          new_start: 1,
          new_count: 2,
          header: "",
          rows: [
            { old_line_no: 1, new_line_no: 1, type: "context", content: "before" },
            { old_line_no: null, new_line_no: 2, type: "add", content: "changed line" },
          ],
        },
      ],
    },
  ],
};

const emptyThreads: ThreadsResponse = { scope: "unstaged", threads: [] };

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<App />, { wrapper });
}

describe("App", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("renders the diff rows on success", async () => {
    vi.mocked(fetchDiff).mockResolvedValue(sample);
    vi.mocked(fetchThreads).mockResolvedValue(emptyThreads);
    renderApp();

    await waitFor(() => expect(screen.getByText("changed line")).toBeInTheDocument());
    expect(screen.getByText("src/app.ts")).toBeInTheDocument();
  });

  it("shows an error alert when the diff request fails", async () => {
    vi.mocked(fetchDiff).mockRejectedValue(new Error("nope"));
    vi.mocked(fetchThreads).mockResolvedValue(emptyThreads);
    renderApp();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("creates a thread with the clicked row's anchor and body", async () => {
    vi.mocked(fetchDiff).mockResolvedValue(sample);
    vi.mocked(fetchThreads).mockResolvedValue(emptyThreads);
    const created: ThreadOut = {
      id: 1,
      scope: "unstaged",
      file_path: "src/app.ts",
      side: "new",
      line: 2,
      created_at: "2024-01-01T00:00:00+00:00",
      comments: [{ id: 1, body: "please fix", created_at: "2024-01-01T00:00:00+00:00" }],
    };
    vi.mocked(createThread).mockResolvedValue(created);
    renderApp();

    await waitFor(() => expect(screen.getByText("changed line")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /add a note on line 2/i }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "please fix" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));

    await waitFor(() =>
      expect(createThread).toHaveBeenCalledWith({
        file_path: "src/app.ts",
        side: "new",
        line: 2,
        body: "please fix",
      }),
    );
    await waitFor(() => expect(screen.queryByLabelText("Note")).not.toBeInTheDocument());
  });
});
