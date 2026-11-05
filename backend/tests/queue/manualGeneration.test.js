import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  process: null,
  claim: vi.fn(),
  article: vi.fn(),
  generate: vi.fn(),
  image: vi.fn(),
  publish: vi.fn(),
  update: vi.fn(),
}));
vi.mock("bullmq", () => ({
  Worker: vi.fn().mockImplementation((name, fn) => {
    m.process = fn;
    return { on: vi.fn() };
  }),
}));
vi.mock("../../src/queue/connection.js", () => ({
  redisConnection: { connection: {} },
}));
vi.mock("../../src/models/generatedPost.model.js", () => ({
  default: { findOneAndUpdate: m.claim, updateOne: m.update },
}));
vi.mock("../../src/models/fetchedContent.model.js", () => ({
  default: { findOne: m.article },
}));
vi.mock("../../src/modules/ai/ai.service.js", () => ({
  default: { generateForContent: m.generate },
}));
vi.mock("../../src/services/imageGenerator.js", () => ({
  default: { generate: m.image },
}));
vi.mock("../../src/services/postScheduling.service.js", () => ({
  enqueueCurrentPost: m.publish,
}));
vi.mock("../../src/queue/ai.dlq.queue.js", () => ({ aiDLQ: { add: vi.fn() } }));
vi.mock("../../src/utils/logger.js", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
await import("../../src/queue/workers/ai.worker.js");
const job = {
  id: "ai-p",
  data: { postId: "p", linkedinMemberUrn: "A" },
  attemptsMade: 0,
  opts: { attempts: 3 },
};
const manual = {
  _id: "p",
  creationMode: "manual",
  topic: "Streams",
  customPrompt: "Be concise",
};
beforeEach(() => {
  vi.resetAllMocks();
  m.generate.mockResolvedValue({
    text: "A useful LinkedIn post",
    imagePrompt: "A professional illustration",
    promptType: "insight",
  });
  m.image.mockResolvedValue({ imagePath: "image.jpg" });
  m.update.mockResolvedValue({ matchedCount: 1 });
  m.claim.mockResolvedValue(manual);
});
it("generates a custom topic and prompt as a draft without publishing", async () => {
  await m.process(job);
  expect(m.generate).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Streams" }),
    "Be concise",
  );
  expect(m.update.mock.calls[1][1].$set.status).toBe("draft");
  expect(m.publish).not.toHaveBeenCalled();
});
it("generates only from an owner-filtered fetched article", async () => {
  m.claim.mockResolvedValue({ ...manual, articleId: "article" });
  m.article.mockResolvedValue({ title: "Node", url: "https://example.test" });
  await m.process(job);
  expect(m.article).toHaveBeenCalledWith({
    _id: "article",
    linkedinMemberUrn: "A",
  });
  expect(m.publish).not.toHaveBeenCalled();
});
it("keeps text when the image provider returns HTTP 402", async () => {
  m.image.mockRejectedValue(new Error("Image API responded with status: 402"));
  await m.process(job);
  expect(m.update.mock.calls[1][1].$set).toMatchObject({
    text: "A useful LinkedIn post",
    imageStatus: "failed",
    status: "draft",
  });
  expect(m.update.mock.calls[1][1].$push.activity.$each).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ eventType: "image_unavailable_text_fallback" }),
    ]),
  );
});
it("automatic generation never receives the stored manual prompt", async () => {
  const post = {
    ...manual,
    creationMode: "automatic",
    articleId: "article",
    publishAt: new Date(Date.now() + 60000),
    linkedinMemberUrn: "A",
  };
  m.claim.mockResolvedValue({ ...post, toObject: () => post });
  m.article.mockResolvedValue({ title: "Node" });
  await m.process(job);
  expect(m.generate).toHaveBeenCalledWith(expect.anything(), "");
  expect(m.publish).toHaveBeenCalledTimes(1);
});
it("records empty AI failures without provider payloads", async () => {
  m.generate.mockResolvedValue({ text: "" });
  await expect(m.process(job)).rejects.toThrow("AI_EMPTY_RESPONSE");
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({
      linkedinMemberUrn: "A",
      generationRunId: expect.any(String),
    }),
    expect.objectContaining({
      $set: expect.objectContaining({
        failedStage: "ai",
        errorCode: "AI_EMPTY_RESPONSE",
      }),
    }),
  );
});
it("rejects stale writes after another execution claims generation", async () => {
  m.update.mockResolvedValue({ matchedCount: 0 });
  await m.process(job);
  expect(m.image).not.toHaveBeenCalled();
  expect(m.publish).not.toHaveBeenCalled();
});
it("resumes a stalled job through an owner-scoped execution claim", async () => {
  m.claim.mockResolvedValue(null);
  await m.process(job);
  expect(m.claim.mock.calls[0][0].$or).toContainEqual({
    status: "generating",
    generationJobId: "ai-p",
  });
  expect(m.generate).not.toHaveBeenCalled();
});
it("does not mark another worker's post failed when the claim fails", async () => {
  m.claim.mockRejectedValue(new Error("database unavailable"));
  await expect(m.process(job)).rejects.toThrow("AI_GENERATION_FAILED");
  expect(m.update).not.toHaveBeenCalled();
});
