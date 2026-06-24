import { useEffect, useState } from "react";
import { fetchHealth, type Health } from "./lib/api";
import { captureToken } from "./lib/token";

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureToken();
    fetchHealth()
      .then(setHealth)
      .catch((err: unknown) => setError(String(err)));
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8 font-sans">
      <h1 className="text-2xl font-bold">DiffRoom</h1>
      {health ? (
        <>
          <p data-testid="status" className="mt-2 text-green-700">
            Backend: {health.status} (v{health.version})
          </p>
          <p data-testid="repo" className="mt-1 text-sm text-gray-600">
            {health.repo_root}
            {health.branch ? ` @ ${health.branch}` : ""}
          </p>
        </>
      ) : error ? (
        <p data-testid="error" className="mt-2 text-red-700">
          Error: {error}
        </p>
      ) : (
        <p className="mt-2 text-gray-500">Connecting…</p>
      )}
    </main>
  );
}
