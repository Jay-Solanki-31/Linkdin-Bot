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
import { MemoryRouter } from "react-router-dom";
import Calendar from "../src/pages/Calendar";
import Studio from "../src/pages/Studio";
import Layout from "../src/components/layout/Layout";
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  status: "authenticated",
  auth: { memberUrn: "account-a" },
}));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("../src/auth/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../src/api", () => ({ default: api }));
let width;
const now = new Date();
const stamp = new Date(now.getFullYear(), now.getMonth(), 15, 12).toISOString();
const posts = [
  {
    _id: "scheduled",
    title: "Scheduled idea",
    status: "queued",
    creationMode: "manual",
    publishAt: stamp,
  },
  {
    _id: "published",
    title: "Published idea",
    status: "posted",
    creationMode: "automatic",
    publishAt: stamp,
  },
  {
    _id: "failed",
    title: "Failed idea",
    status: "failed",
    creationMode: "manual",
    publishAt: stamp,
  },
  {
    _id: "review",
    title: "Review idea",
    status: "review_required",
    creationMode: "automatic",
    publishAt: stamp,
  },
  {
    _id: "publishing",
    title: "Publishing idea",
    status: "publishing",
    creationMode: "manual",
    publishAt: stamp,
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  width = 375;
  auth.isAuthenticated = true;
  auth.auth = { memberUrn: "account-a" };
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  window.matchMedia = (query) => ({
    matches:
      width >= Number(query.match(/min-width:\s*(\d+)/)?.[1] || Infinity),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.includes("settings")
        ? { timezone: "Asia/Kolkata" }
        : url.endsWith("draft-1")
          ? {
              data: {
                _id: "draft-1",
                status: "draft",
                creationMode: "manual",
                text: "A thoughtful draft",
              },
            }
          : { data: posts, pagination: { totalPages: 1 } },
    }),
  );
});
afterEach(cleanup);
function mount(component, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>,
  );
}
it("defaults mobile to Agenda and switches to Week and compact Month", async () => {
  const user = userEvent.setup();
  mount(<Calendar />);
  await screen.findByText("Scheduled idea");
  expect(
    screen.getByRole("button", { name: "Agenda" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen.queryByRole("region", { name: "Monthly publishing calendar" }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Week" }));
  expect(
    screen.getByRole("region", { name: "Weekly publishing calendar" }),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Next week" }));
  await user.click(screen.getByRole("button", { name: "Previous week" }));
  await user.click(screen.getByRole("button", { name: "Month" }));
  expect(
    screen.getByRole("region", { name: "Monthly publishing calendar" }),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: /5 posts$/ }));
  expect(screen.getByText("Scheduled idea")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "View / reschedule" })
      .getAttribute("href"),
  ).toBe("/studio?postId=scheduled");
});
it("preserves the desktop month calendar by default", async () => {
  width = 1440;
  mount(<Calendar />);
  expect(
    await screen.findByRole("region", { name: "Monthly publishing calendar" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Month" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getAllByText("Scheduled idea").length).toBe(2);
});
it("navigates months in both directions and across a year boundary", async () => {
  const user = userEvent.setup();
  mount(<Calendar />);
  await screen.findByText("Scheduled idea");
  for (let i = 0; i < 3; i++)
    await user.click(screen.getByRole("button", { name: "Next month" }));
  const expected = new Date(
    now.getFullYear(),
    now.getMonth() + 3,
    1,
  ).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  expect(screen.getByRole("heading", { name: expected })).toBeTruthy();
  for (let i = 0; i < 3; i++)
    await user.click(screen.getByRole("button", { name: "Previous month" }));
  expect(screen.getByText("Scheduled idea")).toBeTruthy();
});
it.each([
  ["Scheduled", "Scheduled idea"],
  ["Published", "Published idea"],
  ["Failed", "Failed idea"],
  ["Review Required", "Review idea"],
])("filters %s posts without a network request", async (label, title) => {
  const user = userEvent.setup();
  mount(<Calendar />);
  await screen.findByText("Scheduled idea");
  const count = api.get.mock.calls.length;
  await user.selectOptions(screen.getByLabelText("Post status"), label);
  expect(screen.getByText(title)).toBeTruthy();
  posts
    .filter((p) => p.title !== title)
    .forEach((p) => expect(screen.queryByText(p.title)).toBeNull());
  expect(api.get.mock.calls.length).toBe(count);
});
it("refreshes manually with loading feedback while preserving loaded cards", async () => {
  const user = userEvent.setup();
  mount(<Calendar />);
  await screen.findByText("Scheduled idea");
  let resolve;
  api.get.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await user.click(screen.getByRole("button", { name: "Refresh calendar" }));
  expect(
    screen.getByRole("button", { name: "Refresh calendar" }).disabled,
  ).toBe(true);
  expect(screen.getByText("Refreshing…")).toBeTruthy();
  expect(screen.getByText("Scheduled idea")).toBeTruthy();
  await waitFor(() => expect(resolve).toBeTypeOf("function"));
  resolve({ data: { data: posts, pagination: { totalPages: 1 } } });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Refresh calendar" }).disabled,
    ).toBe(false),
  );
  expect(api.post).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
});
it("shows a non-disruptive refresh error without hiding the agenda", async () => {
  const user = userEvent.setup();
  mount(<Calendar />);
  await screen.findByText("Scheduled idea");
  api.get.mockRejectedValueOnce(new Error("Offline"));
  await user.click(screen.getByRole("button", { name: "Refresh calendar" }));
  expect(
    await screen.findByText(/Could not refresh your calendar/),
  ).toBeTruthy();
  expect(screen.getByText("Scheduled idea")).toBeTruthy();
});
it.each([320, 375, 390, 430, 768, 1440])(
  "renders Studio controls and preview at simulated width %ipx",
  async (viewport) => {
    width = viewport;
    mount(<Studio />, "/studio?postId=draft-1");
    const editor = await screen.findByLabelText("Post text");
    expect(editor.getAttribute("aria-describedby")).toBe(
      "studio-character-count",
    );
    expect(screen.getByText(/3,000 characters/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Post preview" })).toBeTruthy();
    ["Save draft", "Publish now", "Schedule post"].forEach((name) =>
      expect(screen.getByRole("button", { name })).toBeTruthy(),
    );
    expect(api.post).not.toHaveBeenCalled();
  },
);
it("closes the drawer after navigation and restores focus", async () => {
  const user = userEvent.setup();
  mount(
    <Layout>
      <p>Content</p>
    </Layout>,
  );
  const opener = screen.getByRole("button", { name: "Open navigation" });
  expect(
    document.getElementById("workspace-navigation").hasAttribute("inert"),
  ).toBe(true);
  await user.click(opener);
  expect(document.body.style.overflow).toBe("hidden");
  await user.click(screen.getByRole("link", { name: "Calendar" }));
  expect(opener.getAttribute("aria-expanded")).toBe("false");
  expect(document.body.style.overflow).toBe("");
  expect(document.activeElement).toBe(opener);
});
it("traps drawer focus, closes on outside interaction, and keeps account status accessible", async () => {
  const user = userEvent.setup();
  mount(
    <Layout>
      <p>Content</p>
    </Layout>,
  );
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  const drawer = screen.getByRole("dialog", { name: "Workspace navigation" });
  expect(within(drawer).getByText("LinkedIn connected")).toBeTruthy();
  const last = within(drawer).getByRole("link", { name: "Create a post →" });
  last.focus();
  await user.tab();
  expect(document.activeElement).toBe(
    within(drawer).getByRole("button", { name: "Close navigation" }),
  );
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(last);
  fireEvent.click(document.querySelector(".nav-overlay"));
  expect(
    screen.queryByRole("dialog", { name: "Workspace navigation" }),
  ).toBeNull();
});
