import { beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
import express from "express";
import { defaultPreferences } from "../../src/utils/writingPreferences.js";
const m = vi.hoisted(() => ({
  read: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  generate: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("../../src/models/aiWritingPreferences.model.js", () => ({
  default: { findById: m.read, create: m.create, findOneAndUpdate: m.update },
}));
vi.mock("../../src/modules/ai/ai.service.js", () => ({
  default: { generateForContent: m.generate },
}));
vi.mock("../../src/queue/connection.js", () => ({
  redisConnection: { connection: { eval: m.limit } },
}));
let server, url;
const documents = new Map();
beforeAll(async () => {
  const router = (await import("../../src/routes/writingPreferences.routes.js"))
    .default;
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = { linkedinMemberUrn: req.headers["x-owner"] };
    next();
  });
  app.use(router);
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  vi.clearAllMocks();
  documents.clear();
  m.read.mockImplementation((id) => ({
    lean: async () => documents.get(id) || null,
  }));
  m.create.mockImplementation(async (doc) => {
    if (documents.has(doc._id))
      throw Object.assign(new Error("duplicate"), { code: 11000 });
    documents.set(doc._id, doc);
    return doc;
  });
  m.update.mockImplementation(async (filter, update) => {
    const doc = documents.get(filter._id);
    if (!doc || doc.revision !== filter.revision) return null;
    const next = {
      ...doc,
      preferences: update.$set.preferences,
      revision: doc.revision + 1,
    };
    documents.set(filter._id, next);
    return next;
  });
  m.limit.mockResolvedValue(1);
  m.generate.mockResolvedValue({ text: "Preview text" });
});
const request = (method, path = "/", body, owner = "A") =>
  fetch(url + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(owner ? { "x-owner": owner } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
it("requires authentication", async () =>
  expect((await request("GET", "/", null, null)).status).toBe(401));
it("returns fresh compatible defaults without creating a document", async () => {
  const res = await request("GET");
  expect(await res.json()).toMatchObject({
    preferences: defaultPreferences(),
    revision: 0,
  });
  expect(m.create).not.toHaveBeenCalled();
});
it("isolates reads and writes by session identity", async () => {
  await request("PUT", "/", { preferences: { tone: "casual" }, revision: 0 });
  expect((await (await request("GET")).json()).preferences.tone).toBe("casual");
  expect(
    (await (await request("GET", "/", null, "B")).json()).preferences.tone,
  ).toBe("technical");
  expect(
    (
      await request("PUT", "/", {
        preferences: {},
        revision: 0,
        memberUrn: "B",
      })
    ).status,
  ).toBe(400);
});
it.each([
  { tone: "invalid" },
  { memberUrn: "B" },
  { hashtags: "false" },
  { customInstructions: "x".repeat(2001) },
  { topics: Array(11).fill("a") },
  { language: "xx" },
])("rejects invalid values %j", async (preferences) => {
  expect((await request("PUT", "/", { preferences, revision: 0 })).status).toBe(
    400,
  );
  expect(m.create).not.toHaveBeenCalled();
});
it("conflicts concurrent creates and stale updates", async () => {
  const body = { preferences: {}, revision: 0 };
  const responses = await Promise.all([
    request("PUT", "/", body),
    request("PUT", "/", body),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(documents.size).toBe(1);
  expect(
    (
      await request("PUT", "/", {
        preferences: { tone: "casual" },
        revision: 1,
      })
    ).status,
  ).toBe(200);
  expect(
    (await request("PUT", "/", { preferences: {}, revision: 1 })).status,
  ).toBe(409);
});
it("previews unsaved values with existing service and no persistence", async () => {
  const preferences = { ...defaultPreferences(), tone: "casual" };
  expect(
    (await request("POST", "/preview", { preferences, topic: "Caching" }))
      .status,
  ).toBe(200);
  expect(m.generate).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Caching" }),
    "",
    preferences,
  );
  expect(m.create).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
  expect(m.read).not.toHaveBeenCalled();
});
it("rate limits preview by authenticated account", async () => {
  m.limit.mockResolvedValue(6);
  expect(
    (await request("POST", "/preview", { preferences: {}, topic: "Caching" }))
      .status,
  ).toBe(429);
  expect(m.generate).not.toHaveBeenCalled();
  expect(m.limit.mock.calls[0][2]).toContain("writing-preview:A:");
});
it.each([
  ["AI_TIMEOUT", 504],
  ["AI_RATE_LIMIT", 429],
  ["AI_EMPTY_RESPONSE", 503],
])("sanitizes provider failure %s", async (code, status) => {
  m.generate.mockRejectedValue(
    Object.assign(new Error("provider secret"), { code }),
  );
  const res = await request("POST", "/preview", {
    preferences: {},
    topic: "Caching",
  });
  expect(res.status).toBe(status);
  expect(await res.text()).not.toContain("secret");
});
it("sanitizes database outages", async () => {
  m.read.mockImplementation(() => ({
    lean: async () => {
      throw new Error("database password");
    },
  }));
  const res = await request("GET");
  expect(res.status).toBe(503);
  expect(await res.text()).not.toContain("password");
});
it("fails closed when the preview limiter is unavailable", async () => {
  m.limit.mockRejectedValue(new Error("Redis credentials"));
  const res = await request("POST", "/preview", { preferences: {}, topic: "Caching" });
  expect(res.status).toBe(503);
  expect(await res.text()).not.toContain("credentials");
  expect(m.generate).not.toHaveBeenCalled();
});
it.each(["PUT", "POST"])("rejects missing body for %s", async method => {
  const res = await request(method, method === "POST" ? "/preview" : "/");
  expect(res.status).toBe(400);
});
