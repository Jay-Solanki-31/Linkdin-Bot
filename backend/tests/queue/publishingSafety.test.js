import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ process: null, claim: vi.fn(), update: vi.fn(), save: vi.fn(), publish: vi.fn() }));
vi.mock("bullmq", () => ({ Worker: vi.fn().mockImplementation((name, fn) => { m.process = fn; return {}; }) }));
vi.mock("../../src/queue/connection.js", () => ({ redisConnection: { connection: {} } }));
vi.mock("../../src/models/generatedPost.model.js", () => ({ default: { findOneAndUpdate: m.claim, updateOne: m.update, findByIdAndUpdate: m.save } }));
vi.mock("../../src/modules/publisher/linkedin.publisher.js", () => ({ publishToLinkedIn: m.publish }));
vi.mock("../../src/utils/logger.js", () => ({ default: { info: vi.fn(), error: vi.fn() } }));
await import("../../src/queue/workers/linkedin.worker.js");
const job = { data: { postId: "p", linkedinMemberUrn: "A", scheduleVersion: 3 }, attemptsMade: 0, opts: { attempts: 3 } };
beforeEach(() => { vi.clearAllMocks(); m.claim.mockResolvedValue({ text: "A draft", linkedinMemberUrn: "A" }); m.update.mockResolvedValue({ modifiedCount: 1 }); });
it("requires owner, version, due time and non-test state in the atomic claim", async () => {
  m.claim.mockResolvedValue(null); await m.process(job);
  expect(m.claim).toHaveBeenCalledWith(expect.objectContaining({ linkedinMemberUrn: "A", scheduleVersion: 3, testMode: { $ne: true }, publishAt: { $lte: expect.any(Date) } }), expect.anything(), expect.anything());
  expect(m.publish).not.toHaveBeenCalled();
});
it("never publishes a job with missing ownership", async () => {
  await m.process({ ...job, data: { postId: "p" } }); expect(m.claim).not.toHaveBeenCalled();
});
it("quarantines a successful external request whose result cannot be saved", async () => {
  m.publish.mockImplementation(async ({ beforeCreate }) => { await beforeCreate(); return { urn: "urn:li:share:1" }; });
  m.save.mockRejectedValue(new Error("database unavailable"));
  await m.process(job);
  expect(m.update).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ $set: expect.objectContaining({ status: "review_required" }) }));
});
it("quarantines uncertain external failures", async () => {
  m.publish.mockImplementation(async ({ beforeCreate }) => { await beforeCreate(); throw new Error("timeout"); });
  await m.process(job);
  expect(m.update).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ $set: expect.objectContaining({ status: "review_required" }) }));
});
it("preserves retries for failures before the public create request", async () => {
  m.publish.mockRejectedValue(new Error("image upload failed"));
  await expect(m.process(job)).rejects.toThrow("image upload failed");
  expect(m.update).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ $set: expect.objectContaining({ status: "queued" }) }));
});
