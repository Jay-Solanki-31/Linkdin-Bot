// @vitest-environment jsdom
import { vi, beforeEach, afterEach, it, expect } from "vitest";
import {
  act,
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import PublishingHealth from "../src/pages/PublishingHealth";
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  auth: { memberUrn: "A" },
}));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../src/api", () => ({ default: api }));
vi.mock("../src/auth/AuthContext", () => ({ useAuth: () => auth }));
const incident = {
  id: "p",
  title: "Test incident",
  status: "failed",
  failedStage: "ai",
  creationMode: "manual",
  eligibility: { retryGeneration: true },
};
let posts;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  posts = [incident];
  auth.isAuthenticated = true;
  auth.auth = { memberUrn: "A" };
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.endsWith("summary")
        ? {
            asOf: "2026-11-03T00:00:00Z",
            counts: {
              queued: 12,
              scheduled: 3,
              published: 8,
              failed: 1,
              review_required: 0,
            },
          }
        : { data: posts, total: posts.length },
    }),
  );
  api.post.mockResolvedValue({ data: { message: "Recovery requested" } });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const settle = () => act(async () => {});
it("uses API counts and confirms recovery before mutation", async () => {
  render(<PublishingHealth />);
  await settle();
  expect(screen.getByText("12")).toBeTruthy();
  fireEvent.click(screen.getByText("Retry Generation"));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Request recovery"));
  await settle();
  expect(api.post).toHaveBeenCalledWith(
    "/api/publishing-health/posts/p/retry-generation",
    {},
  );
  expect(screen.getByText("Recovery requested")).toBeTruthy();
});
it("shows empty state", async () => {
  posts = [];
  render(<PublishingHealth />);
  await settle();
  expect(screen.getByText("No posts yet")).toBeTruthy();
});
it("filters using server query parameters", async () => {
  render(<PublishingHealth />);
  await settle();
  fireEvent.change(screen.getByLabelText("Status filter"), {
    target: { value: "ai" },
  });
  await settle();
  expect(api.get).toHaveBeenLastCalledWith(
    expect.stringContaining("incidents"),
    expect.objectContaining({
      params: expect.objectContaining({ stage: "ai", status: "failed" }),
    }),
  );
});
it("review-required provides no retry action", async () => {
  posts = [{ ...incident, status: "review_required", eligibility: {} }];
  render(<PublishingHealth />);
  await settle();
  expect(screen.queryByText("Retry Generation")).toBeNull();
  expect(screen.queryByText("Retry Publish")).toBeNull();
});
it("clears previous account immediately and aborts requests on logout", async () => {
  const view = render(<PublishingHealth />);
  await settle();
  const signal = api.get.mock.calls[0][1].signal;
  auth.auth = { memberUrn: "B" };
  view.rerender(<PublishingHealth />);
  expect(screen.queryByText("Test incident")).toBeNull();
  expect(signal.aborted).toBe(true);
  await settle();
  auth.isAuthenticated = false;
  view.rerender(<PublishingHealth />);
  const calls = api.get.mock.calls.length;
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(api.get).toHaveBeenCalledTimes(calls);
  expect(screen.queryByText("Test incident")).toBeNull();
});
it("pauses hidden-tab polling", async () => {
  render(<PublishingHealth />);
  await settle();
  const calls = api.get.mock.calls.length;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(api.get).toHaveBeenCalledTimes(calls);
});
