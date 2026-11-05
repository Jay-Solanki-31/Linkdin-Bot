import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  process: null,
  claim: vi.fn(),
  update: vi.fn(),
  save: vi.fn(),
  publish: vi.fn(),
}));
vi.mock("bullmq", () => ({
  Worker: vi.fn().mockImplementation((name, fn) => {
    m.process = fn;
    return {};
  }),
}));
vi.mock("../../src/queue/connection.js", () => ({
  redisConnection: { connection: {} },
}));
vi.mock("../../src/models/generatedPost.model.js", () => ({
  default: {
    findOneAndUpdate: m.claim,
    updateOne: m.update,
    findByIdAndUpdate: m.save,
  },
}));
vi.mock("../../src/modules/publisher/linkedin.publisher.js", () => ({
  publishToLinkedIn: m.publish,
}));
vi.mock("../../src/utils/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));
await import("../../src/queue/workers/linkedin.worker.js");
const job = {
  data: { postId: "p", linkedinMemberUrn: "A", scheduleVersion: 3 },
  attemptsMade: 0,
  opts: { attempts: 3 },
};
beforeEach(() => {
  vi.clearAllMocks();
  m.claim.mockResolvedValue({ text: "A draft", linkedinMemberUrn: "A" });
  m.update.mockResolvedValue({ modifiedCount: 1 });
});
it("requires owner, version, due time and non-test state in the atomic claim", async () => {
  m.claim.mockResolvedValue(null);
  await m.process(job);
  expect(m.claim).toHaveBeenCalledWith(
    expect.objectContaining({
      linkedinMemberUrn: "A",
      scheduleVersion: 3,
      testMode: { $ne: true },
      publishAt: { $lte: expect.any(Date) },
    }),
    expect.anything(),
    expect.anything(),
  );
  expect(m.publish).not.toHaveBeenCalled();
});
it("never publishes a job with missing ownership", async () => {
  await m.process({ ...job, data: { postId: "p" } });
  expect(m.claim).not.toHaveBeenCalled();
});
it("quarantines a successful external request whose result cannot be saved", async () => {
  m.publish.mockImplementation(async ({ beforeCreate }) => {
    await beforeCreate();
    return { urn: "urn:li:share:1" };
  });
  m.claim
    .mockResolvedValueOnce({ text: "A draft", linkedinMemberUrn: "A" })
    .mockRejectedValueOnce(new Error("database unavailable"));
  await m.process(job);
  expect(m.update).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      $set: expect.objectContaining({ status: "review_required" }),
    }),
  );
});
it("quarantines uncertain external failures", async () => {
  m.publish.mockImplementation(async ({ beforeCreate }) => {
    await beforeCreate();
    throw new Error("timeout");
  });
  await m.process(job);
  expect(m.update).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      $set: expect.objectContaining({ status: "review_required" }),
    }),
  );
});
it("preserves retries for failures before the public create request", async () => {
  m.publish.mockRejectedValue(new Error("image upload failed"));
  await expect(m.process(job)).rejects.toThrow("LINKEDIN_PUBLISH_FAILED");
  expect(m.update).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      $set: expect.objectContaining({ status: "queued" }),
    }),
  );
});

it("success remains posted and a replay never creates another public post", async () => {
  m.claim
    .mockResolvedValueOnce({ text: "A draft", linkedinMemberUrn: "A" })
    .mockResolvedValueOnce({ status: "posted" })
    .mockResolvedValueOnce(null);
  m.publish.mockImplementation(async ({ beforeCreate }) => {
    await beforeCreate();
    return { urn: "urn:li:share:1" };
  });
  await m.process(job);
  await m.process(job);
  expect(m.publish).toHaveBeenCalledTimes(1);
  expect(m.claim.mock.calls[1][1].$set).toMatchObject({
    status: "posted",
    linkedinPostUrn: "urn:li:share:1",
  });
});
it("worker excludes review-required, cancelled, failed and previously attempted posts", async () => {
  m.claim.mockResolvedValue(null);
  await m.process(job);
  expect(m.claim.mock.calls[0][0]).toMatchObject({
    status: "queued",
    linkedinPostUrn: null,
    publishAttemptedAt: null,
    scheduleVersion: 3,
  });
  expect(m.publish).not.toHaveBeenCalled();
});
it("expired token records a safe failure without automatic retry", async () => {
  m.publish.mockRejectedValue(new Error("LinkedIn token expired"));
  await m.process(job);
  expect(m.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ linkedinMemberUrn: "A" }),
    expect.objectContaining({
      $set: expect.objectContaining({
        status: "failed",
        errorCode: "LINKEDIN_TOKEN_EXPIRED",
      }),
    }),
  );
});
it("claim failure cannot change another active publishing attempt", async () => {
  m.claim.mockRejectedValueOnce(new Error("database unavailable"));
  await expect(m.process(job)).rejects.toThrow("LINKEDIN_CLAIM_UNAVAILABLE");
  expect(m.update).not.toHaveBeenCalled();
});
it("quarantines an indeterminate marker write instead of requeueing", async () => {
  m.update
    .mockRejectedValueOnce(new Error("database acknowledgement timed out"))
    .mockResolvedValueOnce({ modifiedCount: 1 });
  m.publish.mockImplementation(async ({ beforeCreate }) => {
    await beforeCreate();
    throw new Error("must not reach create");
  });
  await m.process(job);
  expect(m.update).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      $set: expect.objectContaining({ status: "review_required" }),
    }),
  );
  expect(m.update.mock.calls[0][2]).toEqual({
    writeConcern: { w: "majority", j: true },
  });
});
