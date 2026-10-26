import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ process: null, claim: vi.fn(), article: vi.fn(), generate: vi.fn(), image: vi.fn(), publish: vi.fn(), save: vi.fn() }));
vi.mock("bullmq", () => ({ Worker: vi.fn().mockImplementation((name, fn) => { m.process = fn; return { on: vi.fn() }; }) }));
vi.mock("../../src/queue/connection.js", () => ({ redisConnection: { connection: {} } }));
vi.mock("../../src/models/generatedPost.model.js", () => ({ default: { findOneAndUpdate: m.claim, updateOne: vi.fn() } }));
vi.mock("../../src/models/fetchedContent.model.js", () => ({ default: { findOne: m.article } }));
vi.mock("../../src/modules/ai/ai.service.js", () => ({ default: { generateForContent: m.generate } }));
vi.mock("../../src/services/imageGenerator.js", () => ({ default: { generate: m.image } }));
vi.mock("../../src/queue/linkedin.queue.js", () => ({ linkedinQueue: { add: m.publish } }));
vi.mock("../../src/queue/ai.dlq.queue.js", () => ({ aiDLQ: { add: vi.fn() } }));
vi.mock("../../src/utils/logger.js", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
await import("../../src/queue/workers/ai.worker.js");
const job = { data: { postId: "p", linkedinMemberUrn: "A" }, attemptsMade: 0, opts: { attempts: 3 } };
beforeEach(() => {
  vi.clearAllMocks();
  m.generate.mockResolvedValue({ text: "A useful LinkedIn post", imagePrompt: "A professional illustration", promptType: "insight" });
  m.image.mockResolvedValue({ imagePath: "image.jpg" });
});
it("generates a custom topic and prompt as a draft without publishing", async () => {
  const post = { creationMode: "manual", topic: "Streams", customPrompt: "Be concise", save: m.save };
  m.claim.mockResolvedValue(post);
  await m.process(job);
  expect(m.generate).toHaveBeenCalledWith(expect.objectContaining({ title: "Streams" }), "Be concise");
  expect(post.status).toBe("draft"); expect(m.publish).not.toHaveBeenCalled();
});
it("generates only from an owner-filtered fetched article", async () => {
  const post = { creationMode: "manual", articleId: "article", save: m.save };
  m.claim.mockResolvedValue(post); m.article.mockResolvedValue({ title: "Node", url: "https://example.test" });
  await m.process(job);
  expect(m.article).toHaveBeenCalledWith({ _id: "article", linkedinMemberUrn: "A" });
  expect(post.status).toBe("draft"); expect(m.publish).not.toHaveBeenCalled();
});
it("keeps text when the image provider returns HTTP 402", async () => {
  const post = { creationMode: "manual", topic: "Streams", save: m.save };
  m.claim.mockResolvedValue(post); m.image.mockRejectedValue(new Error("Image API responded with status: 402"));
  await m.process(job);
  expect(post.text).toBe("A useful LinkedIn post"); expect(post.imageStatus).toBe("failed"); expect(post.status).toBe("draft");
});
it("automatic generation never receives the stored manual prompt", async () => {
  m.claim.mockResolvedValue({ creationMode: "automatic", articleId: "article", customPrompt: "Wrong instructions", publishAt: new Date(Date.now() + 60000), linkedinMemberUrn: "A", save: m.save });
  m.article.mockResolvedValue({ title: "Node" }); await m.process(job);
  expect(m.generate).toHaveBeenCalledWith(expect.anything(), ""); expect(m.publish).toHaveBeenCalledTimes(1);
});
