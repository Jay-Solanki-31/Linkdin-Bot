import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import express from "express";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

vi.mock("../../src/models/linkedinToken.model.js", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn()
  }
}));

vi.mock("../../src/models/linkedinOAuthTransaction.model.js", () => ({
  default: {
    create: vi.fn(),
    findOneAndDelete: vi.fn()
  }
}));

describe("LinkedIn OAuth routes", () => {
  let app;
  let server;
  let baseUrl;
  let axios;
  let LinkedInToken;
  let LinkedInOAuthTransaction;
  let getSessionCookieOptions;
  let logSpies;
  let transactions;

  beforeAll(async () => {
    process.env.LINKEDIN_CLIENT_ID = "test-client-id";
    process.env.LINKEDIN_CLIENT_SECRET = "test-client-secret";
    process.env.LINKEDIN_REDIRECT_URI = "http://localhost/callback";
    process.env.FRONTEND_ORIGIN = "http://localhost:5173";
    process.env.SESSION_SECRET = "test-session-secret";

    axios = (await import("axios")).default;
    LinkedInToken = (await import("../../src/models/linkedinToken.model.js")).default;
    LinkedInOAuthTransaction = (
      await import("../../src/models/linkedinOAuthTransaction.model.js")
    ).default;
    const sessionConfig = await import("../../src/config/session.js");
    getSessionCookieOptions = sessionConfig.getSessionCookieOptions;
    const linkedinAuthRoutes = (await import("../../src/routes/linkedinAuth.routes.js")).default;

    app = express();
    app.use(sessionConfig.createSessionMiddleware());
    app.use("/api/auth/linkedin", linkedinAuthRoutes);

    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  it("uses secure cross-origin cookie attributes when both OAuth endpoints use HTTPS", () => {
    expect(getSessionCookieOptions(
      "https://frontend.example.test",
      "https://api.example.test/api/auth/linkedin/callback"
    )).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
  });

  it("does not mark localhost OAuth cookies Secure when NODE_ENV is production", () => {
    expect(getSessionCookieOptions(
      "http://localhost:5173",
      "http://localhost:5000/api/auth/linkedin/callback"
    )).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    transactions = new Map();
    LinkedInOAuthTransaction.create.mockImplementation(async (transaction) => {
      transactions.set(transaction.stateHash, transaction);
      return transaction;
    });
    LinkedInOAuthTransaction.findOneAndDelete.mockImplementation(async ({ stateHash, expiresAt }) => {
      const transaction = transactions.get(stateHash);
      if (!transaction || transaction.expiresAt <= expiresAt.$gt) return null;
      transactions.delete(stateHash);
      return transaction;
    });
    logSpies = [
      vi.spyOn(console, "info").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {})
    ];
  });

  afterAll(async () => {
    logSpies?.forEach((spy) => spy.mockRestore());
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  async function beginOAuth() {
    const response = await fetch(`${baseUrl}/api/auth/linkedin/login`, { redirect: "manual" });
    const authorizationUrl = new URL(response.headers.get("location"));
    expect(authorizationUrl.searchParams.get("client_id")).toBe("test-client-id");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe("http://localhost/callback");
    const cookieHeader = response.headers.get("set-cookie") || "";
    const cookie = cookieHeader ? cookieHeader.split(";")[0] : "";
    return {
      cookie,
      cookieHeader,
      state: authorizationUrl.searchParams.get("state")
    };
  }

  async function callback(cookie, params) {
    const query = new URLSearchParams(params);
    const headers = cookie ? { cookie } : {};
    return fetch(`${baseUrl}/api/auth/linkedin/callback?${query}`, {
      headers
    });
  }

  it("recovers the initiating account from the server-side transaction if callback has no login cookie", async () => {
    const { state, cookieHeader } = await beginOAuth();
    expect(cookieHeader).toContain("SameSite=Lax");
    expect(cookieHeader).not.toContain("Secure");
    const accountId = LinkedInOAuthTransaction.create.mock.calls[0][0].accountId;
    const savedAccount = {
      accountId,
      memberUrn: "urn:li:person:test-member",
      expiresAt: new Date(Date.now() + 60_000)
    };
    axios.post.mockResolvedValue({
      status: 200,
      data: { access_token: "test-access-token", expires_in: 3600 }
    });
    axios.get.mockResolvedValue({
      status: 200,
      data: { sub: "test-member" }
    });
    LinkedInToken.findOneAndUpdate.mockResolvedValue(savedAccount);

    const response = await callback("", { code: "test-code", state });
    const html = await response.text();
    const callbackCookieHeader = response.headers.get("set-cookie");
    expect(callbackCookieHeader).toContain("SameSite=Lax");
    expect(callbackCookieHeader).not.toContain("Secure");
    expect(html).toContain('"status":"success"');
    expect(html).toContain("window.close()");
    expect(LinkedInToken.findOneAndUpdate).toHaveBeenCalledWith(
      { accountId, memberUrn: "urn:li:person:test-member" },
      expect.objectContaining({ $set: expect.objectContaining({ accountId }) }),
      expect.objectContaining({ upsert: true })
    );

    LinkedInToken.findOne.mockResolvedValue(savedAccount);
    const callbackCookie = callbackCookieHeader.split(";")[0];
    const statusResponse = await fetch(`${baseUrl}/api/auth/linkedin/status`, {
      headers: { cookie: callbackCookie }
    });
    await expect(statusResponse.json()).resolves.toMatchObject({ connected: true });
  });

  it("stores independent account IDs for separate login sessions", async () => {
    const firstLogin = await beginOAuth();
    const secondLogin = await beginOAuth();
    expect(firstLogin.state).not.toBe(secondLogin.state);

    axios.post.mockResolvedValue({
      status: 200,
      data: { access_token: "test-access-token", expires_in: 3600 }
    });
    axios.get.mockResolvedValue({
      status: 200,
      data: { sub: "member-one" }
    });
    LinkedInToken.findOneAndUpdate.mockImplementation(async (filter) => ({
      ...filter,
      expiresAt: new Date(Date.now() + 60_000)
    }));

    await callback("", { code: "test-code-one", state: firstLogin.state });
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { sub: "member-two" }
    });
    await callback("", { code: "test-code-two", state: secondLogin.state });

    const accountFilters = LinkedInToken.findOneAndUpdate.mock.calls.map(([filter]) => filter);
    expect(accountFilters).toHaveLength(2);
    expect(accountFilters[0].accountId).not.toBe(accountFilters[1].accountId);
    expect(accountFilters.map(({ memberUrn }) => memberUrn)).toEqual([
      "urn:li:person:member-one",
      "urn:li:person:member-two"
    ]);
  });

  it("keeps OAuth state validation and returns a visible failure for a mismatched state", async () => {
    const { cookie } = await beginOAuth();
    const response = await callback(cookie, { code: "test-code", state: "wrong-state" });
    const html = await response.text();

    expect(html).toContain("invalid, expired, or already used");
    expect(html).not.toContain('"status":"success"');
    expect(LinkedInToken.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("shows LinkedIn cancellation details without auto-closing the popup", async () => {
    const { state } = await beginOAuth();
    const response = await callback("", {
      state,
      error: "access_denied",
      error_description: "User cancelled sign-in"
    });
    const html = await response.text();

    expect(html).toContain("User cancelled sign-in");
    expect(html).not.toContain("window.close()");
    expect(html).toContain("window.opener?.postMessage");
  });

  it("rejects replayed and expired transaction states", async () => {
    const { state } = await beginOAuth();
    transactions.clear();
    const replayedResponse = await callback("", { code: "test-code", state });
    expect(await replayedResponse.text()).toContain("invalid, expired, or already used");

    const expiredLogin = await beginOAuth();
    const expiredStateHash = await import("node:crypto").then(({ default: crypto }) =>
      crypto.createHash("sha256").update(expiredLogin.state).digest("hex")
    );
    const stored = transactions.get(expiredStateHash);
    stored.expiresAt = new Date(Date.now() - 1);
    const expiredResponse = await callback("", {
      code: "test-code",
      state: expiredLogin.state
    });
    expect(await expiredResponse.text()).toContain("invalid, expired, or already used");
  });

  it("reports token exchange and profile failures", async () => {
    const { cookie, state } = await beginOAuth();
    axios.post.mockRejectedValueOnce({
      message: "Request failed",
      response: { status: 400, data: { error_description: "Invalid authorization code" } }
    });
    const exchangeResponse = await callback(cookie, { code: "test-code", state });
    expect(await exchangeResponse.text()).toContain("Token exchange failed (HTTP 400): Invalid authorization code");

    const nextLogin = await beginOAuth();
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: { access_token: "test-access-token", expires_in: 3600 }
    });
    axios.get.mockRejectedValueOnce({
      message: "Request failed",
      response: { status: 401, data: { message: "Invalid token" } }
    });
    const profileResponse = await callback(nextLogin.cookie, {
      code: "test-code",
      state: nextLogin.state
    });
    expect(await profileResponse.text()).toContain("LinkedIn profile lookup failed (HTTP 401): Invalid token");
  });

  it("reports MongoDB failures and escapes their message before embedding it in script", async () => {
    const { cookie, state } = await beginOAuth();
    axios.post.mockResolvedValue({
      status: 200,
      data: { access_token: "test-access-token", expires_in: 3600 }
    });
    axios.get.mockResolvedValue({
      status: 200,
      data: { sub: "test-member" }
    });
    LinkedInToken.findOneAndUpdate.mockRejectedValue(new Error("</script><script>alert(1)</script>"));

    const response = await callback(cookie, { code: "test-code", state });
    const html = await response.text();

    expect(html).toContain("Could not save LinkedIn account:");
    expect(html).toContain("\\u003c/script\\u003e");
    expect(html).not.toContain("</script><script>alert(1)</script>");
    expect(html).not.toContain("window.close()");
  });
});
