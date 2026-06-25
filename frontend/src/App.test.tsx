import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiffResponse } from "./lib/api";
import { fetchDiff } from "./lib/api";
import { App } from "./App";

vi.mock("./lib/api", () => ({ fetchDiff: vi.fn() }));

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
    renderApp();

    await waitFor(() => expect(screen.getByText("changed line")).toBeInTheDocument());
    expect(screen.getByText("src/app.ts")).toBeInTheDocument();
  });

  it("shows an error alert when the diff request fails", async () => {
    vi.mocked(fetchDiff).mockRejectedValue(new Error("nope"));
    renderApp();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
