// @vitest-environment jsdom
/* global vi, beforeEach, afterEach, it, expect */
import { act, renderHook, cleanup } from "@testing-library/react";
import useCalendarData from "../src/hooks/useCalendarData";
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  auth: { memberUrn: "account-a" },
}));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("../src/auth/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../src/api", () => ({ default: api }));
let visibility;
const initial = [
  { _id: "a-post", status: "queued", publishAt: "2026-10-23T06:00:00Z" },
];
const postCalls = () =>
  api.get.mock.calls.filter(([url]) => url === "/api/ai-posts");
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  auth.isAuthenticated = true;
  auth.auth = { memberUrn: "account-a" };
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.includes("settings")
        ? { timezone: "Asia/Kolkata" }
        : { data: initial, pagination: { totalPages: 1 } },
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function settle() {
  await act(async () => {});
}
async function tick(ms = 45000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
function changeVisibility(value) {
  visibility = value;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}
it("loads once, refreshes after 45 seconds, and never mutates posts", async () => {
  const { result } = renderHook(() => useCalendarData());
  await settle();
  expect(result.current.posts).toEqual(initial);
  expect(postCalls()).toHaveLength(1);
  await tick();
  expect(postCalls()).toHaveLength(2);
  expect(
    api.get.mock.calls.filter(([url]) => url.includes("settings")),
  ).toHaveLength(1);
  expect(api.post).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
});
it("makes no protected requests before authentication or after logout", async () => {
  auth.isAuthenticated = false;
  auth.auth = null;
  const { result, rerender } = renderHook(() => useCalendarData());
  await settle();
  await tick();
  act(() => {
    result.current.refresh();
  });
  expect(api.get).not.toHaveBeenCalled();
  auth.isAuthenticated = true;
  auth.auth = { memberUrn: "account-a" };
  rerender();
  await settle();
  expect(postCalls()).toHaveLength(1);
  auth.isAuthenticated = false;
  rerender();
  await tick(90000);
  expect(postCalls()).toHaveLength(1);
  expect(result.current.posts).toBeNull();
});
it("waits while hidden and resumes when visible", async () => {
  visibility = "hidden";
  const { result } = renderHook(() => useCalendarData());
  await settle();
  await tick(90000);
  expect(api.get).not.toHaveBeenCalled();
  changeVisibility("visible");
  await settle();
  expect(result.current.posts).toEqual(initial);
  changeVisibility("hidden");
  await tick(90000);
  expect(postCalls()).toHaveLength(1);
  changeVisibility("visible");
  await settle();
  expect(postCalls()).toHaveLength(2);
});
it("aborts in-flight requests when hidden and discards cancelled results", async () => {
  let resolve;
  api.get.mockImplementation((url) =>
    url.includes("settings")
      ? Promise.resolve({ data: { timezone: "Asia/Kolkata" } })
      : new Promise((done) => {
          resolve = done;
        }),
  );
  const { result } = renderHook(() => useCalendarData());
  await settle();
  const signal = postCalls()[0][1].signal;
  changeVisibility("hidden");
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: { data: initial } }));
  expect(result.current.posts).toBeNull();
});
it("does not overlap manual refresh and a pending page request", async () => {
  const { result } = renderHook(() => useCalendarData());
  await settle();
  let resolve;
  api.get.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  act(() => {
    result.current.refresh();
    result.current.refresh();
  });
  await tick(90000);
  expect(postCalls()).toHaveLength(2);
  expect(result.current.refreshing).toBe(true);
  expect(result.current.posts).toEqual(initial);
  await act(async () =>
    resolve({ data: { data: initial, pagination: { totalPages: 1 } } }),
  );
  expect(result.current.refreshing).toBe(false);
});
it("keeps data on a background error and allows manual retry", async () => {
  const { result } = renderHook(() => useCalendarData());
  await settle();
  api.get.mockRejectedValueOnce(new Error("Network unavailable"));
  await tick();
  expect(result.current.posts).toEqual(initial);
  expect(result.current.error).toContain("Could not refresh");
  act(() => {
    result.current.refresh();
  });
  await settle();
  expect(result.current.error).toBe("");
  expect(postCalls()).toHaveLength(3);
});
it("suspends polling after one authentication failure", async () => {
  const { result } = renderHook(() => useCalendarData());
  await settle();
  api.get.mockRejectedValueOnce({
    authHandled: true,
    response: { status: 401 },
  });
  await tick();
  expect(result.current.suspended).toBe(true);
  await tick(180000);
  act(() => {
    result.current.refresh();
  });
  await settle();
  expect(postCalls()).toHaveLength(2);
});
it("aborts old account requests and never exposes their late response", async () => {
  const { result, rerender } = renderHook(() => useCalendarData());
  await settle();
  let resolveOld;
  api.get.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolveOld = done;
      }),
  );
  act(() => {
    result.current.refresh();
  });
  const oldSignal = postCalls().at(-1)[1].signal;
  auth.auth = { memberUrn: "account-b" };
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.includes("settings")
        ? { timezone: "America/New_York" }
        : { data: [{ _id: "b-post" }], pagination: { totalPages: 1 } },
    }),
  );
  rerender();
  expect(result.current.posts).toBeNull();
  expect(oldSignal.aborted).toBe(true);
  await settle();
  expect(result.current.posts).toEqual([{ _id: "b-post" }]);
  await act(async () => resolveOld({ data: { data: initial } }));
  expect(result.current.posts).toEqual([{ _id: "b-post" }]);
});
it("stops timers and aborts requests when the page unmounts", async () => {
  const { unmount } = renderHook(() => useCalendarData());
  await settle();
  const signal = postCalls()[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  await tick(180000);
  expect(postCalls()).toHaveLength(1);
});
