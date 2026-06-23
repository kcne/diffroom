import { beforeEach, describe, expect, it } from "vitest";
import { captureToken, getToken } from "./token";

describe("captureToken", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("captures the token from the query, stores it, and strips it from the URL", () => {
    window.history.replaceState({}, "", "/?token=abc123&keep=1");

    const token = captureToken();

    expect(token).toBe("abc123");
    expect(getToken()).toBe("abc123");
    expect(window.location.search).not.toContain("token");
    expect(window.location.search).toContain("keep=1");
  });

  it("falls back to the stored token when no query token is present", () => {
    sessionStorage.setItem("diffroom_token", "stored-token");

    expect(captureToken()).toBe("stored-token");
  });

  it("returns null when there is no token anywhere", () => {
    expect(captureToken()).toBeNull();
  });
});
