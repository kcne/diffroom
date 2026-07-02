import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThreadComposer } from "./ThreadComposer";
import type { Anchor } from "./anchor";

const anchor: Anchor = { file_path: "a.ts", side: "new", line: 2 };

function renderComposer(
  onSubmit: (anchor: Anchor, body: string) => Promise<void> = vi.fn().mockResolvedValue(undefined),
  onCancel = vi.fn(),
) {
  render(<ThreadComposer anchor={anchor} onSubmit={onSubmit} onCancel={onCancel} />);
  return {
    textarea: screen.getByLabelText("Note"),
    comment: screen.getByRole("button", { name: "Comment" }),
    cancel: screen.getByRole("button", { name: "Cancel" }),
    onSubmit,
    onCancel,
  };
}

describe("ThreadComposer", () => {
  it("disables Comment until non-whitespace text is entered", () => {
    const { textarea, comment } = renderComposer();
    expect(comment).toBeDisabled();
    fireEvent.change(textarea, { target: { value: "   " } });
    expect(comment).toBeDisabled();
    fireEvent.change(textarea, { target: { value: "looks off" } });
    expect(comment).toBeEnabled();
  });

  it("submits the trimmed body with the anchor", async () => {
    const { textarea, comment, onSubmit } = renderComposer();
    fireEvent.change(textarea, { target: { value: "  looks off  " } });
    fireEvent.click(comment);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(anchor, "looks off"));
  });

  it("cancels on the Cancel button and on Escape", () => {
    const { textarea, cancel, onCancel } = renderComposer();
    fireEvent.click(cancel);
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("shows an inline error and keeps the text when submit fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    const { textarea, comment } = renderComposer(onSubmit);
    fireEvent.change(textarea, { target: { value: "note" } });
    fireEvent.click(comment);
    await waitFor(() => expect(screen.getByText(/could not save/i)).toBeInTheDocument());
    expect((textarea as HTMLTextAreaElement).value).toBe("note");
  });
});
