import { beforeEach, afterEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ process: null, enabled: vi.fn(), posts: vi.fn(), used: vi.fn(), exists: vi.fn(), create: vi.fn(), sources: vi.fn(), sample: vi.fn(), accounts: vi.fn(), add: vi.fn() }));
vi.mock("bullmq", () => ({ Worker: vi.fn().mockImplementation((name, fn) => { m.process = fn; return {}; }) }));
vi.mock("../../src/queue/connection.js", () => ({ redisConnection: { connection: {} } }));
vi.mock("../../src/services/automation.service.js", () => ({ automationEnabled: m.enabled }));
vi.mock("../../src/models/generatedPost.model.js", () => ({ default: { find: () => ({ select: m.posts }), distinct: m.used, exists: m.exists, create: m.create } }));
vi.mock("../../src/models/fetchedContent.model.js", () => ({ default: { distinct: m.sources, aggregate: m.sample } }));
vi.mock("../../src/models/linkedinToken.model.js", () => ({ default: { find: () => ({ select: m.accounts }) } }));
vi.mock("../../src/queue/ai.queue.js", () => ({ aiQueue: { add: m.add } }));
vi.mock("../../src/utils/logger.js", () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
await import("../../src/queue/workers/slotAllocator.worker.js");
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-07T04:30:00Z"));
  m.enabled.mockResolvedValue(true); m.posts.mockResolvedValue([]); m.used.mockResolvedValue([]);
  m.exists.mockResolvedValue(false); m.sources.mockResolvedValue(["devto"]);
  m.sample.mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ _id: `article${i}` })));
  m.create.mockImplementation(async post => ({ ...post, _id: "p" }));
});
afterEach(() => vi.useRealTimers());
it("allocates randomized weekdays only in the current week", async () => {
  await m.process({ data: { memberUrn: "A" } });
  expect(m.create).toHaveBeenCalledTimes(5);
  for (const [post] of m.create.mock.calls) {
    expect(post.publishAt >= new Date("2030-01-07T00:00Z")).toBe(true);
    expect(post.publishAt < new Date("2030-01-12T00:00Z")).toBe(true);
    expect(post.linkedinMemberUrn).toBe("A");
  }
});
it("preserves a manual post and respects its occupied day", async () => {
  m.posts.mockResolvedValue([{ publishAt: new Date("2030-01-08T06:00Z"), creationMode: "manual" }]);
  await m.process({ data: { memberUrn: "A" } });
  expect(m.create).toHaveBeenCalledTimes(4);
  for (const [post] of m.create.mock.calls) expect(post.publishAt.toISOString().slice(0,10)).not.toBe("2030-01-08");
});
it("disabling one account does not disable another", async () => {
  m.accounts.mockResolvedValue([{ memberUrn: "A" }, { memberUrn: "B" }]);
  m.enabled.mockImplementation(async owner => owner === "B");
  await m.process({ data: {} });
  expect(m.create).toHaveBeenCalledTimes(5);
  for (const [post] of m.create.mock.calls) expect(post.linkedinMemberUrn).toBe("B");
});
