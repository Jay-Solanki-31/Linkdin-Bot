import { beforeEach, describe, expect, it, vi } from "vitest";

const { add, countDocuments, find } = vi.hoisted(() => ({
  add: vi.fn(),
  countDocuments: vi.fn(),
  find: vi.fn(),
}));

vi.mock("../../src/queue/fetcher.queue.js", () => ({ fetcherQueue: { add } }));
vi.mock("../../src/models/fetchedContent.model.js", () => ({ default: { countDocuments, find } }));
vi.mock("../../src/modules/fetchers/fetcher.service.js", () => ({
  default: { getAvailableSources: () => ["devto"] },
}));

const { startFetch, getFetchedData } = await import("../../src/controller/fetcher.controller.js");

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("fetcher account isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    add.mockResolvedValue({ id: "job-1" });
    countDocuments.mockResolvedValue(1);
    find.mockReturnValue({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: vi.fn().mockResolvedValue([]) }) }) }),
    });
  });

  it("stores the authenticated account in fetch jobs and never trusts a body owner", async () => {
    const res = response();
    await startFetch({
      params: { source: "devto" },
      body: { linkedinMemberUrn: "urn:li:person:attacker" },
      session: { linkedinMemberUrn: "urn:li:person:A" },
    }, res);

    expect(add).toHaveBeenCalledWith(
      "FETCH_CONTENT",
      { source: "devto", linkedinMemberUrn: "urn:li:person:A" },
      expect.any(Object),
    );
  });

  it("filters content queries by the authenticated account", async () => {
    const res = response();
    await getFetchedData({ query: {}, session: { linkedinMemberUrn: "urn:li:person:B" } }, res);

    expect(countDocuments).toHaveBeenCalledWith({ linkedinMemberUrn: "urn:li:person:B" });
    expect(find).toHaveBeenCalledWith({ linkedinMemberUrn: "urn:li:person:B" });
  });

  it("rejects unauthenticated fetches", async () => {
    const res = response();
    await startFetch({ params: { source: "devto" }, session: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(add).not.toHaveBeenCalled();
  });
});
