// @vitest-environment jsdom
/* global vi, beforeEach, afterEach, it, expect */
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Studio from "../src/pages/Studio";
import Dashboard from "../src/pages/Dashboard";
import Analytics from "../src/pages/Analytics";
import Calendar from "../src/pages/Calendar";
import Layout from "../src/components/layout/Layout";
import ThemeToggle from "../src/components/ThemeToggle";
import Settings from "../src/pages/Settings";
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  status: "authenticated",
  auth: { memberUrn: "account-a" },
  connect: vi.fn(),
}));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
const dashboard = vi.hoisted(() => vi.fn());
const analytics = vi.hoisted(() => vi.fn());
const draft = {
  _id: "draft-1",
  status: "draft",
  creationMode: "manual",
  text: "An idea worth sharing",
  title: "My draft",
};
vi.mock("../src/auth/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../src/api", () => ({ default: api }));
vi.mock("../src/api/dashboard.api", () => ({ fetchDashboard: dashboard }));
vi.mock("../src/api/analytics.api", () => ({
  getAnalyticsPosts: analytics,
  getAnalyticsHistory: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock("../src/components/charts/TrenderChart", () => ({
  TrendChart: () => <div>Article trend</div>,
}));
beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = true;
  auth.status = "authenticated";
  auth.auth = { memberUrn: "account-a" };
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.includes("automation")
        ? {
            timezone: "Asia/Kolkata",
            automationEnabled: true,
            schedule: "Existing weekly schedule",
          }
        : url.includes("draft-1")
          ? { data: draft }
          : { data: [] },
    }),
  );
  api.post.mockResolvedValue({
    data: { data: draft, message: "Generation queued" },
  });
  api.patch.mockResolvedValue({ data: { data: draft } });
  dashboard.mockResolvedValue({
    data: {
      stats: { totalFetched: 12, todayFetched: 2, aiGeneratedCount: 4 },
      queue: { running: false },
      chartData: [],
      recentActivity: [],
    },
  });
  analytics.mockResolvedValue({ data: [] });
});
afterEach(cleanup);
function mount(component, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>,
  );
}
it("renders real dashboard fields and honest polling copy", async () => {
  mount(<Dashboard />);
  expect(await screen.findByText("12")).toBeTruthy();
  expect(screen.getByText("Checked every 60 seconds")).toBeTruthy();
  expect(screen.queryByText("Live updated")).toBeNull();
});
it("does not generate on mount and previews the queued draft after a user action", async () => {
  const user = userEvent.setup();
  mount(<Studio />);
  await screen.findByText("Use a custom topic");
  expect(api.post).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Topic"), "A thoughtful idea");
  await user.click(screen.getByRole("button", { name: /Generate draft/ }));
  await screen.findByLabelText("Post text");
  expect(api.post).toHaveBeenCalledWith(
    "/api/ai-posts/generate",
    expect.objectContaining({ topic: "A thoughtful idea" }),
  );
  expect(screen.getAllByText("An idea worth sharing").length).toBeGreaterThan(
    0,
  );
});
it("requires publishing confirmation and disables repeat publishing while pending", async () => {
  const user = userEvent.setup();
  mount(<Studio />, "/studio?postId=draft-1");
  await screen.findByLabelText("Post text");
  await user.click(screen.getByRole("button", { name: "Publish now" }));
  expect(api.post).not.toHaveBeenCalled();
  api.post.mockResolvedValueOnce({
    data: { data: { ...draft, status: "publishing" } },
  });
  await user.click(screen.getByRole("button", { name: "Confirm publishing" }));
  await screen.findByText(
    "Publishing is in progress. Wait for a confirmed outcome.",
  );
  expect(screen.getByRole("button", { name: "Publish now" }).disabled).toBe(
    true,
  );
  expect(api.post).toHaveBeenCalledWith(
    "/api/ai-posts/draft-1/publish",
    expect.any(Object),
  );
});
it("schedules only after the date and timezone are confirmed", async () => {
  const user = userEvent.setup();
  mount(<Studio />, "/studio?postId=draft-1");
  await screen.findByLabelText("Post text");
  await user.click(screen.getByRole("button", { name: "Schedule post" }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Local publishing time"), {
    target: { value: "2030-01-15T10:00" },
  });
  await user.click(screen.getByRole("button", { name: "Confirm schedule" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/api/ai-posts/draft-1/schedule", {
      localTime: "2030-01-15T10:00",
      timezone: "Asia/Kolkata",
    }),
  );
});
it("requires saving edited text before publishing", async () => {
  const user = userEvent.setup();
  mount(<Studio />, "/studio?postId=draft-1");
  const editor = await screen.findByLabelText("Post text");
  await user.type(editor, " with context");
  expect(screen.getByRole("button", { name: "Publish now" }).disabled).toBe(
    true,
  );
  expect(screen.getByText(/Unsaved changes/)).toBeTruthy();
});
it("shows truthful analytics empty states without fabricated metrics", async () => {
  mount(<Analytics />);
  await screen.findByText("Your story is just getting started");
  expect(screen.getByText(/Updates are not live/)).toBeTruthy();
  expect(screen.getAllByText("Unavailable").length).toBe(2);
});
it("opens and closes mobile navigation with state and Escape", async () => {
  const user = userEvent.setup();
  mount(
    <Layout>
      <p>Page content</p>
    </Layout>,
  );
  const toggle = screen.getByRole("button", { name: "Open navigation" });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  await user.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("link", { name: "Calendar" })).toBeTruthy();
  await user.keyboard("{Escape}");
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
});
it("remounts account content when session identity changes", async () => {
  function PrivateContent() {
    return <Studio />;
  }
  const element = (
    <MemoryRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PrivateContent />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  const view = render(element);
  await screen.findByLabelText("Topic");
  fireEvent.change(screen.getByLabelText("Topic"), {
    target: { value: "Private account A draft" },
  });
  auth.auth = { memberUrn: "account-b" };
  view.rerender(element);
  // Force a fresh parent render with the changed session value.
  view.rerender(
    <MemoryRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PrivateContent />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByLabelText("Topic").value).toBe(""));
});
it("persists the selected theme", async () => {
  const user = userEvent.setup();
  render(
    <ThemeProvider attribute="class" defaultTheme="light">
      <ThemeToggle />
    </ThemeProvider>,
  );
  await user.click(
    screen.getByRole("button", { name: "Switch to dark theme" }),
  );
  await waitFor(() => expect(localStorage.getItem("theme")).toBe("dark"));
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Switch to light theme" }),
  );
  await waitFor(() => expect(localStorage.getItem("theme")).toBe("light"));
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});
it("loads every page of posts into the calendar without triggering publishing", async () => {
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.includes("automation")
        ? { timezone: "Asia/Kolkata" }
        : { data: [], pagination: { totalPages: 2 } },
    }),
  );
  mount(<Calendar />);
  await screen.findByText("A little breathing room");
  expect(api.get).toHaveBeenCalledWith(
    "/api/ai-posts",
    expect.objectContaining({ params: { page: 2, limit: 50 } }),
  );
  expect(api.post).not.toHaveBeenCalled();
});
it("confirms consequential automation changes", async () => {
  const user = userEvent.setup();
  mount(<Settings />);
  await screen.findByRole("switch");
  await user.click(screen.getByRole("switch"));
  await user.click(screen.getByRole("button", { name: "Save preferences" }));
  expect(api.patch).not.toHaveBeenCalled();
  expect(screen.getByText("Update automation preferences?")).toBeTruthy();
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Save preferences",
    }),
  );
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith("/api/automation/settings", {
      automationEnabled: false,
      timezone: "Asia/Kolkata",
    }),
  );
});
