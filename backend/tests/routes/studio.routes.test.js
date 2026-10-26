import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import express from "express";
const mocks = vi.hoisted(() => ({ findOne: vi.fn(), findOneAndUpdate: vi.fn(), create: vi.fn(), exists: vi.fn(), updateOne: vi.fn(), articleExists: vi.fn(), add: vi.fn(), enqueue: vi.fn(), remove: vi.fn() }));
vi.mock("../../src/models/generatedPost.model.js", () => ({ default: mocks }));
vi.mock("../../src/models/fetchedContent.model.js", () => ({ default: { exists: mocks.articleExists } }));
vi.mock("../../src/models/linkedinToken.model.js", () => ({ default: { findOne: vi.fn(), updateOne: vi.fn() } }));
vi.mock("../../src/queue/ai.queue.js", () => ({ aiQueue: { add: mocks.add } }));
vi.mock("../../src/services/postScheduling.service.js", () => ({ enqueueCurrentPost: mocks.enqueue, removeOldPublishJobs: mocks.remove }));
let server, url;
const id = "507f1f77bcf86cd799439011";
beforeAll(async () => {
  const router = (await import("../../src/routes/studio.routes.js")).default;
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { req.session = req.headers["x-test-owner"] ? { linkedinMemberUrn: req.headers["x-test-owner"] } : {}; next(); });
  app.use("/api", router);
  server = app.listen(0); await new Promise(resolve => server.once("listening", resolve));
  url = `http://127.0.0.1:${server.address().port}/api`;
}, 60000);
afterAll(() => server ? new Promise(resolve => server.close(resolve)) : undefined);
beforeEach(() => { vi.clearAllMocks(); mocks.exists.mockResolvedValue(false); });
async function request(path, body = {}, owner = "A", method = "POST") {
  return fetch(url + path, { method, headers: { "Content-Type": "application/json", ...(owner ? { "x-test-owner": owner } : {}) }, body: method === "GET" ? undefined : JSON.stringify(body) });
}
it("rejects unauthenticated generation", async () => expect((await request("/ai-posts/generate", { topic: "Node" }, null)).status).toBe(401));
it("cannot generate from another account's article", async () => {
  mocks.articleExists.mockResolvedValue(false);
  expect((await request("/ai-posts/generate", { articleId: id })).status).toBe(404);
  expect(mocks.articleExists).toHaveBeenCalledWith({ _id: id, linkedinMemberUrn: "A" });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("generates a topic as a manual draft without publishing", async () => {
  mocks.create.mockResolvedValue({ _id: id, status: "draft" });
  expect((await request("/ai-posts/generate", { topic: "Node streams", customPrompt: "Be concise" })).status).toBe(202);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ topic: "Node streams", customPrompt: "Be concise", creationMode: "manual", status: "draft", linkedinMemberUrn: "A" }));
  expect(mocks.enqueue).not.toHaveBeenCalled();
});
it.each(["publish", "schedule", "cancel"])("cannot %s another owner's post", async action => {
  mocks.findOne.mockResolvedValue(null);
  expect((await request(`/ai-posts/${id}/${action}`, { localTime: "2030-01-01T12:00" })).status).toBe(404);
  expect(mocks.findOne).toHaveBeenCalledWith({ _id: id, linkedinMemberUrn: "A" });
  expect(mocks.enqueue).not.toHaveBeenCalled();
});
it("blocks testMode publishing", async () => {
  mocks.findOne.mockResolvedValue({ _id: id, testMode: true, text: "Draft" });
  expect((await request(`/ai-posts/${id}/publish`)).status).toBe(409);
  expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
});
it("reschedules with an atomic version check and removes the old job", async () => {
  const old = { _id: id, scheduleVersion: 2, text: "Draft", status: "queued" };
  mocks.findOne.mockResolvedValue(old);
  mocks.findOneAndUpdate.mockResolvedValue({ ...old, scheduleVersion: 3 });
  expect((await request(`/ai-posts/${id}/schedule`, { localTime: "2030-01-01T12:00", timezone: "Asia/Kolkata" })).status).toBe(202);
  expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ scheduleVersion: 2, linkedinMemberUrn: "A" }), expect.objectContaining({ $inc: { scheduleVersion: 1 } }), expect.anything());
  expect(mocks.remove).toHaveBeenCalledWith(old);
  expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({ scheduleVersion: 3 }));
});
it("does not enqueue after a concurrent publishing claim", async () => {
  mocks.findOne.mockResolvedValue({ _id: id, scheduleVersion: 2, text: "Draft" });
  mocks.findOneAndUpdate.mockResolvedValue(null);
  expect((await request(`/ai-posts/${id}/publish`)).status).toBe(409);
  expect(mocks.enqueue).not.toHaveBeenCalled();
});
it("cancels by clearing time and advancing version without enqueueing", async () => {
  mocks.findOne.mockResolvedValue({ _id: id, scheduleVersion: 2 });
  mocks.findOneAndUpdate.mockResolvedValue({ _id: id, scheduleVersion: 3, status: "draft" });
  expect((await request(`/ai-posts/${id}/cancel`)).status).toBe(200);
  expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ $unset: { publishAt: "" }, $inc: { scheduleVersion: 1 } }), expect.anything());
  expect(mocks.enqueue).not.toHaveBeenCalled();
});
