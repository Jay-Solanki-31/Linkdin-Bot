import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import express from "express";
const m = vi.hoisted(() => ({
  findOne: vi.fn(),
  find: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  retry: vi.fn(),
}));
vi.mock("../../src/models/generatedPost.model.js", () => ({
  default: {
    findOne: m.findOne,
    find: m.find,
    countDocuments: m.count,
    aggregate: m.aggregate,
  },
}));
vi.mock("../../src/queue/ai.queue.js", () => ({ aiQueue: {} }));
vi.mock("../../src/services/postScheduling.service.js", () => ({
  enqueueCurrentPost: vi.fn(),
}));
import router from "../../src/routes/publishingHealth.routes.js";
let server, url;
const id = "507f1f77bcf86cd799439011";
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = req.headers["x-owner"]
      ? { linkedinMemberUrn: req.headers["x-owner"] }
      : {};
    next();
  });
  app.use(router);
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  url = `http://127.0.0.1:${server.address().port}`;
}, 60000);
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  vi.clearAllMocks();
  m.findOne.mockReturnValue({
    lean: () => null,
    select: () => ({ lean: () => null }),
  });
  m.find.mockReturnValue({
    sort: () => ({ skip: () => ({ limit: () => ({ lean: () => [] }) }) }),
  });
  m.count.mockResolvedValue(0);
  m.aggregate.mockResolvedValue([]);
});
const request = (path, owner = "A", method = "GET") =>
  fetch(url + path, { method, headers: owner ? { "x-owner": owner } : {} });
it("rejects unauthenticated health requests", async () =>
  expect((await request("/summary", null)).status).toBe(401));
it("scopes incidents and counts to authenticated owner", async () => {
  expect((await request("/incidents")).status).toBe(200);
  expect(m.find).toHaveBeenCalledWith({ linkedinMemberUrn: "A" });
  expect(m.count).toHaveBeenCalledWith({ linkedinMemberUrn: "A" });
});
it.each([`/posts/${id}`, `/posts/${id}/history`])(
  "does not expose another account through %s",
  async (path) => {
    expect((await request(path)).status).toBe(404);
    expect(m.findOne).toHaveBeenCalledWith({ _id: id, linkedinMemberUrn: "A" });
  },
);
it("rejects cross-account retry without disclosing existence", async () => {
  m.findOne.mockResolvedValue(null);
  expect(
    (await request(`/posts/${id}/retry-generation`, "A", "POST")).status,
  ).toBe(404);
  expect(m.findOne).toHaveBeenCalledWith({ _id: id, linkedinMemberUrn: "A" });
});
it("rejects invalid IDs and filters", async () => {
  expect((await request("/posts/invalid")).status).toBe(400);
  expect((await request("/incidents?status=invalid")).status).toBe(400);
  expect((await request("/incidents?page=-2")).status).toBe(400);
});
it("counts scheduled separately from queued and maps posted to published", async () => {
  m.aggregate.mockResolvedValue([
    { _id: { status: "queued", scheduled: true }, count: 4 },
    { _id: { status: "queued", scheduled: false }, count: 2 },
    { _id: { status: "posted", scheduled: false }, count: 3 },
  ]);
  const response = await request("/summary");
  const body = await response.json();
  expect(body.counts).toMatchObject({ scheduled: 4, queued: 2, published: 3 });
  expect(m.aggregate.mock.calls[0][0][0].$match.linkedinMemberUrn).toBe("A");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
