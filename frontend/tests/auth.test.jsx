/* global vi, beforeEach, it, expect */
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../src/auth/ProtectedRoute";
import Studio from "../src/pages/Studio";
const state = vi.hoisted(() => ({ status: "loading", auth: null, isAuthenticated: false }));
const get = vi.hoisted(() => vi.fn());
vi.mock("../src/auth/AuthContext", () => ({ useAuth: () => state }));
vi.mock("../src/api", () => ({ default: { get } }));
beforeEach(() => { state.status = "loading"; state.isAuthenticated = false; get.mockClear(); });
function renderProtected() {
  return renderToString(<MemoryRouter><Routes><Route element={<ProtectedRoute />}><Route path="/" element={<Studio />} /></Route></Routes></MemoryRouter>);
}
it("verifies the session before rendering protected content or calling APIs", () => {
  expect(renderProtected()).toContain("Checking your LinkedIn connection");
  expect(get).not.toHaveBeenCalled();
});
it("does not render cached studio content for a logged out account", () => {
  state.status = "unauthenticated";
  expect(renderProtected()).not.toContain("AI Post Studio");
  expect(get).not.toHaveBeenCalled();
});
it("shows session-check failure with a retry control", () => {
  state.status = "error";
  expect(renderProtected()).toContain("Retry");
  expect(get).not.toHaveBeenCalled();
});
it("renders accessible generation controls once authenticated", () => {
  state.status = "authenticated"; state.isAuthenticated = true;
  const html = renderProtected();
  expect(html).toContain("Custom AI instructions");
  expect(html).toContain("Generate draft");
  expect(html).toContain("Use a custom topic");
});
