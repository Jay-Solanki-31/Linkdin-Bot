import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "../../src/config/session.js";

describe("session cookie configuration", () => {
  it("uses same-site cookies for local HTTP development", () => {
    expect(getSessionCookieOptions("http://localhost:5173", "http://localhost:5000/callback"))
      .toMatchObject({ secure: false, sameSite: "lax", httpOnly: true });
  });

  it("uses secure cross-site cookies only when both origins use HTTPS", () => {
    expect(getSessionCookieOptions("https://frontend.example", "https://api.example/callback"))
      .toMatchObject({ secure: true, sameSite: "none", httpOnly: true });
  });
});
