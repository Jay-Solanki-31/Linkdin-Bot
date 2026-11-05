import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  exists: vi.fn(),
  update: vi.fn(),
  add: vi.fn(),
  getJob: vi.fn(),
}));
vi.mock("../../src/models/generatedPost.model.js", () => ({
  default: { exists: m.exists, updateOne: m.update },
}));
vi.mock("../../src/queue/linkedin.queue.js", () => ({
  linkedinQueue: { add: m.add, getJob: m.getJob },
}));
import { enqueueCurrentPost } from "../../src/services/postScheduling.service.js";
const post = {
  _id: "p",
  linkedinMemberUrn: "A",
  status: "queued",
  publishAt: new Date(Date.now() + 60000),
  scheduleVersion: 4,
};
beforeEach(() => {
  vi.resetAllMocks();
  m.exists.mockResolvedValue(true);
});
it("restores missing delayed jobs with a deterministic version ID", async () => {
  await enqueueCurrentPost(post);
  expect(m.add).toHaveBeenCalledWith(
    "POST_TO_LINKEDIN",
    { postId: "p", linkedinMemberUrn: "A", scheduleVersion: 4 },
    expect.objectContaining({
      jobId: "publish-p-v4",
      delay: expect.any(Number),
    }),
  );
});
it("concurrent runs use the same queue ID", async () => {
  await Promise.all([enqueueCurrentPost(post), enqueueCurrentPost(post)]);
  expect(m.add.mock.calls.map((call) => call[2].jobId)).toEqual([
    "publish-p-v4",
    "publish-p-v4",
  ]);
});
it("rejects stale persisted schedules", async () => {
  m.exists.mockResolvedValue(false);
  await enqueueCurrentPost(post);
  expect(m.add).not.toHaveBeenCalled();
});
it.each([
  { status: "draft" },
  { status: "posted" },
  { status: "review_required" },
  { publishAttemptedAt: new Date() },
  { testMode: true },
])("does not enqueue unsafe schedule %o", async (patch) => {
  await enqueueCurrentPost({ ...post, ...patch });
  expect(m.add).not.toHaveBeenCalled();
});
it("preserves a compatible legacy delayed job", async () => {
  m.getJob.mockResolvedValue({
    data: { scheduleVersion: 4 },
    getState: async () => "delayed",
  });
  await enqueueCurrentPost(post);
  expect(m.add).not.toHaveBeenCalled();
});

it("records retained terminal schedules without resetting the failed queue job", async () => {
  m.getJob.mockImplementation(async (id) =>
    id === "publish-p-v4" ? { getState: async () => "failed" } : null,
  );
  await enqueueCurrentPost(post);
  expect(m.add).not.toHaveBeenCalled();
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({
      linkedinMemberUrn: "A",
      scheduleVersion: 4,
      publishAttemptedAt: null,
    }),
    expect.objectContaining({
      $set: expect.objectContaining({
        status: "failed",
        errorCode: "SCHEDULE_JOB_TERMINAL",
      }),
    }),
  );
});
