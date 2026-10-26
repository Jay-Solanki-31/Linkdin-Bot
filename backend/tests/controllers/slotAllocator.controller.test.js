import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueSlotAllocation = vi.hoisted(() => vi.fn());
vi.mock("../../src/queue/slotAllocator.queue.js", () => ({ enqueueSlotAllocation }));

const { runSlotAllocator } = await import("../../src/controller/slotAllocator.controller.js");

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

describe("manual slot allocator ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueueSlotAllocation.mockResolvedValue({ id: "allocation-job" });
  });

  it("queues only the authenticated account and ignores a client owner", async () => {
    const res = response();
    await runSlotAllocator({ body: { memberUrn: "urn:li:person:attacker", dryRun: true }, session: { linkedinMemberUrn: "urn:li:person:A" } }, res);
    expect(enqueueSlotAllocation).toHaveBeenCalledWith({ memberUrn: "urn:li:person:A", dryRun: true, testMode: true });
  });

  it("uses User B's authenticated account", async () => {
    const res = response();
    await runSlotAllocator({ body: {}, session: { linkedinMemberUrn: "urn:li:person:B" } }, res);
    expect(enqueueSlotAllocation).toHaveBeenCalledWith({ memberUrn: "urn:li:person:B", dryRun: false, testMode: true });
  });

  it("rejects unauthenticated allocation", async () => {
    const res = response();
    await runSlotAllocator({ body: {}, session: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(enqueueSlotAllocation).not.toHaveBeenCalled();
  });
});
