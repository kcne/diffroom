import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThread,
  fetchDiff,
  fetchThreads,
  type DiffResponse,
  type ThreadOut,
  type ThreadsResponse,
} from "./api";

const sampleDiff: DiffResponse = {
  scope: "unstaged",
  files: [
    {
      path: "foo.txt",
      old_path: "foo.txt",
      hunks: [
        {
          old_start: 1,
          old_count: 3,
          new_start: 1,
          new_count: 3,
          header: "",
          rows: [
            { old_line_no: 1, new_line_no: 1, type: "context", content: "first" },
            { old_line_no: 2, new_line_no: null, type: "delete", content: "second" },
            { old_line_no: null, new_line_no: 2, type: "add", content: "second changed" },
          ],
        },
      ],
    },
  ],
};

describe("fetchDiff", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("diffroom_token", "tok123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests /api/diff with the bearer token and returns the typed body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleDiff), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDiff();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/diff");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok123");
    expect(result).toEqual(sampleDiff);
    expect(result.files[0].hunks[0].rows[1].type).toBe("delete");
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 400 })));
    await expect(fetchDiff()).rejects.toThrow("diff request failed: 400");
  });
});

const sampleThread: ThreadOut = {
  id: 1,
  scope: "unstaged",
  file_path: "foo.txt",
  side: "new",
  line: 2,
  created_at: "2024-01-01T00:00:00+00:00",
  comments: [{ id: 1, body: "looks off", created_at: "2024-01-01T00:00:00+00:00" }],
};

describe("fetchThreads", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("diffroom_token", "tok123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests /api/threads with the bearer token and returns the typed body", async () => {
    const body: ThreadsResponse = { scope: "unstaged", threads: [sampleThread] };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchThreads();

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/threads");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok123");
    expect(result).toEqual(body);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 400 })));
    await expect(fetchThreads()).rejects.toThrow("threads request failed: 400");
  });
});

describe("createThread", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("diffroom_token", "tok123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs the note with the token and JSON body and returns the created thread", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleThread), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createThread({
      file_path: "foo.txt",
      side: "new",
      line: 2,
      body: "looks off",
    });

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/threads");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok123");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      file_path: "foo.txt",
      side: "new",
      line: 2,
      body: "looks off",
    });
    expect(result).toEqual(sampleThread);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 422 })));
    await expect(
      createThread({ file_path: "foo.txt", side: "new", line: 2, body: "x" }),
    ).rejects.toThrow("create thread failed: 422");
  });
});
