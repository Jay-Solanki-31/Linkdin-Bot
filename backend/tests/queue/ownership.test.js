import { beforeEach, describe, expect, it, vi } from "vitest";

const add = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "job-1" }));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({ add })),
}));
vi.mock("../../src/queue/connection.js", () => ({
  redisConnection: { connection: {} },
}));

const { addAIJob } = await import("../../src/queue/ai.queue.js");
const { enqueueLinkedInPost } = await import("../../src/queue/linkedin.queue.js");

describe("queue ownership payloads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps AI jobs tied to the authenticated account", async () => {
    await addAIJob("post-a", "urn:li:person:A");
    expect(add).toHaveBeenCalledWith(
      expect.any(String),
      { postId: "post-a", linkedinMemberUrn: "urn:li:person:A" },
      expect.any(Object),
    );
  });

  it("requires and preserves the publishing account", async () => {
    await expect(enqueueLinkedInPost("post-a")).rejects.toThrow("linkedinMemberUrn is required");
    await enqueueLinkedInPost("post-a", "urn:li:person:A");
    expect(add).toHaveBeenCalledWith(
      expect.any(String),
      { postId: "post-a", linkedinMemberUrn: "urn:li:person:A" },
      expect.any(Object),
    );
  });
});
