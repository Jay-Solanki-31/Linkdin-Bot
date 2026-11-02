// @vitest-environment jsdom
/* global vi, it, expect, afterEach */
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import Header from "../src/components/layout/Header";
import Settings from "../src/pages/Settings";
import { getLinkedInStatus } from "../src/api/linkedin";
vi.mock("../src/api/linkedin", () => ({ getLinkedInStatus: vi.fn(), getLinkedInLoginUrl: vi.fn(), getLinkedInPictureUrl: urn => `/api/auth/linkedin/picture?memberUrn=${encodeURIComponent(urn)}` }));
vi.mock("../src/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("../src/api", () => ({ default: { get: vi.fn().mockResolvedValue({ data: {
  automationEnabled: false, timezone: "Asia/Kolkata", schedule: "Weekly",
} }) } }));
afterEach(cleanup);
function Controls() {
  const { refresh, clearAuth } = useAuth();
  return <><button onClick={refresh}>Refresh</button><button onClick={() => clearAuth()}>Clear</button></>;
}
function mount() {
  return render(<MemoryRouter><AuthProvider><Header /><Controls /></AuthProvider></MemoryRouter>);
}
it("displays the connected name and replaces both name and image on account switching", async () => {
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "alice", displayName: "Alice Example", profilePicture: "https://media.licdn.com/alice.png" });
  mount();
  await screen.findAllByText("Alice Example");
  expect(document.querySelector('img').getAttribute('src')).toContain("alice.png");
  let finish;
  getLinkedInStatus.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByText("Refresh"));
  expect(screen.queryByText("Alice Example")).toBeNull();
  expect(document.querySelector('img')).toBeNull();
  await act(async () => finish({ connected: true, memberUrn: "bob", displayName: "Bob Example" }));
  expect(screen.getAllByText("Bob Example").length).toBe(2);
  fireEvent.click(screen.getByText("Clear"));
  expect(screen.queryByText("Bob Example")).toBeNull();
});
it("does not restore a cleared profile from an in-flight status request", async () => {
  let finish;
  getLinkedInStatus.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  mount();
  await act(async () => {});
  fireEvent.click(screen.getByText("Clear"));
  await act(async () => finish({ connected: true, memberUrn: "old", displayName: "Old Account", profilePicture: "https://media.licdn.com/old.png" }));
  expect(screen.queryByText("Old Account")).toBeNull();
  expect(document.querySelector('img')).toBeNull();
});
it("uses a friendly fallback and rejects unsafe image URLs", async () => {
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "urn:li:person:private", profilePicture: "javascript:alert(1)" });
  const { container } = mount();
  await act(async () => {});
  expect(screen.getAllByText("LinkedIn account").length).toBe(2);
  expect(container.textContent).not.toContain("urn:li:");
  expect(container.querySelector('img')).toBeNull();
});

it("falls back to initials on image failure and resets for the next account", async () => {
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "alice", displayName: "Alice Example", profilePicture: "https://media.licdn.com/alice.png" });
  mount();
  await screen.findAllByText("Alice Example");
  document.querySelectorAll("img").forEach(img => fireEvent.error(img));
  expect(document.querySelector("img").getAttribute("src")).toBe("/api/auth/linkedin/picture?memberUrn=alice");
  document.querySelectorAll("img").forEach(img => fireEvent.error(img));
  expect(document.querySelector("img")).toBeNull();
  expect(screen.getAllByLabelText("Alice Example's initials").length).toBe(2);
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "bob", displayName: "Bob Example", profilePicture: "https://media.licdn.com/bob.png" });
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findAllByText("Bob Example");
  expect(screen.getAllByAltText("Bob Example's LinkedIn profile picture").length).toBe(2);
  expect(document.querySelector("img").src).toContain("bob.png");
});
it.each(["https://example.com/avatar.png", "http://media.licdn.com/a", "https://media.licdn.com.evil.test/a", "https://user:pass@media.licdn.com/a"])("rejects untrusted picture %s", async picture => {
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "alice", displayName: "Alice Example", profilePicture: picture });
  mount();
  await screen.findAllByText("Alice Example");
  expect(document.querySelector("img")).toBeNull();
});

it("preserves every status field and shares the signed picture across header, menu, and Settings", async () => {
  const profile = { connected: true, memberUrn: "alice", displayName: "Alice Example",
    profilePicture: "https://media.licdn.com/alice.png?e=123&v=beta&t=signature",
    expiresAt: "2030-01-01T00:00:00Z", expired: false };
  getLinkedInStatus.mockResolvedValueOnce(profile);
  function Probe() {
    const { account } = useAuth();
    return <output data-testid="account">{JSON.stringify(account)}</output>;
  }
  render(<MemoryRouter><AuthProvider><Header /><Settings /><Probe /><Controls /></AuthProvider></MemoryRouter>);
  await screen.findByText("LinkedIn connection");
  expect(JSON.parse(screen.getByTestId("account").textContent)).toEqual(profile);
  const images = screen.getAllByAltText("Alice Example's LinkedIn profile picture");
  expect(images).toHaveLength(3);
  images.forEach(img => expect(img.getAttribute("src")).toBe(profile.profilePicture));
  fireEvent.click(screen.getByText("Clear"));
  expect(JSON.parse(screen.getByTestId("account").textContent)).toBeNull();
  expect(document.querySelector("img")).toBeNull();
});

it("starts a fresh session request and ignores an older account's late response", async () => {
  let finishOld;
  getLinkedInStatus.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
  mount();
  await act(async () => {});
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "bob", displayName: "Bob Example",
    profilePicture: "https://media.licdn.com/bob.png" });
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findAllByText("Bob Example");
  await act(async () => finishOld({ connected: true, memberUrn: "alice", displayName: "Alice Example",
    profilePicture: "https://media.licdn.com/alice.png" }));
  expect(screen.queryByText("Alice Example")).toBeNull();
  expect(document.querySelector("img").getAttribute("src")).toContain("bob.png");
});

it("retries a failed picture when its URL changes for the same account", async () => {
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "alice", displayName: "Alice Example",
    profilePicture: "https://media.licdn.com/old.png" });
  mount();
  await screen.findAllByText("Alice Example");
  document.querySelectorAll("img").forEach(img => fireEvent.error(img));
  document.querySelectorAll("img").forEach(img => fireEvent.error(img));
  expect(document.querySelector("img")).toBeNull();
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "alice", displayName: "Alice Example",
    profilePicture: "https://media.licdn.com/new.png" });
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findAllByAltText("Alice Example's LinkedIn profile picture");
  expect(document.querySelector("img").getAttribute("src")).toContain("new.png");
});
