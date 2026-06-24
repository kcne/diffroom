import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows backend status and version from /api/health", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          version: "9.9.9",
          repo_root: "/home/me/project",
          branch: "main",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("Backend: ok (v9.9.9)");
    });
    expect(screen.getByTestId("repo")).toHaveTextContent("/home/me/project @ main");
  });

  it("shows an error when the health request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });
  });
});
