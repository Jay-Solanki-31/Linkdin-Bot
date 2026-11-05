import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  find: vi.fn(),
  claim: vi.fn(),
  getJob: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  findAll: vi.fn(),
}));
vi.mock("../../src/models/generatedPost.model.js", () => ({
  default: {
    findOne: m.find,
    findOneAndUpdate: m.claim,
    updateOne: m.update,
    find: m.findAll,
  },
}));
vi.mock("../../src/queue/ai.queue.js", () => ({
  aiQueue: { getJob: m.getJob, add: m.add },
}));
vi.mock("../../src/utils/logger.js", () => ({
  default: { warn: vi.fn(), info: vi.fn() },
}));
import {
  eligibility,
  safePost,
  requestGenerationRecovery,
  dispatchRecovery,
  reconcileRecoveryIntents,
} from "../../src/services/publishingHealth.service.js";
const post = {
  _id: "p",
  linkedinMemberUrn: "A",
  status: "failed",
  failedStage: "ai",
  recoveryAttempts: 0,
};
beforeEach(() => {
  vi.resetAllMocks();
  m.find.mockResolvedValue({ ...post });
  m.claim.mockResolvedValue({
    ...post,
    recoveryIntent: { id: "health-ai-p-1", state: "pending" },
  });
});
it.each(["posted", "publishing", "review_required", "queued"])(
  "rejects generation recovery in %s",
  (status) => {
    expect(eligibility({ ...post, status }).retryGeneration).toBe(false);
  },
);
it("rejects prior public-create, cooldown and exhausted limits", () => {
  for (const patch of [
    { publishAttemptedAt: new Date() },
    { recoveryAttempts: 3 },
    { lastRecoveryAt: new Date() },
    { recoveryIntent: { state: "pending" } },
  ])
    expect(eligibility({ ...post, ...patch }).retryGeneration).toBe(false);
});
it("redacts legacy errors and provider payloads", () => {
  const safe = safePost({
    ...post,
    error: "Bearer secret",
    accessToken: "secret",
  });
  expect(JSON.stringify(safe)).not.toContain("secret");
});
it("scopes lookup and atomic claim to owner", async () => {
  expect((await requestGenerationRecovery("p", "A")).status).toBe(202);
  expect(m.find).toHaveBeenCalledWith({ _id: "p", linkedinMemberUrn: "A" });
  expect(m.claim.mock.calls[0][0]).toMatchObject({
    linkedinMemberUrn: "A",
    publishAttemptedAt: null,
    linkedinPostUrn: null,
  });
  expect(m.add.mock.calls[0][2].jobId).toBe("health-ai-p-1");
});
it("does not enqueue cross-account posts", async () => {
  m.find.mockResolvedValue(null);
  expect((await requestGenerationRecovery("p", "B")).status).toBe(404);
  expect(m.add).not.toHaveBeenCalled();
});
it("only one concurrent request claims the intent", async () => {
  m.claim
    .mockResolvedValueOnce({ ...post, recoveryIntent: { id: "health-ai-p-1" } })
    .mockResolvedValueOnce(null);
  const results = await Promise.all([
    requestGenerationRecovery("p", "A"),
    requestGenerationRecovery("p", "A"),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([202, 409]);
  expect(m.add).toHaveBeenCalledTimes(1);
});
it("retains a durable intent when Redis enqueue fails", async () => {
  m.add.mockRejectedValue(new Error("Redis unavailable"));
  expect((await requestGenerationRecovery("p", "A")).status).toBe(202);
  expect(m.claim.mock.calls[0][1].$set.recoveryIntent.state).toBe("pending");
});
it("repeated requests for a pending recovery never enqueue again", async () => {
  m.find.mockResolvedValue({ ...post, recoveryIntent: { state: "pending" } });
  await requestGenerationRecovery("p", "A");
  expect(m.claim).not.toHaveBeenCalled();
  expect(m.add).not.toHaveBeenCalled();
});

it("replays a persisted intent after process restart using the original ID", async () => {
  const intent = {
    ...post,
    recoveryIntent: { id: "health-ai-p-1", state: "pending" },
  };
  m.findAll
    .mockReturnValueOnce({ limit: () => [] })
    .mockReturnValueOnce({ limit: () => [intent] });
  await reconcileRecoveryIntents();
  expect(m.add).toHaveBeenCalledWith(
    "GENERATE_POST",
    expect.objectContaining({
      recoveryId: "health-ai-p-1",
      linkedinMemberUrn: "A",
    }),
    { jobId: "health-ai-p-1" },
  );
});
it("never resets a retained failed recovery job", async () => {
  m.getJob.mockResolvedValue({ getState: async () => "failed" });
  await dispatchRecovery({
    ...post,
    recoveryIntent: { id: "health-ai-p-1", state: "pending" },
  });
  expect(m.add).not.toHaveBeenCalled();
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({
      linkedinMemberUrn: "A",
      "recoveryIntent.id": "health-ai-p-1",
    }),
    expect.objectContaining({
      $set: expect.objectContaining({ "recoveryIntent.state": "failed" }),
    }),
  );
});
it("preserves active running intents during reconciliation", async () => {
  m.findAll
    .mockReturnValueOnce({
      limit: () => [
        {
          ...post,
          status: "generating",
          recoveryIntent: { id: "health-ai-p-1" },
        },
      ],
    })
    .mockReturnValueOnce({ limit: () => [] });
  m.getJob.mockResolvedValue({ getState: async () => "active" });
  await reconcileRecoveryIntents();
  expect(m.update).not.toHaveBeenCalled();
  expect(m.add).not.toHaveBeenCalled();
});
