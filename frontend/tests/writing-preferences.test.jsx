// @vitest-environment jsdom
/* global vi, beforeEach, afterEach, it, expect */
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import Preferences from "../src/components/AIWritingPreferences";
import api from "../src/api";
const state = vi.hoisted(() => ({
  auth: { memberUrn: "A" },
  isAuthenticated: true,
}));
vi.mock("../src/auth/AuthContext", () => ({ useAuth: () => state }));
vi.mock("../src/api", () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const defaults = {
  tone: "technical",
  length: "medium",
  emoji: "minimal",
  hashtags: false,
  language: "en",
  topics: [],
  customInstructions: "",
};
const data = {
  preferences: defaults,
  defaults,
  revision: 0,
  options: {
    tone: ["professional", "technical", "casual", "humorous"],
    length: ["short", "medium", "long"],
    emoji: ["none", "minimal", "moderate"],
    language: ["en", "hi", "es", "fr", "de", "pt"],
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  state.auth = { memberUrn: "A" };
  state.isAuthenticated = true;
  api.get.mockResolvedValue({ data });
});
afterEach(cleanup);
async function mount() {
  const view = render(<Preferences />);
  await screen.findByLabelText("Writing Tone");
  return view;
}
it("loads saved settings, tracks changes and saves only preferences with revision", async () => {
  api.get.mockResolvedValue({
    data: {
      ...data,
      preferences: { ...defaults, tone: "casual" },
      revision: 2,
    },
  });
  api.put.mockResolvedValue({ data: { preferences: defaults, revision: 3 } });
  await mount();
  expect(screen.getByLabelText("Writing Tone").value).toBe("casual");
  fireEvent.change(screen.getByLabelText("Writing Tone"), {
    target: { value: "technical" },
  });
  fireEvent.click(screen.getByText("Save writing preferences"));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      "/api/ai-writing-preferences",
      { preferences: defaults, revision: 2 },
      expect.anything(),
    ),
  );
  await screen.findByText("No unsaved changes");
});
it("preserves unsaved input after a failed save", async () => {
  api.put.mockRejectedValue(new Error("offline"));
  await mount();
  fireEvent.change(screen.getByLabelText(/Custom Instructions/), {
    target: { value: "Concrete examples" },
  });
  fireEvent.click(screen.getByText("Save writing preferences"));
  await screen.findByRole("alert");
  expect(screen.getByLabelText(/Custom Instructions/).value).toBe(
    "Concrete examples",
  );
});
it("resets only after confirmation without saving", async () => {
  await mount();
  fireEvent.change(screen.getByLabelText("Writing Tone"), {
    target: { value: "casual" },
  });
  fireEvent.click(screen.getByText("Reset to Defaults"));
  expect(screen.getByLabelText("Writing Tone").value).toBe("casual");
  fireEvent.click(screen.getAllByText("Reset to Defaults").at(-1));
  expect(screen.getByLabelText("Writing Tone").value).toBe("technical");
  expect(api.put).not.toHaveBeenCalled();
});
it("previews unsaved values, prevents duplicate clicks, and handles failures", async () => {
  let finish;
  api.post.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mount();
  fireEvent.change(screen.getByLabelText("Writing Tone"), {
    target: { value: "humorous" },
  });
  fireEvent.change(screen.getByLabelText("Preview Topic"), {
    target: { value: "Caching" },
  });
  fireEvent.click(screen.getByText("Generate Preview"));
  expect(screen.getByText("Generating preview…").disabled).toBe(true);
  expect(api.post.mock.calls[0][1]).toEqual({
    preferences: { ...defaults, tone: "humorous" },
    topic: "Caching",
  });
  expect(api.put).not.toHaveBeenCalled();
  await act(async () => finish({ data: { text: "Preview content" } }));
  await screen.findByText("Preview content");
  api.post.mockRejectedValue(new Error("quota"));
  fireEvent.click(screen.getByText("Generate Preview"));
  await screen.findByRole("alert");
  expect(screen.getByText("Generate Preview").disabled).toBe(false);
});
it("discards old-account results and clears input on account switch and logout", async () => {
  let finish;
  api.post.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = await mount();
  fireEvent.change(screen.getByLabelText("Preview Topic"), {
    target: { value: "Private A topic" },
  });
  fireEvent.click(screen.getByText("Generate Preview"));
  state.auth = { memberUrn: "B" };
  view.rerender(<Preferences />);
  await screen.findByLabelText("Preview Topic");
  await act(async () => finish({ data: { text: "Private A result" } }));
  expect(screen.queryByText("Private A result")).toBeNull();
  expect(screen.getByLabelText("Preview Topic").value).toBe("");
  expect(api.post.mock.calls[0][2].signal.aborted).toBe(true);
  state.isAuthenticated = false;
  view.rerender(<Preferences />);
  expect(screen.queryByText("AI Writing Preferences")).toBeNull();
});
it("limits topic tags and shows instruction count", async () => {
  await mount();
  for (let i = 0; i < 10; i++) {
    fireEvent.change(screen.getByLabelText(/Preferred Topics/), {
      target: { value: `Topic ${i}` },
    });
    fireEvent.click(screen.getByText("Add"));
  }
  expect(screen.getByText("Add").disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Custom Instructions/), {
    target: { value: "Test" },
  });
  expect(screen.getByText("4/2000 characters")).toBeTruthy();
});
