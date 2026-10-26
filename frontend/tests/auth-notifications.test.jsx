// @vitest-environment jsdom
/* global vi, it, expect, afterEach */
import { render, screen, act, cleanup } from "@testing-library/react";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
const errorToast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: errorToast } }));
vi.mock("../src/api/linkedin", () => ({
  getLinkedInStatus: vi
    .fn()
    .mockResolvedValue({ connected: true, memberUrn: "account-a" }),
  getLinkedInLoginUrl: vi.fn(),
}));
afterEach(cleanup);
it("shows one session-expired notification for repeated unauthorized responses", async () => {
  function Probe() {
    const { status } = useAuth();
    return <p>{status}</p>;
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText("authenticated");
  act(() => {
    for (let n = 0; n < 4; n++)
      window.dispatchEvent(new CustomEvent("linkedin-auth:unauthorized"));
  });
  expect(screen.getByText("unauthenticated")).toBeTruthy();
  expect(errorToast).toHaveBeenCalledTimes(1);
});
