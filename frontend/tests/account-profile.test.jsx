// @vitest-environment jsdom
/* global vi, it, expect, afterEach */
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import Header from "../src/components/layout/Header";
import { getLinkedInStatus } from "../src/api/linkedin";
vi.mock("../src/api/linkedin", () => ({ getLinkedInStatus: vi.fn(), getLinkedInLoginUrl: vi.fn() }));
vi.mock("../src/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
afterEach(cleanup);
function Controls() {
  const { refresh, clearAuth } = useAuth();
  return <><button onClick={refresh}>Refresh</button><button onClick={() => clearAuth()}>Clear</button></>;
}
function mount() {
  return render(<MemoryRouter><AuthProvider><Header /><Controls /></AuthProvider></MemoryRouter>);
}
it("displays the connected name and replaces both name and image on account switching", async () => {
  getLinkedInStatus.mockResolvedValueOnce({ connected: true, memberUrn: "alice", displayName: "Alice Example", profilePicture: "https://example.com/alice.png" });
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
  await act(async () => finish({ connected: true, memberUrn: "old", displayName: "Old Account", profilePicture: "https://example.com/old.png" }));
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
