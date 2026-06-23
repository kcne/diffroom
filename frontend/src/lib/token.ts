const TOKEN_KEY = "diffroom_token";

/**
 * Capture the session token from the URL on first load.
 *
 * If `?token=...` is present it is persisted to sessionStorage and stripped
 * from the visible URL so it does not linger in the address bar. Otherwise the
 * previously stored token (if any) is returned.
 */
export function captureToken(): string | null {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("token");
  if (fromQuery) {
    sessionStorage.setItem(TOKEN_KEY, fromQuery);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    return fromQuery;
  }
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
