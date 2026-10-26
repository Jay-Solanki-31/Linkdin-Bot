import { beforeEach, describe, expect, it, vi } from "vitest";

const add = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "job-1" }));
vi.mock("bullmq", () => ({ Queue: vi.fn().mockImplementation(() => ({ add })) }));
vi.mock("../../src/queue/connection.js", () => ({ redisConnection: { connection: {} } }));

const { enqueueSlotAllocation } = await import("../../src/queue/slotAllocator.queue.js");

describe("slot allocator queue ownership and idempotency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the account in the job payload", async () => {
    await enqueueSlotAllocation({ memberUrn: "urn:li:person:A", testMode: true });
    expect(add).toHaveBeenCalledWith(expect.any(String), { memberUrn: "urn:li:person:A", dryRun: false, testMode: true }, expect.objectContaining({ jobId: expect.stringContaining("urn%3Ali%3Aperson%3AA") }));
  });

  it("uses a stable per-account daily job id for repeated requests", async () => {
    await enqueueSlotAllocation({ memberUrn: "urn:li:person:A" });
    const firstJobId = add.mock.calls[0][2].jobId;
    await enqueueSlotAllocation({ memberUrn: "urn:li:person:A" });
    expect(add.mock.calls[1][2].jobId).toBe(firstJobId);
  });
});
